/**
 * Image downloader - Parallel image download with progress tracking
 */
/* eslint-disable no-undef */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

import type { ProgressEmitter } from "@/streaming/progress-emitter";

/**
 * Download result for a single image
 */
export interface DownloadResult {
  /** Node ID */
  id: string;
  /** Image URL */
  url: string;
  /** Local file path */
  path: string;
  /** Download success */
  success: boolean;
  /** Error if failed */
  error?: Error;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
}

/**
 * Options for image downloads
 */
export interface DownloadOptions {
  /** Output directory for downloaded images */
  outputDir: string;
  /** Number of parallel downloads (default: 5, max: 10) */
  parallel?: number;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Progress emitter for updates */
  progress?: ProgressEmitter;
}

/**
 * Download queue item
 */
interface QueueItem {
  id: string;
  url: string;
  path: string;
}

/**
 * Download images in parallel with controlled concurrency
 *
 * @param items - Items to download (id and url)
 * @param options - Download options
 * @returns Download results
 */
export async function downloadImages(
  items: Array<{ id: string; url: string }>,
  options: DownloadOptions
): Promise<DownloadResult[]> {
  const { outputDir, parallel = 5, timeout = 5000, progress } = options;

  // Limit parallel downloads
  const maxParallel = Math.min(Math.max(parallel, 1), 10);

  // Create output directory if needed
  await mkdir(outputDir, { recursive: true });

  // Start progress tracking
  if (progress) {
    progress.start(items.length, "downloading");
  }

  // Create download queue
  const queue: QueueItem[] = items.map((item) => ({
    id: item.id,
    url: item.url,
    path: join(outputDir, `${item.id}.png`),
  }));

  const results: DownloadResult[] = [];
  const executing: Promise<void>[] = [];

  // Process queue with controlled parallelism
  for (const item of queue) {
    // Create download promise
    const promise = downloadSingle(item, timeout)
      .then((result) => {
        results.push(result);
        if (progress) {
          progress.increment();
        }
      })
      .catch((error) => {
        results.push({
          id: item.id,
          url: item.url,
          path: item.path,
          success: false,
          error,
        });
        if (progress) {
          progress.increment();
        }
      });

    executing.push(promise);

    // Wait if we've reached max parallel
    if (executing.length >= maxParallel) {
      await Promise.race(executing);
      // Remove one completed promise (we don't know which one completed,
      // so we just keep the array at max size by removing one)
      executing.shift();
    }
  }

  // Wait for remaining downloads
  await Promise.all(executing);

  // Mark progress complete
  if (progress) {
    progress.complete();
  }

  return results;
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return ".png";

  const type = contentType.toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("gif")) return ".gif";
  if (type.includes("svg")) return ".svg";
  return ".png"; // default
}

/**
 * Download a single image
 * @internal Exported for testing purposes
 */
export async function downloadSingle(
  item: QueueItem,
  timeout: number
): Promise<DownloadResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(item.url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Determine file extension from content-type
    const contentType = response.headers.get("content-type");
    const extension = getExtensionFromContentType(contentType);
    const finalPath = item.path.replace(/\.\w+$/, extension);

    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Write to file
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, uint8Array);

    // Get image dimensions
    const metadata = await sharp(finalPath).metadata();

    return {
      id: item.id,
      url: item.url,
      path: finalPath,
      success: true,
      width: metadata.width || undefined,
      height: metadata.height || undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Deduplicate image downloads by URL
 * Returns unique items to download
 *
 * @param items - Items to deduplicate
 * @returns Unique items
 */
export function deduplicateDownloads(
  items: Array<{ id: string; url: string }>
): Array<{ id: string; url: string; ids: string[] }> {
  const urlMap = new Map<string, string[]>();

  for (const item of items) {
    const existing = urlMap.get(item.url);
    if (existing) {
      existing.push(item.id);
    } else {
      urlMap.set(item.url, [item.id]);
    }
  }

  return Array.from(urlMap.entries()).map(([url, ids]) => ({
    id: ids[0], // Use first ID as primary
    url,
    ids,
  }));
}

/**
 * Download images with deduplication
 * Images with identical URLs are only downloaded once
 *
 * @param items - Items to download
 * @param options - Download options
 * @returns Download results for all IDs (including duplicates)
 */
export async function downloadImagesDeduplicated(
  items: Array<{ id: string; url: string }>,
  options: DownloadOptions
): Promise<DownloadResult[]> {
  // Deduplicate by URL
  const unique = deduplicateDownloads(items);

  // Download unique images
  const uniqueResults = await downloadImages(
    unique.map(({ id, url }) => ({ id, url })),
    options
  );

  // Map results back to all IDs
  const results: DownloadResult[] = [];
  for (const { ids, ...item } of unique) {
    const result = uniqueResults.find((r) => r.id === item.id);
    if (result) {
      // Create result for each ID that shares this URL
      for (const id of ids) {
        results.push({
          ...result,
          id,
          // Copy file but with unique name for each ID
          path: result.path.replace(item.id, id),
        });
      }
    }
  }

  return results;
}
