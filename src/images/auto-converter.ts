/**
 * Auto converter - Automatic image conversion with intelligent format selection
 *
 * Provides automatic image conversion pipeline that:
 * - Analyzes image content
 * - Selects optimal format and encoder settings
 * - Converts images with proper quality/compression
 * - Reports conversion metrics
 *
 * Integrates content-analyzer and format-optimizer for smart conversion.
 */
import { mkdir } from "node:fs/promises";
import { basename, dirname, join, parse } from "node:path";
import sharp from "sharp";

import { analyzeContent, recommendFormat } from "./content-analyzer";
import type { ContentAnalysis, ImageFormat } from "./content-analyzer";
import { getOptimizedSettings } from "./format-optimizer";
import type {
  FormatSettings,
  JpegSettings,
  PngSettings,
  WebPSettings,
} from "./format-optimizer";
import { processBatch } from "./batch-processor";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Conversion options
 */
export interface ConversionOptions {
  /** Target format (auto-detect if omitted or "auto") */
  format?: ImageFormat | "auto";
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Preserve original format if no improvement */
  preserveIfNoBenefit?: boolean;
  /** Output directory (same as input if omitted) */
  outputDir?: string;
  /** Maximum concurrent conversions (default: unlimited for backward compat) */
  concurrency?: number;
}

/**
 * Conversion metrics result
 */
export interface ConversionMetrics {
  /** Input file path */
  inputPath: string;
  /** Output file path */
  outputPath: string;
  /** Original format */
  originalFormat: string;
  /** Final format */
  finalFormat: ImageFormat | "auto";
  /** Original file size in bytes */
  originalSize: number;
  /** Final file size in bytes */
  finalSize: number;
  /** Compression ratio (final/original) */
  compressionRatio: number;
  /** Content analysis result */
  contentAnalysis: ContentAnalysis;
  /** Settings used for conversion */
  settingsUsed: FormatSettings;
  /** Conversion time in milliseconds */
  conversionTime: number;
  /** Error if conversion failed */
  error?: Error;
}

// =====================================================
// Single Image Conversion
// =====================================================

/**
 * Convert an image to optimal format
 *
 * Automatically detects optimal format if not specified, applies
 * intelligent encoder settings, and returns detailed metrics.
 *
 * Overload: Accept object with inputPath and options
 */
export async function convertToOptimalFormat(
  params: { inputPath: string } & ConversionOptions
): Promise<ConversionMetrics>;

/**
 * Convert an image to optimal format
 *
 * Automatically detects optimal format if not specified, applies
 * intelligent encoder settings, and returns detailed metrics.
 *
 * Overload: Accept inputPath string and options object
 */
export async function convertToOptimalFormat(
  inputPath: string,
  options?: ConversionOptions
): Promise<ConversionMetrics>;

/**
 * Convert an image to optimal format
 *
 * Implementation - handles both APIs
 */
