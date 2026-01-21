/**
 * Image manager - Coordinates image download, processing, and caching
 */
import type { Node } from "@figma/rest-api-spec";

import type { ProgressEmitter } from "@/streaming/progress-emitter";

import type { CropRegion } from "./crop-calculator";
import { calculateCropFromTransform } from "./crop-calculator";
import {
  type DownloadOptions,
  type DownloadResult,
  downloadImagesDeduplicated,
} from "./downloader";
import {
  type ProcessedImage,
  generateDimensionCSS,
  getImageMetadata,
  processImage,
} from "./processor";

/**
 * Image processing configuration
 */
export interface ImageProcessingConfig {
  /** Apply crop based on node transform */
  applyCrop?: boolean;
  /** Resize images */
  resize?: { width?: number; height?: number };
  /** Convert format */
  convertFormat?: "png" | "jpeg" | "webp";
  /** Quality for lossy formats */
  quality?: number;
  /** Generate CSS variables */
  generateCSS?: boolean;
  /** Output directory for CSS file */
  cssOutputPath?: string;
}

/**
 * Complete image download and processing result
 */
export interface ImageOperationResult {
  /** Download results */
  downloads: DownloadResult[];
  /** Processing results */
  processed: ProcessedImage[];
  /** Generated CSS if requested */
  css?: string;
  /** Summary statistics */
  stats: {
    total: number;
    downloaded: number;
    failed: number;
    processed: number;
    totalSize: number;
  };
}

/**
 * Manager for image operations
 */
export class ImageManager {
  /**
   * Download and process images from Figma
   *
   * @param items - Image URLs with node IDs
   * @param nodes - Corresponding Figma nodes for crop calculations
   * @param downloadOptions - Download options
   * @param processingConfig - Processing configuration
   * @returns Complete operation results
   */
  async downloadAndProcess(
    items: Array<{ id: string; url: string }>,
    nodes: Node[],
    downloadOptions: DownloadOptions,
    processingConfig: ImageProcessingConfig = {}
  ): Promise<ImageOperationResult> {
    // Create node map for easy lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Download images with deduplication
    const downloads = await downloadImagesDeduplicated(items, {
      ...downloadOptions,
      progress: downloadOptions.progress,
    });

    const processed: ProcessedImage[] = [];
    const cssLines: string[] = [];
    let totalSize = 0;

    // Process each downloaded image
    for (const download of downloads) {
      if (!download.success) {
        continue;
      }

      const node = nodeMap.get(download.id);
      const processResult = await this.processDownloadedImage(
        download,
        node,
        processingConfig
      );

      if (processResult) {
        processed.push(processResult);
        totalSize += processResult.size;

        // Generate CSS if requested
        if (processingConfig.generateCSS && download.width && download.height) {
          const css = generateDimensionCSS(
            download.id,
            download.width,
            download.height
          );
          cssLines.push(`/* ${download.id} */`);
          cssLines.push(css);
        }
      }
    }

    // Write CSS file if requested
    let css: string | undefined;
    if (
      processingConfig.generateCSS &&
      processingConfig.cssOutputPath &&
      cssLines.length > 0
    ) {
      const fs = await import("node:fs/promises");
      const cssContent = `:root {\n${cssLines.join("\n")}\n}\n`;
      await fs.writeFile(processingConfig.cssOutputPath, cssContent, "utf-8");
      css = cssContent;
    }

    // Calculate statistics
    const successful = downloads.filter((d) => d.success);
    const stats = {
      total: downloads.length,
      downloaded: successful.length,
      failed: downloads.length - successful.length,
      processed: processed.length,
      totalSize,
    };

    return {
      downloads,
      processed,
      css,
      stats,
    };
  }

  /**
   * Process a single downloaded image
   */
  private async processDownloadedImage(
    download: DownloadResult,
    node: Node | undefined,
    config: ImageProcessingConfig
  ): Promise<ProcessedImage | null> {
    try {
      let processOptions: {
        crop?: CropRegion;
        width?: number;
        height?: number;
        format?: "png" | "jpeg" | "webp";
        quality?: number;
      } = {};

      // Calculate crop if requested and node available
      if (config.applyCrop && node) {
        const crop = calculateCropFromTransform(node);
        if (crop) {
          processOptions.crop = crop;
        }
      }

      // Add resize options
      if (config.resize) {
        processOptions.width = config.resize.width;
        processOptions.height = config.resize.height;
      }

      // Add format conversion
      if (config.convertFormat) {
        processOptions.format = config.convertFormat;
        processOptions.quality = config.quality;
      }

      // Skip if no processing needed
      if (Object.keys(processOptions).length === 0) {
        const metadata = await getImageMetadata(download.path);
        return {
          path: download.path,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
        };
      }

      // Process image
      const outputPath = download.path.replace(/\.png$/, "_processed.png");
      return await processImage(download.path, outputPath, processOptions);
    } catch (error) {
      console.error(`Failed to process image ${download.id}:`, error);
      return null;
    }
  }

  /**
   * Batch process images with crop calculations
   *
   * @param downloads - Completed downloads
   * @param nodes - Figma nodes for transform data
   * @param config - Processing configuration
   * @returns Processing results
   */
  async batchProcess(
    downloads: DownloadResult[],
    nodes: Node[],
    config: ImageProcessingConfig = {}
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];

    for (const download of downloads) {
      if (!download.success) {
        continue;
      }

      const node = nodes.find((n) => n.id === download.id);
      const result = await this.processDownloadedImage(download, node, config);

      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}

/**
 * Download and process images (convenience function)
 *
 * @param items - Image URLs with node IDs
 * @param nodes - Figma nodes for transform data
 * @param outputDir - Output directory
 * @param config - Processing configuration
 * @param progress - Optional progress emitter
 * @returns Complete operation results
 */
export async function downloadAndProcessImages(
  items: Array<{ id: string; url: string }>,
  nodes: Node[],
  outputDir: string,
  config: ImageProcessingConfig = {},
  progress?: ProgressEmitter
): Promise<ImageOperationResult> {
  const manager = new ImageManager();

  return manager.downloadAndProcess(
    items,
    nodes,
    { outputDir, progress },
    config
  );
}
