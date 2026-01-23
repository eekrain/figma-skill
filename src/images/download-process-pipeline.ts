/**
 * Download-Process Pipeline Module
 *
 * Integrated download and conversion pipeline for batch image processing.
 * Combines downloading, format conversion, and cleanup in a single operation.
 *
 * @module download-process-pipeline
 */

import { mkdir, unlink, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { processBatch } from './batch-processor';
import type { ConversionOptions, ConversionMetrics } from './auto-converter';
import { convertToOptimalFormat } from './auto-converter';

/**
 * Download-process item definition
 */
export interface DownloadProcessItem {
  /** Unique identifier */
  id: string;
  /** Download URL */
  url: string;
  /** Output path for converted image */
  outputPath: string;
  /** Conversion options (optional, auto-detect if omitted) */
  conversionOptions?: ConversionOptions;
}

/**
 * Download-process options
 */
export interface DownloadProcessOptions {
  /** Array of URLs to download (alternative to items) */
  urls?: string[];
  /** Output directory for processed images */
  outputDir?: string;
  /** Concurrency limit (default: 4) */
  concurrency?: number;
  /** Download timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Progress callback (supports both signatures) */
  onProgress?: ((progress: { completed: number; total: number; percent: number }) => void) |
               ((completed: number, total: number, item?: DownloadProcessItem) => void);
  /** Continue on error (default: false) */
  continueOnError?: boolean;
  /** Memory limit in MB for batch processing */
  maxMemoryMB?: number;
  /** Temporary directory for downloads (default: system temp) */
  tempDir?: string;
  /** Whether to delete temporary files (default: true) */
  cleanupTemp?: boolean;
  /** Enable Sharp cache (default: true) */
  useCache?: boolean;
  /** Target format for conversion */
  format?: "png" | "jpeg" | "webp" | "auto";
  /** Quality for lossy formats (1-100) */
  quality?: number;
}

/**
 * Standard download-process result (always has success, completed, failed)
 * This is the unified return type for both APIs
 */
export interface StandardDownloadProcessResult {
  success: boolean;
  completed: number;
  failed: number;
  results: DownloadProcessResult[];
  stats: PipelineStats;
  errors: Array<{ url: string; error: Error }>;
}

/**
 * Alias for backward compatibility
 */
export type DownloadAndProcessResult = StandardDownloadProcessResult;

/**
 * Result of a download-process operation
 */
export interface DownloadProcessResult {
  /** Item identifier */
  id: string;
  /** Download URL */
  url: string;
  /** Final output path */
  outputPath: string;
  /** Conversion metrics */
  metrics?: ConversionMetrics;
  /** Error if failed */
  error?: Error;
}

/**
 * Pipeline statistics
 */
export interface PipelineStats {
  total: number;
  completed: number;
  failed: number;
  duration: number;
  totalDuration?: number;
  averageTime?: number;
  totalDownloadedBytes: number;
  totalOutputBytes: number;
  totalBytes?: number;
  averageSpeed?: number;
}

/**
 * Extended result with success flag and errors
 * Note: This is now aliased to StandardDownloadProcessResult for consistency
 */
// DownloadAndProcessResult is an alias to StandardDownloadProcessResult (line 79)

/**
 * Internal result with metadata
 */
interface InternalDownloadResult {
  id: string;
  url: string;
  outputPath: string;
  tempPath?: string;
  metrics?: ConversionMetrics;
  error?: Error;
  downloadedBytes?: number;
  outputBytes?: number;
}

/**
 * Create a temporary file path for an item.
 *
 * @param id - Item identifier
 * @param tempDir - Custom temp directory (optional)
 * @returns Temporary file path
 *
 * @example
 * ```ts
 * const tempPath = createTempFilePath('image-123');
 * // Returns: /tmp/figma-skill-image-123-abc123.tmp
 * ```
 */
export function createTempFilePath(id: string, tempDir?: string): string {
  const dir = tempDir ?? tmpdir();
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return join(dir, `figma-skill-${id}-${uniqueSuffix}.tmp`);
}

/**
 * Download a file from URL with timeout.
 *
 * @param url - URL to download from
 * @param timeout - Timeout in milliseconds
 * @returns Promise resolving to Buffer
 */
async function downloadFile(url: string, timeout: number = 30000): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Process a single download-process item.
 *
 * @param item - Item to process
 * @param tempDir - Temporary directory
 * @param timeout - Download timeout
 * @returns Promise resolving to internal result
 */
async function processDownloadItem(
  item: DownloadProcessItem,
  tempDir: string,
  timeout: number
): Promise<InternalDownloadResult> {
  let tempPath: string | undefined;
  let downloadedBytes = 0;
  let outputBytes = 0;
  let metrics: ConversionMetrics | undefined;

  try {
    // Download file
    const data = await downloadFile(item.url, timeout);
    downloadedBytes = data.length;

    // Create temp file
    tempPath = createTempFilePath(item.id, tempDir);
    await mkdir(tempDir, { recursive: true });

    // Write to temp file
    const { writeFile, rename, mkdir: mkdir2 } = await import('fs/promises');
    await writeFile(tempPath, data);

    // Extract output directory from desired outputPath
    const { dirname } = await import('path');
    const outputDir = dirname(item.outputPath);
    await mkdir2(outputDir, { recursive: true });

    // Convert to optimal format with output directory
    metrics = await convertToOptimalFormat(tempPath, {
      ...item.conversionOptions,
      outputDir,
    });

    // Move/rename the output to the desired path if different
    if (metrics.outputPath !== item.outputPath) {
      await rename(metrics.outputPath, item.outputPath);
      metrics.outputPath = item.outputPath;
    }

    // Get output file size
    if (existsSync(item.outputPath)) {
      const { stat } = await import('fs/promises');
      const stats = await stat(item.outputPath);
      outputBytes = stats.size;
    }

    return {
      id: item.id,
      url: item.url,
      outputPath: item.outputPath,
      tempPath,
      metrics,
      downloadedBytes,
      outputBytes,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Clean up temp file on error
    if (tempPath && existsSync(tempPath)) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Re-throw so processBatch can catch it as a failure
    throw err;
  }
}

/**
 * Download and process multiple items with controlled concurrency.
 *
 * Supports two API patterns:
 * 1. Items API: downloadAndProcess(items, options)
 * 2. Options API: downloadAndProcess({ urls: [...], outputDir: '...', ...options })
 *
 * @param itemsOrOptions - Items array OR options object with urls and outputDir
 * @param passedOptions - Optional processing options (used with items API)
 * @returns Promise resolving to results and statistics
 *
 * @example Items API:
 * ```ts
 * const results = await downloadAndProcess(
 *   [
 *     { id: 'img1', url: 'https://example.com/image.png', outputPath: './output/img1.jpg' },
 *     { id: 'img2', url: 'https://example.com/photo.png', outputPath: './output/img2.jpg' },
 *   ],
 *   { concurrency: 4, timeout: 30000 }
 * );
 * ```
 *
 * @example Options API:
 * ```ts
 * const results = await downloadAndProcess({
 *   urls: ['https://example.com/image1.png', 'https://example.com/image2.png'],
 *   outputDir: './output',
 *   concurrency: 4
 * });
 * ```
 */
export async function downloadAndProcess(
  itemsOrOptions: DownloadProcessItem[] | (DownloadProcessOptions & { urls?: string[]; outputDir?: string }),
  passedOptions?: DownloadProcessOptions
): Promise<StandardDownloadProcessResult> {
  const startTime = performance.now();

  // Detect which API is being used
  const isOptionsOnly = (
    typeof itemsOrOptions === 'object' &&
    !Array.isArray(itemsOrOptions) &&
    'urls' in itemsOrOptions &&
    Array.isArray((itemsOrOptions as DownloadProcessOptions).urls) &&
    'outputDir' in itemsOrOptions
  );

  let items: DownloadProcessItem[];
  let options: DownloadProcessOptions;
  let outputDir: string;

  if (isOptionsOnly) {
    // Options-only API: downloadAndProcess({ urls: [...], outputDir: ... })
    const opts = itemsOrOptions as DownloadProcessOptions & { urls: string[]; outputDir: string };
    outputDir = opts.outputDir;
    items = opts.urls.map((url, index) => ({
      id: `item-${index}`,
      url,
      outputPath: join(outputDir, `image-${index}.${opts.format === 'jpeg' ? 'jpg' : opts.format || 'png'}`),
      conversionOptions: opts.format ? {
        format: opts.format,
        quality: opts.quality,
      } : undefined,
    }));
    options = { ...opts };
  } else {
    // Items API: downloadAndProcess(items, options)
    items = itemsOrOptions as DownloadProcessItem[];
    options = passedOptions || {};
    outputDir = options.outputDir || tmpdir();
  }

  const {
    concurrency = 4,
    timeout = 30000,
    onProgress,
    tempDir = tmpdir(),
    cleanupTemp = true,
    useCache = true,
  } = options;

  // Track temp files for cleanup
  const tempFiles: string[] = [];

  // Process items with batch processor
  const batchResult = await processBatch(
    items,
    async (item) => {
      const result = await processDownloadItem(item, tempDir, timeout);
      if (result.tempPath) {
        tempFiles.push(result.tempPath);
      }
      return result;
    },
    {
      concurrency,
      onProgress: (completed, total) => {
        if (onProgress) {
          // Detect callback signature by checking number of parameters
          const percent = Math.round((completed / total) * 100);
          const callbackLength = onProgress.length;

          if (callbackLength === 1) {
            // Object format: { completed, total, percent }
            (onProgress as (progress: { completed: number; total: number; percent: number }) => void)({
              completed,
              total,
              percent,
            });
          } else {
            // Args format: completed, total, item?
            const item = items[completed - 1];
            if (callbackLength >= 3) {
              (onProgress as (completed: number, total: number, item: DownloadProcessItem) => void)(
                completed,
                total,
                item
              );
            } else {
              (onProgress as (completed: number, total: number) => void)(
                completed,
                total
              );
            }
          }
        }
      },
      useCache,
    }
  );

  // Convert batch results to download-process results
  const results: DownloadProcessResult[] = [];

  for (const successful of batchResult.successful) {
    const internalResult = successful.result as InternalDownloadResult;
    results.push({
      id: internalResult.id,
      url: internalResult.url,
      outputPath: internalResult.outputPath,
      metrics: internalResult.metrics,
    });
  }

  for (const failed of batchResult.failed) {
    // failed.input is now the DownloadProcessItem, not InternalDownloadResult
    const item = failed.input as DownloadProcessItem;
    results.push({
      id: item.id,
      url: item.url,
      outputPath: item.outputPath,
      error: failed.error,
    });
  }

  // Clean up temp files if requested
  if (cleanupTemp) {
    await Promise.allSettled(
      tempFiles.map(async (tempPath) => {
        try {
          if (existsSync(tempPath)) {
            await unlink(tempPath);
          }
        } catch {
          // Ignore cleanup errors
        }
      })
    );
  }

  // Calculate statistics
  let totalDownloadedBytes = 0;
  let totalOutputBytes = 0;

  for (const successful of batchResult.successful) {
    const internalResult = successful.result as InternalDownloadResult;
    totalDownloadedBytes += internalResult.downloadedBytes ?? 0;
    totalOutputBytes += internalResult.outputBytes ?? 0;
  }

  const duration = performance.now() - startTime;

  const stats: PipelineStats = {
    total: items.length,
    completed: batchResult.stats.completed,
    failed: batchResult.stats.failed,
    duration,
    totalDuration: duration,
    averageTime: duration / items.length,
    totalDownloadedBytes,
    totalOutputBytes,
    totalBytes: totalOutputBytes,
    averageSpeed: duration > 0 ? (totalOutputBytes / duration) * 1000 : 0,
  };

  // Return appropriate type based on API used
  if (isOptionsOnly) {
    // Build errors array for failed items
    const errors: Array<{ url: string; error: Error }> = [];
    for (const failed of batchResult.failed) {
      const item = failed.input as DownloadProcessItem;
      errors.push({ url: item.url, error: failed.error });
    }

    return {
      success: batchResult.stats.failed === 0,
      completed: batchResult.stats.completed,
      failed: batchResult.stats.failed,
      results,
      stats,
      errors,
    } as DownloadAndProcessResult;
  }

  return {
    success: batchResult.stats.failed === 0,
    completed: batchResult.stats.completed,
    failed: batchResult.stats.failed,
    results,
    stats,
    errors: [], // Empty array when no errors
  };
}

/**
 * Clean up all temporary files in a directory.
 *
 * @param tempDir - Temporary directory to clean
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    if (!existsSync(tempDir)) {
      return;
    }

    const files = await readdir(tempDir);
    const tmpFiles = files.filter((f) => f.endsWith('.tmp'));

    await Promise.allSettled(
      tmpFiles.map((file) => unlink(join(tempDir, file)))
    );
  } catch {
    // Ignore cleanup errors
  }
}
