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
