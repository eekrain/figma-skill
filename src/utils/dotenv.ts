/* eslint-disable */
import { debug, error } from "./logger";

/**
 * dotenv-like utility for loading environment variables from .env files
 */

/**
 * Type declaration for Bun runtime (available in Bun environment)
 */
declare const Bun:
  | undefined
  | {
      file(path: string): {
        exists(): Promise<boolean>;
        text(): Promise<string>;
      };
      $: (
        command: TemplateStringsArray,
        ...args: string[]
      ) => {
        quiet(): { text(): Promise<string> };
        exists(): Promise<boolean>;
      };
      write(path: string, content: string): Promise<number>;
    };

/**
 * Type declaration for fetch (available in Node.js 18+, browsers, and Bun)
 */
declare const fetch:
  | undefined
  | ((input: string, init?: RequestInit) => Promise<Response>);

/**
 * Environment variables key-value pair record
 */
export type EnvVars = Record<string, string>;

/**
 * Error thrown when parsing .env file content fails
 */
export class EnvParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public lineContent?: string
  ) {
    super(message);
    this.name = "EnvParseError";
  }
}

/**
 * Error thrown when .env file is not found
 */
export class EnvFileNotFoundError extends Error {
  constructor(path: string) {
    super(`Environment file not found: ${path}`);
    this.name = "EnvFileNotFoundError";
  }
}

/**
 * Error thrown when reading .env file fails
 */
export class EnvReadError extends Error {
  constructor(
    path: string,
    public cause?: Error
  ) {
    super(`Failed to read environment file: ${path}`);
    this.name = "EnvReadError";
  }
}

/**
 * Regular expressions for parsing .env files
 */
const PATTERNS = {
  /** Comment lines: # comment */
  comment: /^\s*#.*$/,
  /** Empty lines */
  empty: /^\s*$/,
  /** Key=value with optional spaces around equals */
  keyValue: /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
  /** Export statement: export KEY=value or export KEY='value' */
  exportStatement: /^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
} as const;

/**
 * Remove quotes from a value if present
 * Handles both single and double quotes
 */
function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const firstChar = value[0];
  const lastChar = value[value.length - 1];

  if (
    (firstChar === '"' && lastChar === '"') ||
    (firstChar === "'" && lastChar === "'")
  ) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Parse a single line of .env file content
 */
function parseLine(line: string, lineNumber: number): [string, string] | null {
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (PATTERNS.comment.test(trimmed) || PATTERNS.empty.test(trimmed)) {
    return null;
  }

  // Try export statement pattern first
  const exportMatch = trimmed.match(PATTERNS.exportStatement);
  if (exportMatch) {
    const [, key, value] = exportMatch;
    return [key, unquote(value.trim())];
  }

  // Try standard KEY=VALUE pattern
  const kvMatch = trimmed.match(PATTERNS.keyValue);
  if (kvMatch) {
    const [, key, value] = kvMatch;
    return [key, unquote(value.trim())];
  }

  // Invalid line - could throw error or just skip
  // For robustness, we'll skip but log a debug message
  debug(`Skipping invalid line ${lineNumber}: ${trimmed}`);
  return null;
}

/**
 * Parse .env file content string into key-value pairs
 *
 * @param content - The raw content of a .env file
 * @returns Record of environment variable key-value pairs
 * @throws {EnvParseError} If a line cannot be parsed
 *
 * @example
 * ```ts
 * const content = "API_KEY=secret\nDEBUG=true";
 * const env = parseEnv(content);
 * console.log(env.API_KEY); // "secret"
 * ```
 */
export function parseEnv(content: string): EnvVars {
  const result: EnvVars = {};
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i], i + 1);

    if (parsed) {
      const [key, value] = parsed;
      result[key] = value;
    }
  }

  return result;
}

/**
 * Load environment variables from a .env file at the specified path
 *
 * @param path - Relative or absolute path to the .env file
 * @returns Promise resolving to a record of environment variables
 * @throws {EnvFileNotFoundError} If the file does not exist
 * @throws {EnvReadError} If reading the file fails
 * @throws {EnvParseError} If parsing the file content fails
 *
 * @example
 * ```ts
 * // Load from .claude/.env
 * const env = await loadEnv('.claude/.env');
 * console.log(env.FIGMA_TOKEN);
 *
 * // Load from project root
 * const rootEnv = await loadEnv('.env');
 * ```
 */
