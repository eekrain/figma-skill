/**
 * Tailwind v3 Sync Implementation
 * Phase 3: Multi-Format Token Export - Tailwind Sync
 *
 * Maps Figma tokens to existing Tailwind v3 config using Bun.spawn()
 * for proper ES module resolution in user's project context.
 */
import fs from "node:fs";
import path from "node:path";

import type { DesignTokens } from "@/tokens/types";

import type {
  SyncStats,
  SyncToTailwindV3Options,
  TailwindConfig,
  TokenToClassMap,
} from "./sync-types";

// Bun global type is declared in dist/export/index.d.ts to avoid duplicate declaration
// When running in tests, we mock the Bun.spawn function
declare const Bun: {
  spawn: (opts: {
    cmd: string[];
    cwd: string;
    stdout: "pipe" | "inherit";
    stderr: "pipe" | "inherit";
  }) => {
    exited: Promise<number>;
    stdout: ReadableStream;
    stderr: ReadableStream;
  };
};

/**
 * Sync Figma tokens to existing Tailwind v3 config
 *
 * Handles:
 * - ES module imports via Bun.spawn() execution in project context
 * - Monorepo workspace resolution (npm/yarn/pnpm workspaces)
 * - Preset expansion (presets: [...] arrays)
 * - theme.extend nesting
 * - Plugin contributions (when run in project context)
 *
 * @param figmaTokens - Design tokens from Phase 1 extraction
 * @param options - Sync options
 * @returns Token-to-class map with statistics
 */
export async function syncToTailwindV3(
  figmaTokens: DesignTokens,
  options: SyncToTailwindV3Options
): Promise<TokenToClassMap & { stats: SyncStats }> {
  const {
    configPath,
    threshold = 0.9,
    fallback = "arbitrary",
    cwd = process.cwd(),
  } = options;

  // 1. Load and expand Tailwind v3 config with all presets
  const expandedConfig = await loadAndExpandTailwindConfig(configPath, cwd);

  // 2. Extract colors from already-flattened config and flatten nested objects
  const existingColors = flattenColors(
    expandedConfig.theme?.extend?.colors || {}
  );

  // 3. Build direct map
  const map: TokenToClassMap = {};
  let mappedToClasses = 0;
  let needsArbitrary = 0;

  for (const [name, token] of Object.entries(figmaTokens.colors.all)) {
    const match = findBestMatch(token.value, existingColors, threshold);

    if (match) {
      map[name] = match.className;
      mappedToClasses++;
    } else if (fallback === "closest" && existingColors[name]) {
      map[name] = name;
      mappedToClasses++;
    } else {
      map[name] = `[#${token.value.slice(1)}]`;
      needsArbitrary++;
    }
  }

  const totalTokens = Object.keys(figmaTokens.colors.all).length;

  // Return as TokenToClassMap with stats attached separately
  // We use type assertion to bypass the index signature limitation
  return {
    ...map,
    stats: {
      totalTokens,
      mappedToClasses,
      needsArbitrary,
      classCoverage:
        totalTokens > 0 ? (mappedToClasses / totalTokens) * 100 : 0,
    },
  } as TokenToClassMap & { stats: SyncStats };
}

/**
 * Flatten nested color objects to a single-level record
 */
function flattenColors(
  colors: Record<string, string | Record<string, string>>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (typeof value === "object" && value !== null) {
      // Recursively flatten nested objects
      const nested = flattenColors(value);
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        result[`${key}-${nestedKey}`] = nestedValue;
      }
    }
  }

  return result;
}

/**
 * Load and expand Tailwind v3 config using Bun.spawn()
 *
 * This approach:
 * 1. Creates a temporary extraction script in the user's project directory
 * 2. Runs the script with Bun using the user's project as cwd
 * 3. The script imports the config in the correct context (ES modules resolve, monorepo paths work)
 * 4. Extracts all colors from the expanded config and outputs JSON
 * 5. Library parses JSON and creates token map
 */
