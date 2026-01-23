/**
 * Content analyzer - Analyze image content for format optimization
 *
 * Provides image analysis capabilities including:
 * - Shannon entropy calculation for complexity measurement
 * - Transparency detection for alpha channel presence
 * - Color palette estimation
 * - Content type classification (GRAPHIC vs PHOTOGRAPH)
 *
 * Used by format-optimizer and auto-converter for intelligent format selection.
 */
import sharp from "sharp";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Content analysis result
 */
export interface ContentAnalysis {
  /** Shannon entropy score (0-8, higher = more complex) */
  entropy: number;
  /** Has alpha channel with transparency */
  hasTransparency: boolean;
  /** Estimated unique colors */
  paletteSize: number;
  /** Image dimensions */
  width: number;
  height: number;
  /** Content type classification */
  contentType: "GRAPHIC" | "PHOTOGRAPH" | "MIXED";
}

/**
 * Analyzer options
 */
export interface AnalyzerOptions {
  /** Sample size for color estimation (default: 10000) */
  sampleSize?: number;
  /** Entropy threshold for photo vs graphic (default: 6.0) */
  entropyThreshold?: number;
}

/**
 * Supported image formats
 */
export type ImageFormat = "jpeg" | "png" | "webp";

// =====================================================
// Entropy Calculation
// =====================================================

/**
 * Calculate Shannon entropy of an image
 *
 * Shannon entropy measures the complexity/variation in pixel values.
 * Higher values indicate more complex images (photographs, noise).
 * Lower values indicate simpler images (graphics, solid colors).
 *
 * Range: 0-8 (for 8-bit color channels)
 * - 0 = all pixels identical (solid color)
 * - 8 = maximum variation (random noise)
 *
 * @param imagePath - Path to image file
 * @returns Shannon entropy value (0-8)
 */
export async function calculateEntropy(imagePath: string): Promise<number> {
  // Get metadata
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // For large images, sample pixels instead of processing all
  const sampleSize = Math.min(width * height, 10000);
  const scaleFactor = Math.sqrt(sampleSize / (width * height));
  const sampleWidth = Math.max(1, Math.floor(width * scaleFactor));
  const sampleHeight = Math.max(1, Math.floor(height * scaleFactor));

  // Get raw pixel data
  const rawData = await sharp(imagePath)
    .resize(sampleWidth, sampleHeight, { fit: "fill" })
    .raw()
    .toBuffer();

  const channels = metadata.channels || 3;
  const totalPixels = sampleWidth * sampleHeight;
  const channelWeights = [0.299, 0.587, 0.114]; // YCbCr luminance weights

  let totalEntropy = 0;

  // Calculate entropy for each RGB channel
  for (let channelIdx = 0; channelIdx < 3; channelIdx++) {
    // Build histogram for this channel
    const histogram = new Array(256).fill(0);

    for (let i = channelIdx; i < rawData.length; i += channels) {
      const value = rawData[i];
      histogram[value]++;
    }

    // Calculate Shannon entropy: H = -sum(p(x) * log2(p(x)))
    let channelEntropy = 0;

    for (let i = 0; i < 256; i++) {
      const count = histogram[i];
      if (count > 0) {
        const probability = count / totalPixels;
        channelEntropy -= probability * Math.log2(probability);
      }
    }

    // Weight channels by perceptual importance
    totalEntropy += channelEntropy * channelWeights[channelIdx];
  }

  return totalEntropy;
}

// =====================================================
// Transparency Detection
// =====================================================

/**
 * Check if an image has transparency
 *
 * Detects whether the image has an alpha channel with any non-opaque pixels.
 *
 * @param imagePath - Path to image file
 * @returns True if image has transparency
 */
export async function checkTransparency(imagePath: string): Promise<boolean> {
  const metadata = await sharp(imagePath).metadata();

  // Check if image has alpha channel
  if (!metadata.channels || metadata.channels < 4) {
    return false;
  }

  // For PNG and other formats with alpha, check pixel data
  try {
    // Sample the image to check for transparency
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // For large images, sample a smaller area
    const sampleSize = Math.min(width * height, 10000);
    const scaleFactor = Math.sqrt(sampleSize / (width * height));
    const sampleWidth = Math.max(1, Math.floor(width * scaleFactor));
    const sampleHeight = Math.max(1, Math.floor(height * scaleFactor));

    // Get raw pixel data with alpha channel
    const rawData = await sharp(imagePath)
      .resize(sampleWidth, sampleHeight, { fit: "fill" })
      .raw()
      .toBuffer();

    const channels = metadata.channels || 4;
    let transparentPixels = 0;
    const totalPixels = sampleWidth * sampleHeight;

    // Check alpha channel (4th byte in RGBA)
    for (let i = 3; i < rawData.length; i += channels) {
      if (rawData[i] < 250) { // Allow small rounding errors
        transparentPixels++;
        // Early exit if we found significant transparency
        if (transparentPixels > totalPixels * 0.001) {
          return true;
        }
      }
    }

    return transparentPixels > totalPixels * 0.001;
  } catch {
    // If we can't check pixels, assume no transparency
    return false;
  }
}

