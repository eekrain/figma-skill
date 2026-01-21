/**
 * Image processor - Sharp-based image processing for crop, resize, format conversion
 */
import sharp from "sharp";

import type { CropRegion } from "./crop-calculator";

/**
 * Processing options for images
 */
export interface ProcessOptions {
  /** Crop region to apply */
  crop?: CropRegion;
  /** Target width (resize) */
  width?: number;
  /** Target height (resize) */
  height?: number;
  /** Output format */
  format?: "png" | "jpeg" | "webp";
  /** Quality for lossy formats (1-100) */
  quality?: number;
}

/**
 * Processed image result
 */
export interface ProcessedImage {
  /** Output file path */
  path: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Image format */
  format: string;
  /** File size in bytes */
  size: number;
}

/**
 * Process an image with Sharp
 *
 * @param inputPath - Input image path
 * @param outputPath - Output image path
 * @param options - Processing options
 * @returns Processed image metadata
 */
export async function processImage(
  inputPath: string,
  outputPath: string,
  options: ProcessOptions = {}
): Promise<ProcessedImage> {
  let pipeline = sharp(inputPath);

  // Validate resize dimensions
  if (options.width !== undefined && options.width <= 0) {
    throw new Error("Width must be greater than 0");
  }
  if (options.height !== undefined && options.height <= 0) {
    throw new Error("Height must be greater than 0");
  }

  // Apply crop if specified
  if (options.crop) {
    const { left, top, width, height } = options.crop;
    pipeline = pipeline.extract({ left, top, width, height });
  }

  // Apply resize if specified
  if (options.width && options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: "cover",
      position: "center",
    });
  } else if (options.width) {
    pipeline = pipeline.resize(options.width, null);
  } else if (options.height) {
    pipeline = pipeline.resize(null, options.height);
  }

  // Apply format if specified
  if (options.format === "png") {
    pipeline = pipeline.png();
  } else if (options.format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: options.quality || 80 });
  } else if (options.format === "webp") {
    pipeline = pipeline.webp({ quality: options.quality || 80 });
  }

  // Process and save
  await pipeline.toFile(outputPath);

  // Get metadata of processed image
  const metadata = await sharp(outputPath).metadata();

  // Get actual file size from filesystem
  const fs = await import("node:fs/promises");
  const stat = await fs.stat(outputPath);

  return {
    path: outputPath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: stat.size,
  };
}

/**
 * Get image metadata without processing
 *
 * @param imagePath - Path to image file
 * @returns Image metadata
 */
export async function getImageMetadata(imagePath: string): Promise<{
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(imagePath).metadata();

  // Get actual file size from filesystem
  const fs = await import("node:fs/promises");
  const stat = await fs.stat(imagePath);

  return {
    path: imagePath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: stat.size,
  };
}

/**
 * Crop an image in-place
 *
 * @param imagePath - Path to image file (will be overwritten)
 * @param crop - Crop region to apply
 * @returns New image metadata
 */
export async function cropImage(
  imagePath: string,
  crop: CropRegion
): Promise<{ width: number; height: number }> {
  const { left, top, width, height } = crop;

  // Process to temp file first
  const tempPath = `${imagePath}.tmp`;
  await sharp(imagePath).extract({ left, top, width, height }).toFile(tempPath);

  // Replace original
  const fs = await import("node:fs/promises");
  await fs.rename(tempPath, imagePath);

  // Get new metadata
  const metadata = await sharp(imagePath).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Convert image to different format
 *
 * @param inputPath - Input image path
 * @param outputPath - Output image path
 * @param format - Target format
 * @param quality - Quality for lossy formats (default: 80)
 * @returns Processed image metadata
 */
export async function convertFormat(
  inputPath: string,
  outputPath: string,
  format: "png" | "jpeg" | "webp",
  quality: number = 80
): Promise<ProcessedImage> {
  return processImage(inputPath, outputPath, { format, quality });
}

/**
 * Generate CSS variables for image dimensions
 *
 * @param nodeId - Node ID for CSS variable name
 * @param width - Image width
 * @param height - Image height
 * @returns CSS variable declarations
 */
export function generateDimensionCSS(
  nodeId: string,
  width: number,
  height: number
): string {
  const varName = `--image-${nodeId}`;
  return `  ${varName}-width: ${width}px;\n  ${varName}-height: ${height}px;`;
}
