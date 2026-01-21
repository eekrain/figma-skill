/**
 * Crop calculator - Calculate crop regions from Figma transform matrices
 */
import type { Node } from "@figma/rest-api-spec";

/**
 * Transform matrix from Figma
 * Format: [[scaleX, skewX, translateX], [skewY, scaleY, translateY]]
 */
export type TransformMatrix = [
  [number, number, number],
  [number, number, number],
];

/**
 * Crop region calculated from transform
 */
export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculate crop region from a Figma node's transform matrix
 *
 * @param node - Figma node with transform properties
 * @returns Crop region or null if no crop needed
 */
export function calculateCropFromTransform(node: Node): CropRegion | null {
  // Check if node has transform properties
  if (!hasTransform(node)) {
    return null;
  }

  const nodeWidth = (node as { width?: number }).width || 0;
  const nodeHeight = (node as { height?: number }).height || 0;

  if (nodeWidth === 0 || nodeHeight === 0) {
    return null;
  }

  // Get transform matrix components
  const transform = (node as { transform?: TransformMatrix }).transform;
  if (!transform) {
    return null;
  }

  const [[scaleX, , translateX], [, scaleY, translateY]] = transform;

  // Calculate crop region based on transform
  // Translation is in absolute pixels, scale is relative
  const cropLeft = Math.max(0, Math.round(translateX));
  const cropTop = Math.max(0, Math.round(translateY));

  // Calculate scaled dimensions
  const scaledWidth = Math.round(scaleX * nodeWidth);
  const scaledHeight = Math.round(scaleY * nodeHeight);

  // For pure translation (scale = 1), clamp to remaining width/height
  // For scaling (scale != 1), allow dimensions to exceed original size
  const cropWidth =
    scaleX === 1 ? Math.max(0, nodeWidth - cropLeft) : Math.max(0, scaledWidth);
  const cropHeight =
    scaleY === 1
      ? Math.max(0, nodeHeight - cropTop)
      : Math.max(0, scaledHeight);

  // Validate crop dimensions
  if (cropWidth < 0 || cropHeight < 0) {
    return null;
  }

  return {
    left: cropLeft,
    top: cropTop,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Check if a node has transform properties
 */
function hasTransform(node: Node): node is Node & {
  width?: number;
  height?: number;
  transform?: TransformMatrix;
} {
  return "width" in node || "height" in node || "transform" in node;
}

/**
 * Calculate multiple crop regions from an array of nodes
 *
 * @param nodes - Array of Figma nodes
 * @returns Map of node ID to crop region
 */
export function calculateCropRegions(nodes: Node[]): Map<string, CropRegion> {
  const crops = new Map<string, CropRegion>();

  for (const node of nodes) {
    const crop = calculateCropFromTransform(node);
    if (crop) {
      crops.set(node.id, crop);
    }
  }

  return crops;
}

/**
 * Apply crop region to image dimensions
 *
 * @param region - Crop region
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @returns Adjusted crop region that fits within image bounds
 */
export function adjustCropToImageBounds(
  region: CropRegion,
  imageWidth: number,
  imageHeight: number
): CropRegion {
  return {
    left: Math.max(0, Math.min(region.left, imageWidth - 1)),
    top: Math.max(0, Math.min(region.top, imageHeight - 1)),
    width: Math.min(region.width, imageWidth - region.left),
    height: Math.min(region.height, imageHeight - region.top),
  };
}