// =====================================================
// Color Palette Estimation
// =====================================================

/**
 * Estimate the number of unique colors in an image
 *
 * Uses color quantization to estimate unique colors efficiently.
 * Samples pixels rather than examining every pixel for performance.
 *
 * @param imagePath - Path to image file
 * @param sampleSize - Maximum pixels to sample (default: 10000)
 * @returns Estimated number of unique colors
 */
export async function estimateUniqueColors(
  imagePath: string,
  sampleSize = 10000
): Promise<number> {
  const metadata = await sharp(imagePath).metadata();

  if (!metadata.width || !metadata.height) {
    return 0;
  }

  const totalPixels = metadata.width * metadata.height;

  // Calculate sampling factor
  const sampleFactor = Math.min(1, sampleSize / totalPixels);

  // Resize to sample size and get raw pixel data
  let sampleWidth = metadata.width;
  let sampleHeight = metadata.height;

  if (sampleFactor < 1) {
    sampleWidth = Math.max(1, Math.floor(metadata.width * Math.sqrt(sampleFactor)));
    sampleHeight = Math.max(1, Math.floor(metadata.height * Math.sqrt(sampleFactor)));
  }

  // Get raw pixel data
  const rawData = await sharp(imagePath)
    .resize(sampleWidth, sampleHeight, { fit: "fill" })
    .raw()
    .toBuffer();

  // Count unique colors using a Set
  const uniqueColors = new Set<string>();
  const channels = metadata.channels || 3;
  const actualChannels = Math.min(channels, 3); // Only RGB, ignore alpha

  for (let i = 0; i < rawData.length; i += channels) {
    // Create color key from RGB values
    const colorKey = `${rawData[i]},${rawData[i + 1]},${rawData[i + 2]}`;
    uniqueColors.add(colorKey);

    // Early exit if we exceed reasonable palette size
    if (uniqueColors.size > 10000) {
      break;
    }
  }

  // Scale estimate based on sampling
  const scalingFactor = totalPixels / (sampleWidth * sampleHeight);
  const estimatedColors = Math.min(
    Math.floor(uniqueColors.size * scalingFactor),
    totalPixels
  );

  return estimatedColors;
}

// =====================================================
// Content Analysis Integration
// =====================================================

/**
 * Analyze image content comprehensively
 *
 * Performs all analysis operations and returns consolidated results.
 *
 * @param imagePath - Path to image file
 * @param options - Analyzer options
 * @returns Complete content analysis
 */
export async function analyzeContent(
  imagePath: string,
  options: AnalyzerOptions = {}
): Promise<ContentAnalysis> {
  const { sampleSize = 10000, entropyThreshold = 6.0 } = options;

  // Get metadata
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Run all analyses in parallel where possible
  const [entropy, hasTransparency, paletteSize] = await Promise.all([
    calculateEntropy(imagePath),
    checkTransparency(imagePath),
    estimateUniqueColors(imagePath, sampleSize),
  ]);

  // Classify content type
  const contentType = classifyContentType(
    entropy,
    paletteSize,
    entropyThreshold
  );

  return {
    entropy,
    hasTransparency,
    paletteSize,
    width,
    height,
    contentType,
  };
}

/**
 * Classify content type based on analysis metrics
 *
 * @param entropy - Image entropy
 * @param paletteSize - Estimated unique colors
 * @param entropyThreshold - Threshold for photo vs graphic
 * @returns Content type classification
 */
function classifyContentType(
  entropy: number,
  paletteSize: number,
  entropyThreshold: number
): "GRAPHIC" | "PHOTOGRAPH" | "MIXED" {
  const isHighEntropy = entropy >= entropyThreshold;
  const isLargePalette = paletteSize > 256;

  if (isHighEntropy && isLargePalette) {
    return "PHOTOGRAPH";
  } else if (!isHighEntropy && !isLargePalette) {
    return "GRAPHIC";
  } else {
    return "MIXED";
  }
}

// =====================================================
// Format Recommendation
// =====================================================

/**
 * Recommend optimal image format based on content analysis
 *
 * Decision logic:
 * 1. If has transparency → PNG
 * 2. If entropy high (photograph) → JPEG
 * 3. If palette small (<256) → PNG (can use PNG-8)
 * 4. Otherwise → PNG or WebP based on content
 *
 * @param analysis - Content analysis result
 * @returns Recommended image format
 */
export function recommendFormat(analysis: ContentAnalysis): ImageFormat {
  // Gate 1: Transparency → PNG (required)
  if (analysis.hasTransparency) {
    return "png";
  }

  // Gate 2: Entropy threshold
  if (analysis.entropy >= 6.0) {
    // High entropy = photograph → JPEG
    return "jpeg";
  }

  // Gate 3: Small palette → PNG (PNG-8 candidate)
  if (analysis.paletteSize < 256) {
    return "png";
  }

  // Default: PNG for general graphics
  return "png";
}
