/**
 * Format optimizer - Format-specific encoder settings based on content analysis
 *
 * Provides optimized encoder settings for different image formats (JPEG/PNG/WebP)
 * based on content analysis metrics like entropy, palette size, and content type.
 *
 * Used by auto-converter for intelligent format conversion with optimal settings.
 */
import type { ContentAnalysis } from "./content-analyzer";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Supported image formats
 */
export type ImageFormat = "jpeg" | "png" | "webp";

/**
 * Base format settings
 */
export interface FormatSettings {
  format: ImageFormat;
}

/**
 * JPEG encoder settings
 */
export interface JpegSettings extends FormatSettings {
  format: "jpeg";
  quality: number;
  chromaSubsampling: "4:4:4" | "4:2:0";
}

/**
 * PNG encoder settings
 */
export interface PngSettings extends FormatSettings {
  format: "png";
  compressionLevel: number;
  adaptiveFiltering: boolean;
  palette: boolean;
}

/**
 * WebP encoder settings
 */
export interface WebPSettings extends FormatSettings {
  format: "webp";
  quality: number;
  lossless: boolean;
  nearLossless: boolean;
  smartSubsample: boolean;
  effort: number;
}

// =====================================================
// JPEG Settings
// =====================================================

/**
 * Get optimized JPEG encoder settings based on content analysis
 *
 * JPEG optimization strategy:
 * - Quality: 80-95 based on entropy (higher for complex images)
 * - Chroma 4:2:0 for photographs (preserves detail where needed)
 * - Chroma 4:4:4 for graphics/edges (prevents artifacts)
 *
 * @param analysis - Content analysis result
 * @returns Optimized JPEG settings
 */
export function getJpegSettings(analysis: ContentAnalysis): JpegSettings {
  // Calculate quality based on entropy (0-8 scale)
  // Higher entropy = more complex = need higher quality
  const entropyFactor = analysis.entropy / 8; // 0-1
  const quality = Math.floor(70 + entropyFactor * 25); // 70-95 range
  const clampedQuality = Math.max(70, Math.min(95, quality));

  // Use 4:4:4 for graphics/edges, 4:2:0 for photographs
  const isGraphic = analysis.contentType === "GRAPHIC" || analysis.paletteSize < 256;
  const chromaSubsampling: "4:4:4" | "4:2:0" = isGraphic ? "4:4:4" : "4:2:0";

  return {
    format: "jpeg",
    quality: clampedQuality,
    chromaSubsampling,
  };
}

// =====================================================
// PNG Settings
// =====================================================

/**
 * Get optimized PNG encoder settings based on content analysis
 *
 * PNG optimization strategy:
 * - Compression level: 6-9 based on complexity
 * - Adaptive filtering: always enabled for best compression
 * - Palette: enabled for <256 colors (PNG-8)
 *
 * @param analysis - Content analysis result
 * @returns Optimized PNG settings
 */
export function getPngSettings(analysis: ContentAnalysis): PngSettings {
  // Calculate compression level based on entropy
  // Lower entropy = simpler = can use higher compression
  const entropyFactor = 1 - analysis.entropy / 8; // Invert: low entropy = high compression
  const compressionLevel = Math.floor(5 + entropyFactor * 4); // 5-9 range
  const clampedLevel = Math.max(1, Math.min(9, compressionLevel));

  // Enable palette for limited color images
  const palette = analysis.paletteSize < 256;

  return {
    format: "png",
    compressionLevel: clampedLevel,
    adaptiveFiltering: true,
    palette,
  };
}

// =====================================================
// WebP Settings
// =====================================================

/**
 * Get optimized WebP encoder settings based on content analysis
 *
 * WebP optimization strategy:
 * - Lossless for graphics with limited palettes
 * - Lossy for photographs with high quality
 * - Near-lossless for mixed content
 * - Smart subsample for photographs
 *
 * @param analysis - Content analysis result
 * @returns Optimized WebP settings
 */
export function getWebPSettings(analysis: ContentAnalysis): WebPSettings {
  // Determine lossless mode
  const isGraphic = analysis.contentType === "GRAPHIC" && analysis.paletteSize < 256;
  const isMixed = analysis.contentType === "MIXED";

  const lossless = isGraphic;
  const nearLossless = isMixed && !isGraphic;

  // Calculate quality (only used for lossy mode)
  const entropyFactor = analysis.entropy / 8;
  const quality = lossless
    ? 100
    : Math.floor(75 + entropyFactor * 20); // 75-95 for lossy

  // Smart subsample helps with photographs
  const smartSubsample = analysis.contentType === "PHOTOGRAPH";

  // Effort level (encoding speed vs compression)
  // Higher = better compression but slower
  const effort = analysis.contentType === "PHOTOGRAPH" ? 4 : 5;

  return {
    format: "webp",
    quality,
    lossless,
    nearLossless,
    smartSubsample,
    effort,
  };
}

// =====================================================
// Optimized Settings Router
// =====================================================

/**
 * Get optimized encoder settings for the specified format
 *
 * Routes to the appropriate format-specific function based on the
 * requested format.
 *
 * @param format - Target image format
 * @param analysis - Content analysis result
 * @returns Optimized format settings
 */
export function getOptimizedSettings(
  format: ImageFormat,
  analysis: ContentAnalysis
): FormatSettings {
  switch (format) {
    case "jpeg":
      return getJpegSettings(analysis);
    case "png":
      return getPngSettings(analysis);
    case "webp":
      return getWebPSettings(analysis);
  }
}
