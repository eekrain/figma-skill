/**
 * Mask compositor - Apply vector masks using Sharp composite operations
 *
 * Handles SVG matte compositing with dest-in blend mode for vector masks
 * and grayscale conversion for luminance masks.
 */
import sharp from "sharp";

import type { AlignedAssets } from "./coordinate-aligner";

// =====================================================
// Type Definitions
// =====================================================

// Re-export AlignedAssets for convenience
export type { AlignedAssets };

/**
 * Options for mask compositing
 */
export interface CompositeOptions {
  /** Input target image path */
  targetImagePath: string;
  /** Mask SVG content or path */
  maskInput: string | Buffer;
  /** Output path */
  outputPath: string;
  /** Alignment from coordinate-aligner */
  alignment: AlignedAssets;
  /** Mask type */
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
  /** Background color for transparency (default: transparent) */
  backgroundColor?: string;
}

/**
 * Result of mask compositing operation
 */
export interface CompositeResult {
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

// =====================================================
// Vector Mask Compositing
// =====================================================

/**
 * Apply a vector mask to a target image using Sharp composite
 *
 * Uses dest-in blend mode to apply the mask as a matte:
 * - Keeps pixels where the mask is opaque
 * - Makes transparent where the mask is transparent
 *
 * @param options - Composite options
 * @returns Composite result with metadata
 */
export async function applyVectorMask(
  options: CompositeOptions
): Promise<CompositeResult> {
  const {
    targetImagePath,
    maskInput,
    outputPath,
    alignment,
    maskType,
    backgroundColor,
  } = options;

  // Load the target image
  const targetImage = sharp(targetImagePath);
  const targetMetadata = await targetImage.metadata();

  // Prepare mask from SVG or raster input
  const maskBuffer = await prepareMaskInput(maskInput, alignment);

  // Create a canvas with composite dimensions
  const canvasWidth = alignment.compositeDimensions.width;
  const canvasHeight = alignment.compositeDimensions.height;

  // Resize target to fit if needed
  let processedTarget = targetImage;
  if (
    targetMetadata.width !== canvasWidth ||
    targetMetadata.height !== canvasHeight
  ) {
    processedTarget = targetImage.resize(canvasWidth, canvasHeight, {
      fit: "fill",
    });
  }

  // Apply mask using composite with dest-in blend mode
  const result = processedTarget.composite([
    {
      input: maskBuffer,
      blend: "dest-in",
    },
  ]);

  // Flatten if needed (for some output formats)
  const flattened = result.flatten({ background: backgroundColor });

  // Write output
  await flattened.toFile(outputPath);

  // Get metadata
  const metadata = await sharp(outputPath).metadata();
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
 * Apply a luminance mask to a target image
 *
 * Luminance masks use brightness values to determine opacity:
 * - White areas = fully opaque
 * - Black areas = fully transparent
 * - Gray areas = partially transparent
 *
 * @param options - Composite options
 * @returns Composite result with metadata
 */
export async function applyLuminanceMask(
  options: CompositeOptions
): Promise<CompositeResult> {
  const {
    targetImagePath,
    maskInput,
    outputPath,
    alignment,
    backgroundColor,
  } = options;

  // Load target image
  const targetImage = sharp(targetImagePath);
  const targetMetadata = await targetImage.metadata();

  // Prepare mask - convert to grayscale
  const maskBuffer = await prepareMaskInput(maskInput, alignment);
  const grayMask = sharp(maskBuffer).grayscale();

  // Resize mask to match target dimensions (not composite dimensions)
  const maskResized = grayMask.resize(
    targetMetadata.width || 100,
    targetMetadata.height || 100,
    { fit: "fill" }
  );

  // Get the mask as raw buffer (grayscale)
  const maskRaw = await maskResized.raw().toBuffer();

  // Create alpha channel from grayscale (use green channel)
  const alphaValues = [];
  for (let i = 1; i < maskRaw.length; i += 4) {
    alphaValues.push(maskRaw[i]);
  }

  // Create RGBA buffer with alpha channel
  const targetRaw = await targetImage
    .resize(alignment.compositeDimensions.width, alignment.compositeDimensions.height, {
      fit: "fill",
    })
    .raw()
    .toBuffer();

  // Apply alpha channel
  const resultRaw = Buffer.alloc(targetRaw.length);
  for (let i = 0; i < targetRaw.length; i += 4) {
    // Red, Green, Blue from target
    resultRaw[i] = targetRaw[i];
    resultRaw[i + 1] = targetRaw[i + 1];
    resultRaw[i + 2] = targetRaw[i + 2];

    // Alpha from mask (normalized to target size)
    const targetSize = alignment.compositeDimensions.width * alignment.compositeDimensions.height;
    const maskIndex = Math.floor((i / 4) * (alphaValues.length / targetSize));
    const alphaValue = alphaValues[Math.min(maskIndex, alphaValues.length - 1)];
    resultRaw[i + 3] = alphaValue;
  }

  // Create Sharp instance from raw buffer
  const result = sharp(resultRaw, {
    raw: {
      width: alignment.compositeDimensions.width,
      height: alignment.compositeDimensions.height,
      channels: 4,
    },
  });

  // Write output
  await result.png().toFile(outputPath);

  // Get metadata
  const metadata = await sharp(outputPath).metadata();
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

// =====================================================
// Helper Functions
// =====================================================

/**
 * Prepare mask input for compositing
 * Rasterizes SVG if needed and resizes to composite dimensions
 */
async function prepareMaskInput(
  maskInput: string | Buffer,
  alignment: AlignedAssets
): Promise<Buffer> {
  let maskProcessor: sharp.Sharp;

  // Check if input is SVG (string starting with <svg) or file path
  if (typeof maskInput === "string") {
    if (maskInput.trim().startsWith("<svg")) {
      // It's raw SVG content
      maskProcessor = sharp(Buffer.from(maskInput));
    } else {
      // It's a file path
      maskProcessor = sharp(maskInput);
    }
  } else {
    // It's a Buffer
    maskProcessor = sharp(maskInput);
  }

  // Resize to composite dimensions
  const resized = maskProcessor.resize(
    alignment.compositeDimensions.width,
    alignment.compositeDimensions.height,
    { fit: "fill" }
  );

  // Ensure mask is black on white for proper compositing
  // (White = opaque, Black = transparent in mask context)
  const processed = resized
    .flatten({ background: "#000000" })
    .negate(); // Negate so white areas are opaque

  return processed.png().toBuffer();
}

/**
 * Create a blank mask canvas
 *
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Sharp instance for blank canvas
 */
export function createMaskCanvas(width: number, height: number): sharp.Sharp {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
}

/**
 * Rasterize SVG mask to PNG buffer
 *
 * @param svgContent - SVG content as string
 * @param width - Target width
 * @param height - Target height
 * @returns PNG buffer
 */
export async function rasterizeSvgMask(
  svgContent: string,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(Buffer.from(svgContent))
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
}

/**
 * Composite an image with offset positioning
 *
 * @param baseImage - Base image Sharp instance
 * @param overlay - Overlay buffer
 * @param offset - X/Y offset for overlay
 * @returns Composited buffer
 */
export async function compositeWithOffset(
  baseImage: sharp.Sharp,
  overlay: Buffer,
  offset: { x: number; y: number }
): Promise<Buffer> {
  const result = baseImage.composite([
    {
      input: overlay,
      left: offset.x,
      top: offset.y,
    },
  ]);

  return result.png().toBuffer();
}

/**
 * Validate compositing options
 *
 * @param options - Options to validate
 * @throws Error if options are invalid
 */
export function validateCompositeOptions(options: CompositeOptions): void {
  if (!options.targetImagePath) {
    throw new Error("targetImagePath is required");
  }
  if (!options.maskInput) {
    throw new Error("maskInput is required");
  }
  if (!options.outputPath) {
    throw new Error("outputPath is required");
  }
  if (!options.alignment) {
    throw new Error("alignment is required");
  }
  if (
    options.alignment.compositeDimensions.width <= 0 ||
    options.alignment.compositeDimensions.height <= 0
  ) {
    throw new Error("compositeDimensions must have positive values");
  }
}

/**
 * Check if a file exists
 *
 * @param filePath - Path to check
 * @returns True if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const fs = await import("node:fs/promises");
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