async function loadAndExpandTailwindConfig(
  configPath: string,
  projectDir: string = process.cwd()
): Promise<TailwindConfig> {
  // Create temporary extraction script
  const scriptContent = `
import path from 'node:path';
import ${""}url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the config from user's project (imports resolve correctly here)
const configModule = await import('./${configPath}');
const config = configModule.default || configModule;

// Expand presets
let finalConfig = config;

if (config.presets && Array.isArray(config.presets)) {
  finalConfig = await expandPresets(config);
}

// Extract all colors from expanded config
const colors = extractAllColors(finalConfig);

// Output JSON for the library to parse
console.log(JSON.stringify(colors));

// Helper functions (inline in script to work in user's project context)
async function expandPresets(cfg) {
  const merged = {};

  for (const preset of cfg.presets) {
    let presetConfig = typeof preset === 'function' ? await preset() : preset;

    if (presetConfig?.theme) {
      const themeSrc = presetConfig.theme.extend || presetConfig.theme;
      Object.assign(merged, themeSrc.colors || {});
    }
  }

  // Merge expanded presets into base config
  const result = { ...cfg };
  if (!result.theme) result.theme = {};
  if (!result.theme.extend) result.theme.extend = {};
  result.theme.extend.colors = { ...merged, ...result.theme.extend.colors };

  return result;
}

function extractAllColors(cfg) {
  const theme = cfg?.theme || {};
  const extend = theme.extend || {};
  const allColors = {};

  // Root level colors
  if (theme.colors) Object.assign(allColors, theme.colors);

  // theme.extend colors (where v3 presets usually put them)
  if (extend.colors) Object.assign(allColors, extend.colors);

  // Flatten nested structures
  return flattenColors(allColors);
}

function flattenColors(colors, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(colors)) {
    const fullName = prefix ? \`\${prefix}-\${key}\` : key;

    if (typeof value === 'string') {
      result[fullName] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenColors(value, fullName));
    }
  }

  return result;
}
`;

  // Write temporary script to user's project
  const scriptPath = path.join(projectDir, ".figma-skill-tailwind-extract.mjs");
  await fs.promises.writeFile(scriptPath, scriptContent, "utf-8");

  try {
    // Run script in user's project directory (this is the key!)
    const proc = Bun.spawn({
      cmd: ["bun", scriptPath],
      cwd: projectDir, // <--- CRITICAL: Run in user's project context
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for completion and capture output
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      throw new Error(`Failed to extract Tailwind config: ${stderr}`);
    }

    const stdout = await new Response(proc.stdout).text();
    const colors = JSON.parse(stdout);

    // Return minimal config structure with extracted colors
    return {
      theme: {
        extend: {
          colors,
        },
      },
    };
  } finally {
    // Clean up temporary script
    await fs.promises.unlink(scriptPath).catch(() => {});
  }
}

/**
 * Find best matching color in Tailwind config
 */
function findBestMatch(
  figmaColor: string,
  existingColors: Record<string, string>,
  threshold: number
): { className: string; similarity: number } | null {
  let bestMatch: { className: string; similarity: number } | null = null;

  for (const [className, color] of Object.entries(existingColors)) {
    const similarity = calculateColorSimilarity(figmaColor, color);

    if (
      similarity >= threshold &&
      (!bestMatch || similarity > bestMatch.similarity)
    ) {
      bestMatch = { className, similarity };
    }
  }

  return bestMatch;
}

/**
 * Calculate color similarity (0-1, where 1 = identical)
 * Uses Euclidean distance in RGB space
 */
function calculateColorSimilarity(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  // Euclidean distance in RGB space
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );

  // Convert to similarity (0-1)
  const maxDistance = Math.sqrt(255 * 255 * 3);
  return 1 - distance / maxDistance;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const hexValue = hex.replace("#", "");
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexValue);

  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
