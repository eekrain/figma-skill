// Consolidate image processing functions
// Matches mcp-reference/src/utils/image-processing.ts
import type { Transform } from "@figma/rest-api-spec";

/**
 * Generate a short hash from a transform matrix
 * Matches mcp-reference: generateTransformHash
 */
export function generateTransformHash(transform: Transform): string {
  const values = transform.flat();
  const hash = values.reduce((acc, val) => {
    const str = val.toString();
    for (let i = 0; i < str.length; i++) {
      acc = ((acc << 5) - acc + str.charCodeAt(i)) & 0xffffffff;
    }
    return acc;
  }, 0);

  return Math.abs(hash).toString(16).substring(0, 6);
}

// Re-export crop calculator functions from images module
export {
  calculateCropFromTransform,
  calculateCropRegions,
  adjustCropToImageBounds,
  type TransformMatrix,
  type CropRegion,
} from "../images/crop-calculator";

// Re-export image processor functions from images module
export {
  processImage,
  getImageMetadata,
  cropImage,
  convertFormat,
  generateDimensionCSS,
  type ProcessOptions,
  type ProcessedImage,
} from "../images/processor";