export async function loadEnv(path: string): Promise<EnvVars> {
  debug(`Loading environment variables from: ${path}`);

  try {
    // Use Bun's file API if available, otherwise fallback to fetch
    let content: string;

    if (typeof Bun !== "undefined" && Bun.file) {
      const file = Bun.file(path);
      const exists = await file.exists();

      if (!exists) {
        const err = new EnvFileNotFoundError(path);
        error(`Environment file not found: ${path}`);
        error(`Create a .env file at ${path} with your FIGMA_TOKEN:`);
        error(`  FIGMA_TOKEN=figd_YOUR_TOKEN_HERE`);
        error(`Get your token from: https://www.figma.com/settings`);
        throw err;
      }

      content = await file.text();
    } else if (typeof fetch !== "undefined") {
      // Fallback for environments without Bun runtime
      const response = await fetch(`file://${path}`);

      if (!response.ok) {
        const err = new EnvFileNotFoundError(path);
        error(`Environment file not found: ${path}`);
        error(`Create a .env file at ${path} with your FIGMA_TOKEN:`);
        error(`  FIGMA_TOKEN=figd_YOUR_TOKEN_HERE`);
        error(`Get your token from: https://www.figma.com/settings`);
        throw err;
      }

      content = await response.text();
    } else {
      // Neither Bun nor fetch is available
      throw new EnvReadError(
        path,
        new Error("Neither Bun runtime nor fetch API is available")
      );
    }

    return parseEnv(content);
  } catch (err) {
    // Log and re-throw our custom errors
    if (err instanceof EnvFileNotFoundError) {
      // Already logged above
      throw err;
    }

    if (err instanceof EnvParseError) {
      error(`Failed to parse environment file at ${path}: ${err.message}`);
      if (err.line !== undefined) {
        error(
          `  Error at line ${err.line}${err.lineContent ? `: ${err.lineContent}` : ""}`
        );
      }
      throw err;
    }

    // Wrap and log other errors
    const wrapped = new EnvReadError(path, err as Error);
    error(`Failed to read environment file: ${path}`);
    if (err instanceof Error) {
      error(`  Caused by: ${err.message}`);
    }
    throw wrapped;
  }
}

/**
 * Load environment variables and merge with process.env
 * This modifies the global process.env object.
 *
 * @param path - Path to the .env file
 * @returns Promise that resolves when loading is complete
 *
 * @example
 * ```ts
 * await loadEnvIntoProcess('.claude/.env');
 * console.log(process.env.FIGMA_TOKEN); // Now available
 * ```
 */
export async function loadEnvIntoProcess(path: string): Promise<void> {
  const env = await loadEnv(path);

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  debug(
    `Loaded ${Object.keys(env).length} environment variables into process.env`
  );
}

/**
 * Create a typed accessor for environment variables
 * Useful for type-safe environment variable access
 *
 * @param env - The environment variables record
 * @returns A proxy that provides type-safe access
 *
 * @example
 * ```ts
 * const env = await loadEnv('.claude/.env');
 * const typed = createTypedEnv<{
 *   FIGMA_TOKEN: string;
 *   DEBUG?: string;
 * }>(env);
 *
 * const token = typed.FIGMA_TOKEN; // string
 * const debug = typed.DEBUG; // string | undefined
 * ```
 */
export function createTypedEnv<T extends EnvVars>(env: EnvVars): T {
  return env as T;
}

/**
 * Get a required environment variable, throwing an error if not found.
 *
 * Two usage modes:
 * 1. `requireEnv(env, key)` - Get value from already-loaded env object
 * 2. `requireEnv(path, key)` - Load .env file and get value in one call
 *
 * @param envOrPath - Either the environment variables record or a .env file path
 * @param key - The environment variable key to look up
 * @returns The value of the environment variable
 * @throws {Error} If the key is not found or file is missing
 *
 * @example
 * ```ts
 * // Load and require in one call (recommended)
 * const token = await requireEnv('.claude/.env', 'FIGMA_TOKEN');
 *
 * // Or with pre-loaded env object
 * const env = { FIGMA_TOKEN: 'figd_...' };
 * const token = requireEnv(env, 'FIGMA_TOKEN');
 * ```
 */
export async function requireEnv(
  envOrPath: EnvVars | string,
  key: string
): Promise<string> {
  // If string, treat as file path and load it
  if (typeof envOrPath === "string") {
    const env = await loadEnv(envOrPath);
    const value = env[key];
    if (!value) {
      error(
        `Required environment variable "${key}" is not set in ${envOrPath}`
      );
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  // Env object passed directly
  const value = envOrPath[key];
  if (!value) {
    error(`Required environment variable "${key}" is not set`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
