/**
 * Simple logger for figma-skill
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

let currentLevel = LogLevel.INFO;

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Debug level logging
 */
export function debug(...args: unknown[]): void {
  if (currentLevel <= LogLevel.DEBUG) {
    console.debug("[figma-skill:debug]", ...args);
  }
}

/**
 * Info level logging
 */
export function info(...args: unknown[]): void {
  if (currentLevel <= LogLevel.INFO) {
    console.info("[figma-skill:info]", ...args);
  }
}

/**
 * Warning level logging
 */
export function warn(...args: unknown[]): void {
  if (currentLevel <= LogLevel.WARN) {
    console.warn("[figma-skill:warn]", ...args);
  }
}

/**
 * Error level logging
 */
export function error(...args: unknown[]): void {
  if (currentLevel <= LogLevel.ERROR) {
    console.error("[figma-skill:error]", ...args);
  }
}
