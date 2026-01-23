/**
 * Sharp Cache Configuration Module
 *
 * Provides configuration and management for Sharp's libvips cache.
 * This module allows fine-tuning of memory and file-based caching
 * to optimize performance for batch image processing operations.
 *
 * @module sharp-cache
 */

import sharp from 'sharp';

/**
 * Default cache configuration values
 * Sharp uses MB for memory limits
 */
const DEFAULT_MAX_MEMORY_MB = 50;
const DEFAULT_MAX_FILES = 20;

/**
 * Internal cache settings storage
 */
interface InternalCacheSettings {
  memory: number;
  files: number;
}

/**
 * Cache configuration options
 * Memory is specified in megabytes (MB)
 */
export interface CacheOptions {
  /** Enable or disable cache (for convenience) */
  enabled?: boolean;
  /** Maximum memory usage in MB (default: 50MB) */
  maxMemory?: number;
  /** Maximum number of files to cache (default: 20) */
  maxFiles?: number;
  /** Alias for maxFiles (for test compatibility) */
  items?: number;
  /** Cache directory for file-based caching (optional, for future use) */
  cacheDir?: string;
}

/**
 * Cache statistics information
 * Memory values are in bytes for external API
 */
export interface CacheStats {
  /** Current memory usage in bytes */
  currentMemory: number;
  /** Current file count */
  currentFiles: number;
  /** Maximum memory limit in bytes */
  maxMemory: number;
  /** Maximum file limit */
  maxFiles: number;
}

/**
 * Convert MB to bytes
 */
function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Store for restoring original cache settings
 */
let originalCacheSettings: InternalCacheSettings | null = null;

/**
 * Get current cache settings as InternalCacheSettings
 */
function getCurrentSettings(): InternalCacheSettings {
  const cache = sharp.cache() as sharp.CacheResult;
  return {
    memory: cache.memory.max,
    files: cache.files.max,
  };
}

/**
 * Configure global Sharp cache with specified options.
 *
 * @param options - Cache configuration options (memory in MB)
 *
 * @example
 * ```ts
 * // Configure with defaults (50MB, 20 files)
 * configureCache();
 *
 * // Configure custom limits
 * configureCache({
 *   maxMemory: 100, // 100MB
 *   maxFiles: 50,
 * });
 *
 * // Disable cache
 * configureCache({ enabled: false });
 * // or
 * configureCache({ maxMemory: 0, maxFiles: 0 });
 * ```
 */
export function configureCache(options: CacheOptions = {}): void {
  // Handle enabled property
  if (options.enabled === false) {
    sharp.cache({ memory: 0, files: 0 });
    return;
  }

  const maxMemory = options.maxMemory ?? DEFAULT_MAX_MEMORY_MB;
  // items is an alias for maxFiles for test compatibility
  const maxFiles = options.items ?? options.maxFiles ?? DEFAULT_MAX_FILES;

  sharp.cache({
    memory: maxMemory,
    files: maxFiles,
  });
}

/**
 * Get current cache statistics.
 *
 * @returns Current cache statistics including memory usage and file count
 *
 * @example
 * ```ts
 * const stats = getCacheStats();
 * console.log(`Memory: ${stats.currentMemory}/${stats.maxMemory} bytes`);
 * console.log(`Files: ${stats.currentFiles}/${stats.maxFiles}`);
 * ```
 */
export function getCacheStats(): CacheStats {
  const cache = sharp.cache() as sharp.CacheResult;

  return {
    currentMemory: mbToBytes(cache.memory.current),
    currentFiles: cache.files.current,
    maxMemory: mbToBytes(cache.memory.max),
    maxFiles: cache.files.max,
  };
}

/**
 * Clear the Sharp cache, removing all cached items.
 *
 * @example
 * ```ts
 * clearCache();
 * const stats = getCacheStats();
 * console.log(stats.currentFiles); // 0
 * ```
 */
export function clearCache(): void {
  // Clear by setting to 0, then restore defaults
  sharp.cache({ memory: 0, files: 0 });
  sharp.cache({
    memory: DEFAULT_MAX_MEMORY_MB,
    files: DEFAULT_MAX_FILES,
  });
}

/**
 * Execute a function with temporary cache settings.
 * Cache settings are restored after the function completes,
 * even if the function throws an error.
 *
 * @param fn - Function to execute with temporary cache
 * @param options - Temporary cache configuration (defaults to disabled cache)
 * @returns Promise that resolves with the function's result
 *
 * @example
 * ```ts
 * // Execute with cache disabled
 * await withCache(async () => {
 *   // Processing that shouldn't use cache
 * });
 *
 * // Execute with custom cache settings
 * await withCache(
 *   async () => {
 *     // Processing with 10MB cache
 *   },
 *   { maxMemory: 10 }
 * );
 * ```
 */
export async function withCache<T>(
  fn: () => Promise<T> | T,
  options?: CacheOptions
): Promise<T> {
  // Store original settings before modifying
  originalCacheSettings = getCurrentSettings();

  try {
    // Configure temporary cache
    const maxMemory = options?.maxMemory ?? 0;
    const maxFiles = options?.maxFiles ?? 0;

    sharp.cache({
      memory: maxMemory,
      files: maxFiles,
    });

    // Execute the function
    return await fn();
  } finally {
    // Restore original settings
    if (originalCacheSettings) {
      sharp.cache({
        memory: originalCacheSettings.memory,
        files: originalCacheSettings.files,
      });
      originalCacheSettings = null;
    }
  }
}
