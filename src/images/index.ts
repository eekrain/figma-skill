/**
 * Images module - Image download, processing, and crop calculation
 *
 * This module provides comprehensive image handling for Figma designs:
 * - Parallel image downloading with deduplication
 * - Crop calculation from Figma transform matrices
 * - Sharp-based image processing (crop, resize, format conversion)
 * - CSS variable generation for image dimensions
 */

// Crop calculation
export {
  calculateCropFromTransform,
  calculateCropRegions,
  adjustCropToImageBounds,
  type CropRegion,
  type TransformMatrix,
} from "./crop-calculator";

// Image processing
export {
  processImage,
  getImageMetadata,
  cropImage,
  convertFormat,
  generateDimensionCSS,
  generateImageCSSVariables,
  generateTileBackgroundSize,
  type ProcessOptions,
  type ProcessedImage,
} from "./processor";

// Image downloading
export {
  downloadImages,
  downloadImagesDeduplicated,
  deduplicateDownloads,
  type DownloadResult,
  type DownloadOptions,
} from "./downloader";

// Image management
export {
  ImageManager,
  downloadAndProcessImages,
  type ImageProcessingConfig,
  type ImageOperationResult,
} from "./manager";

// Mask detection and relationships
export {
  detectMaskRelationships,
  extractBoundingBox,
  calculateIntersection,
  boxesIntersect,
  calculateUnion,
  isValidBoundingBox,
  getBoundingBoxCenter,
  calculateBoundingBoxArea,
  type MaskRelationship,
  type BoundingBox,
} from "./mask-detector";

// Coordinate alignment for mask compositing
export {
  alignCoordinateSpaces,
  calculateEffectiveBounds,
  calculateRelativeOffset,
  calculateScaleToFit,
  calculateAspectRatio,
  hasSameAspectRatio,
  normalizeBoundingBox,
  clampBoundingBox,
  calculateContainerBounds,
  alignBoxToBox,
  type AlignedAssets,
  type AlignmentOptions,
} from "./coordinate-aligner";

// Mask compositing (Sharp-based SVG matte compositing)
export {
  applyVectorMask,
  applyLuminanceMask,
  validateCompositeOptions,
  fileExists,
  createMaskCanvas,
  rasterizeSvgMask,
  compositeWithOffset,
  type CompositeOptions,
  type CompositeResult,
} from "./mask-compositor";

// Mask-aware downloading (extends downloader with mask compositing)
export {
  downloadImagesWithMasks,
  groupTargetsByMask,
  type MaskDownloadOptions,
  type MaskDownloadResult,
  type MaskRelationship as MaskDownloaderRelationship,
} from "./mask-downloader";

// =====================================================
// Phase 2: Smart Format Detection & Auto-Conversion
// =====================================================

// Content analysis (entropy, transparency, palette estimation)
export {
  analyzeContent,
  calculateEntropy,
  checkTransparency,
  estimateUniqueColors,
  recommendFormat,
  type ContentAnalysis,
  type AnalyzerOptions,
  type ImageFormat as ContentImageFormat,
} from "./content-analyzer";

// Format-specific encoder settings optimization
export {
  getOptimizedSettings,
  getJpegSettings,
  getPngSettings,
  getWebPSettings,
  type FormatSettings,
  type JpegSettings,
  type PngSettings,
  type WebPSettings,
} from "./format-optimizer";

// Automatic image conversion pipeline
export {
  convertToOptimalFormat,
  batchConvert,
  calculateSavings,
  type ConversionOptions,
  type ConversionMetrics,
} from "./auto-converter";

// =====================================================
// Phase 3: Batch Processing & Concurrency
// =====================================================

// Sharp cache configuration
export {
  configureCache,
  getCacheStats,
  clearCache,
  withCache,
  type CacheOptions,
  type CacheStats,
} from "./sharp-cache";

// Batch processing with controlled concurrency
export {
  processBatch,
  createConcurrencyLimit,
  type BatchProcessorOptions,
  type BatchProcessorResult,
  type ProcessFn,
  type Limit,
} from "./integrations/batch-wrapper.js";

// Export the original implementation under a different name
export {
  processBatch as processBatchOriginal,
  createConcurrencyLimit as createConcurrencyLimitOriginal,
} from "./batch-processor";

// Download-process pipeline (integrated download + conversion)
export {
  downloadAndProcess,
  createTempFilePath,
  cleanupTempDir,
  type DownloadProcessItem,
  type DownloadProcessOptions,
  type DownloadProcessResult,
  type PipelineStats,
} from "./download-process-pipeline";