export async function convertToOptimalFormat(
  inputPathOrParams: string | ({ inputPath: string } & ConversionOptions),
  options: ConversionOptions = {}
): Promise<ConversionMetrics> {
  // Detect which API is being used
  const isObjectApi = typeof inputPathOrParams === "object" && inputPathOrParams !== null && "inputPath" in inputPathOrParams;

  let inputPath: string;
  if (isObjectApi) {
    const params = inputPathOrParams as { inputPath: string } & ConversionOptions;
    inputPath = params.inputPath;
    // Merge params with options (params takes precedence)
    options = { ...options, ...params };
    // Remove inputPath from options to avoid passing it down
    delete (options as any).inputPath;
  } else {
    inputPath = inputPathOrParams as string;
  }

  const startTime = Date.now();

  // Get original file size
  const fs = await import("node:fs/promises");
  const originalStat = await fs.stat(inputPath);
  const originalSize = originalStat.size;

  // Get original format
  const originalMetadata = await sharp(inputPath).metadata();
  const originalFormat = originalMetadata.format || "unknown";

  // Analyze content
  const contentAnalysis = await analyzeContent(inputPath);

  // Determine target format
  let targetFormat = options.format;
  if (!targetFormat) {
    targetFormat = recommendFormat(contentAnalysis);
  } else if (targetFormat === "auto") {
    targetFormat = recommendFormat(contentAnalysis);
  }

  // Get optimized settings (targetFormat is now always ImageFormat)
  const settingsUsed = getOptimizedSettings(targetFormat as ImageFormat, contentAnalysis);

  // Generate output path
  const outputDir = options.outputDir || dirname(inputPath);
  await mkdir(outputDir, { recursive: true });

  const parsedInput = parse(inputPath);
  const outputPath = join(
    outputDir,
    `${parsedInput.name}.${targetFormat === "jpeg" ? "jpg" : targetFormat}`
  );

  // Apply maxSize constraint if specified
  let finalSettings = settingsUsed;
  if (options.maxSize && options.maxSize > 0) {
    finalSettings = adjustSettingsForMaxSize(
      settingsUsed,
      contentAnalysis,
      options.maxSize,
      originalSize
    );
  }

  // Perform conversion
  await convertImage(inputPath, outputPath, finalSettings, contentAnalysis);

  // Get final file size
  const finalStat = await fs.stat(outputPath);
  const finalSize = finalStat.size;
  const compressionRatio = finalSize / originalSize;

  const conversionTime = Date.now() - startTime;

  // Check if we should preserve original (no improvement)
  if (
    options.preserveIfNoBenefit &&
    finalSize >= originalSize &&
    originalFormat === targetFormat
  ) {
    // Delete output and return original
    await fs.unlink(outputPath);
    return {
      inputPath,
      outputPath: inputPath,
      originalFormat,
      finalFormat: targetFormat,
      originalSize,
      finalSize: originalSize,
      compressionRatio: 1.0,
      contentAnalysis,
      settingsUsed,
      conversionTime,
    };
  }

  return {
    inputPath,
    outputPath,
    originalFormat,
    finalFormat: targetFormat,
    originalSize,
    finalSize,
    compressionRatio,
    contentAnalysis,
    settingsUsed: finalSettings,
    conversionTime,
  };
}

// =====================================================
// Batch Conversion
// =====================================================

/**
 * Convert multiple images in parallel with controlled concurrency.
 *
 * Uses batch processor for controlled concurrent operations.
 * Returns metrics for each conversion.
 *
 * @param inputPaths - Array of input image paths
 * @param options - Conversion options (applied to all)
 * @returns Array of conversion metrics
 */
export async function batchConvert(
  inputPaths: string[],
  options: ConversionOptions = {}
): Promise<ConversionMetrics[]> {
  // Default to unlimited concurrency for backward compatibility
  const concurrency = options.concurrency ?? 0; // 0 = unlimited

  if (concurrency === 0) {
    // Original behavior for backward compatibility - no concurrency limit
    const conversions = inputPaths.map((path) =>
      convertToOptimalFormat(path, options).catch((error) => {
        // Return error result instead of throwing
        return {
          inputPath: path,
          outputPath: "",
          originalFormat: "unknown",
          finalFormat: options.format || "png",
          originalSize: 0,
          finalSize: 0,
          compressionRatio: 0,
          contentAnalysis: {
            entropy: 0,
            hasTransparency: false,
            paletteSize: 0,
            width: 0,
            height: 0,
            contentType: "GRAPHIC",
          },
          settingsUsed: { format: options.format || "png" },
          conversionTime: 0,
          error: error as Error,
        } as ConversionMetrics;
      })
    );
    return Promise.all(conversions);
  }

  // Use batch processor with concurrency limit
  const result = await processBatch(
    inputPaths,
    (path) => convertToOptimalFormat(path, options),
    { concurrency, useCache: true }
  );

  // Combine successful and failed results, maintaining input order
  const results: ConversionMetrics[] = [];

  // Add successful results (already sorted by index)
  for (const successful of result.successful) {
    results.push(successful.result);
  }

  // Add failed results with error information
  for (const failed of result.failed) {
    const path = failed.input as string;
    results.push({
      inputPath: path,
      outputPath: "",
      originalFormat: "unknown",
      finalFormat: options.format || "png",
      originalSize: 0,
      finalSize: 0,
      compressionRatio: 0,
      contentAnalysis: {
        entropy: 0,
        hasTransparency: false,
        paletteSize: 0,
        width: 0,
        height: 0,
        contentType: "GRAPHIC",
      },
      settingsUsed: { format: options.format || "png" },
      conversionTime: 0,
      error: failed.error,
    } as ConversionMetrics);
  }

  // Sort results by input path to maintain order
  results.sort((a, b) => inputPaths.indexOf(a.inputPath) - inputPaths.indexOf(b.inputPath));

  return results;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Calculate percentage savings from conversion
 *
 * @param metrics - Conversion metrics
 * @returns Percentage savings (0-100)
 */
export function calculateSavings(metrics: ConversionMetrics): number {
  if (metrics.finalSize >= metrics.originalSize) {
    return 0;
  }
  return Math.floor(((metrics.originalSize - metrics.finalSize) / metrics.originalSize) * 100);
}

/**
 * Convert image using specified settings
 *
 * @param inputPath - Input image path
 * @param outputPath - Output image path
 * @param settings - Format-specific settings
 * @param analysis - Content analysis
 */
async function convertImage(
  inputPath: string,
  outputPath: string,
  settings: FormatSettings,
  analysis: ContentAnalysis
): Promise<void> {
  let pipeline = sharp(inputPath);

  switch (settings.format) {
    case "jpeg": {
      const jpegSettings = settings as JpegSettings;
      pipeline = pipeline.jpeg({
        quality: jpegSettings.quality,
        chromaSubsampling: jpegSettings.chromaSubsampling,
      });
      break;
    }
    case "png": {
      const pngSettings = settings as PngSettings;
      const pngOptions: sharp.PngOptions = {
        compressionLevel: pngSettings.compressionLevel,
        adaptiveFiltering: pngSettings.adaptiveFiltering,
      };
      if (pngSettings.palette && analysis.paletteSize < 256) {
        pngOptions.palette = true;
      }
      pipeline = pipeline.png(pngOptions);
      break;
    }
    case "webp": {
      const webpSettings = settings as WebPSettings;
      pipeline = pipeline.webp({
        quality: webpSettings.quality,
        lossless: webpSettings.lossless,
        nearLossless: webpSettings.nearLossless,
        smartSubsample: webpSettings.smartSubsample,
        effort: webpSettings.effort,
      });
      break;
    }
  }

  await pipeline.toFile(outputPath);
}

/**
 * Adjust settings to meet maximum file size constraint
 *
 * Reduces quality iteratively to meet the size target.
 *
 * @param settings - Base settings
 * @param analysis - Content analysis
 * @param maxSize - Maximum file size in bytes
 * @param originalSize - Original file size
 * @returns Adjusted settings
 */
function adjustSettingsForMaxSize(
  settings: FormatSettings,
  analysis: ContentAnalysis,
  maxSize: number,
  originalSize: number
): FormatSettings {
  // If original is already under limit, return as-is
  if (originalSize <= maxSize) {
    return settings;
  }

  // Calculate required compression ratio
  const requiredRatio = maxSize / originalSize;

  // Adjust quality based on format
  switch (settings.format) {
    case "jpeg": {
      const jpegSettings = settings as JpegSettings;
      // Reduce quality proportionally
      const adjustedQuality = Math.floor(jpegSettings.quality * requiredRatio);
      return {
        ...jpegSettings,
        quality: Math.max(50, adjustedQuality), // Minimum quality 50
      } as JpegSettings;
    }
    case "webp": {
      const webpSettings = settings as WebPSettings;
      if (webpSettings.lossless) {
        // Switch to lossy for size constraint
        return {
          ...webpSettings,
          lossless: false,
          nearLossless: true,
          quality: Math.floor(80 * requiredRatio),
        } as WebPSettings;
      } else {
        const adjustedQuality = Math.floor(webpSettings.quality * requiredRatio);
        return {
          ...webpSettings,
          quality: Math.max(50, adjustedQuality),
        } as WebPSettings;
      }
    }
    case "png": {
      const pngSettings = settings as PngSettings;
      // Increase compression for PNG
      const adjustedCompression = Math.min(9, pngSettings.compressionLevel + 2);
      return {
        ...pngSettings,
        compressionLevel: adjustedCompression,
      } as PngSettings;
    }
    default:
      return settings;
  }
}
