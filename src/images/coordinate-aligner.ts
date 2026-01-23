/**
 * Coordinate aligner - Normalize coordinate spaces for mask compositing
 *
 * Handles alignment between mask and target images in different coordinate spaces,
 * calculating proper offsets and dimensions for compositing operations.
 */

import type { BoundingBox } from "./mask-detector";

// =====================================================
// Type Definitions
// =====================================================

// Re-export BoundingBox for convenience
export type { BoundingBox };

/**
 * Aligned assets for mask compositing
 */
export interface AlignedAssets {
  /** Target image offset relative to mask origin */
  targetOffset?: { x: number; y: number };
  /** Composite canvas dimensions (match mask bounds) */
  compositeDimensions: { width: number; height: number };
  /** Effective crop region for target */
  effectiveBounds?: BoundingBox;
  /** Scale factors if needed (can be a single number or separate x/y values) */
  scale?: number | { x: number; y: number };
  /** Optional: Target image metadata (for integration tests) */
  targetImage?: {
    path: string;
    width: number;
    height: number;
    bounds: BoundingBox;
  };
  /** Optional: Mask metadata (for integration tests) */
  mask?: {
    path: string;
    width: number;
    height: number;
    bounds: BoundingBox;
  };
  /** Relative offset (alternative to targetOffset) */
  relativeOffset: { x: number; y: number };
  /** Optional: Aspect ratio match flag */
  aspectRatioMatch?: boolean;
}

/**
 * Alignment options
 */
export interface AlignmentOptions {
  /** Whether to crop to effective bounds (default: true) */
  cropToEffective?: boolean;
  /** Padding to add around effective bounds (default: 0) */
  padding?: number;
}

// =====================================================
// Coordinate Alignment
// =====================================================

/**
 * Align coordinate spaces between mask and target for compositing
 * 4-argument overload: mask dims, target dims, mask bounds, target bounds
 */
export function alignCoordinateSpaces(
  maskDimensions: { width: number; height: number },
  targetDimensions: { width: number; height: number },
  maskBoundingBox: BoundingBox,
  targetBoundingBox: BoundingBox
): AlignedAssets;

/**
 * Align coordinate spaces between mask and target for compositing
 * 2-3 argument overload: mask bounds, target bounds, options
 */
export function alignCoordinateSpaces(
  maskBoundingBox: BoundingBox,
  targetBoundingBox: BoundingBox,
  options?: AlignmentOptions
): AlignedAssets;

/**
 * Align coordinate spaces between mask and target for compositing
 *
 * This calculates the proper positioning of the target relative to the mask
 * to ensure correct compositing when both are in different coordinate spaces.
 *
 * @param maskBoundingBox - Mask bounding box
 * @param targetBoundingBox - Target bounding box
 * @param options - Alignment options
 * @returns Aligned assets with offsets and dimensions
 */
export function alignCoordinateSpaces(
  maskBoundingBoxOrDims: BoundingBox | { width: number; height: number },
  targetBoundingBoxOrDims: BoundingBox | { width: number; height: number },
  optionsOrMaskBounds?: AlignmentOptions | BoundingBox,
  targetBounds?: BoundingBox
): AlignedAssets {
  // Detect which API pattern is being used
  const is4ArgPattern = (
    targetBounds !== undefined &&
    typeof optionsOrMaskBounds === "object" && optionsOrMaskBounds !== null &&
    "x" in optionsOrMaskBounds
  );

  let maskBoundingBox: BoundingBox;
  let targetBoundingBox: BoundingBox;
  let options: AlignmentOptions = {};
  let scale: number | { x: number; y: number } | undefined;
  let relativeOffset: { x: number; y: number } | undefined;

  if (is4ArgPattern) {
    // 4-argument pattern: maskDims, targetDims, maskBounds, targetBounds
    const maskDims = maskBoundingBoxOrDims as { width: number; height: number };
    const targetDims = targetBoundingBoxOrDims as { width: number; height: number };
    maskBoundingBox = optionsOrMaskBounds as BoundingBox;
    targetBoundingBox = targetBounds!;

    // Calculate scale factors
    scale = {
      x: targetDims.width / maskDims.width,
      y: targetDims.height / maskDims.height,
    };

    // Calculate relative offset
    relativeOffset = {
      x: targetBoundingBox.x - maskBoundingBox.x,
      y: targetBoundingBox.y - maskBoundingBox.y,
    };
  } else {
    // 2-3 argument pattern: maskBounds, targetBounds, options
    maskBoundingBox = maskBoundingBoxOrDims as BoundingBox;
    targetBoundingBox = targetBoundingBoxOrDims as BoundingBox;
    options = (optionsOrMaskBounds || {}) as AlignmentOptions;
  }

  const { cropToEffective = true, padding = 0 } = options;

  // Calculate target offset relative to mask origin
  const targetOffset = {
    x: targetBoundingBox.x - maskBoundingBox.x,
    y: targetBoundingBox.y - maskBoundingBox.y,
  };

  // Calculate effective bounds (intersection of mask and target)
  const effectiveBounds = calculateEffectiveBounds(
    maskBoundingBox,
    targetBoundingBox
  );

  // Apply padding if specified
  let paddedBounds = effectiveBounds;
  if (padding > 0) {
    paddedBounds = {
      x: effectiveBounds.x - padding,
      y: effectiveBounds.y - padding,
      width: effectiveBounds.width + padding * 2,
      height: effectiveBounds.height + padding * 2,
    };
  }

  // Composite dimensions
  let compositeDimensions: { width: number; height: number };
  if (cropToEffective) {
    compositeDimensions = {
      width: paddedBounds.width,
      height: paddedBounds.height,
    };
  } else {
    compositeDimensions = {
      width: maskBoundingBox.width,
      height: maskBoundingBox.height,
    };
  }

  const result: AlignedAssets = {
    targetOffset,
    compositeDimensions,
    effectiveBounds: paddedBounds,
    relativeOffset: relativeOffset || targetOffset,
  };

  // Add optional properties for 4-arg pattern
  if (scale !== undefined) {
    result.scale = scale;
  }

  return result;
}

/**
 * Calculate effective bounds where mask and target overlap
 *
 * @param maskBounds - Mask bounding box
 * @param targetBounds - Target bounding box
 * @returns Intersection bounding box
 */
export function calculateEffectiveBounds(
  maskBounds: BoundingBox,
  targetBounds: BoundingBox
): BoundingBox {
  // Import calculateIntersection to avoid circular dependency
  const { calculateIntersection: intersect } = require("./mask-detector");

  return intersect(maskBounds, targetBounds);
}

/**
 * Calculate relative offset between two bounding boxes
 *
 * @param fromBox - Source box
 * @param toBox - Target box
 * @returns Offset from source to target
 */
export function calculateRelativeOffset(
  fromBox: BoundingBox,
  toBox: BoundingBox
): { x: number; y: number } {
  return {
    x: toBox.x - fromBox.x,
    y: toBox.y - fromBox.y,
  };
}

/**
 * Calculate scale factor to fit source into destination
 *
 * @param sourceBox - Source bounding box
 * @param destBox - Destination bounding box
 * @param fitMode - How to fit ('contain', 'cover', or 'fill')
 * @returns Scale factor (1 = no scaling)
 */
export function calculateScaleToFit(
  sourceBox: BoundingBox,
  destBox: BoundingBox,
  fitMode: "contain" | "cover" | "fill" = "contain"
): number {
  const scaleX = destBox.width / sourceBox.width;
  const scaleY = destBox.height / sourceBox.height;

  switch (fitMode) {
    case "contain":
      return Math.min(scaleX, scaleY);
    case "cover":
      return Math.max(scaleX, scaleY);
    case "fill":
      return 1; // Don't scale, just stretch
    default:
      return 1;
  }
}

/**
 * Calculate aspect ratio of a bounding box
 *
 * @param box - Bounding box
 * @returns Aspect ratio (width / height)
 */
export function calculateAspectRatio(box: BoundingBox): number {
  return box.width / box.height;
}

/**
 * Check if two bounding boxes have the same aspect ratio
 *
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @param tolerance - Allowed difference (default: 0.01)
 * @returns True if aspect ratios match within tolerance
 */
export function hasSameAspectRatio(
  box1: BoundingBox,
  box2: BoundingBox,
  tolerance = 0.01
): boolean {
  const ratio1 = calculateAspectRatio(box1);
  const ratio2 = calculateAspectRatio(box2);
  return Math.abs(ratio1 - ratio2) <= tolerance;
}

/**
 * Normalize bounding box to have non-negative dimensions
 *
 * @param box - Input bounding box
 * @returns Normalized bounding box
 */
export function normalizeBoundingBox(box: BoundingBox): BoundingBox {
  let x = box.x;
  let y = box.y;
  let width = box.width;
  let height = box.height;

  // Handle negative width
  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }

  // Handle negative height
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }

  return { x, y, width, height };
}

/**
 * Clamp a bounding box within bounds
 *
 * @param box - Box to clamp
 * @param bounds - Boundary box
 * @returns Clamped bounding box
 */
export function clampBoundingBox(box: BoundingBox, bounds: BoundingBox): BoundingBox {
  return {
    x: Math.max(bounds.x, Math.min(box.x, bounds.x + bounds.width)),
    y: Math.max(bounds.y, Math.min(box.y, bounds.y + bounds.height)),
    width: Math.min(box.width, bounds.x + bounds.width - box.x),
    height: Math.min(box.height, bounds.y + bounds.height - box.y),
  };
}

/**
 * Calculate the dimensions needed to contain both boxes
 *
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns Bounding box that contains both
 */
export function calculateContainerBounds(
  box1: BoundingBox,
  box2: BoundingBox
): BoundingBox {
  // Import calculateUnion to avoid circular dependency
  const { calculateUnion: union } = require("./mask-detector");

  return union(box1, box2);
}

/**
 * Align a box to another using specified alignment
 *
 * @param sourceBox - Box to align
 * @param targetBox - Box to align to
 * @param horizontalAlign - Horizontal alignment
 * @param verticalAlign - Vertical alignment
 * @returns Aligned bounding box
 */
export function alignBoxToBox(
  sourceBox: BoundingBox,
  targetBox: BoundingBox,
  horizontalAlign: "left" | "center" | "right" = "left",
  verticalAlign: "top" | "center" | "bottom" = "top"
): BoundingBox {
  let x = targetBox.x;
  let y = targetBox.y;

  // Horizontal alignment
  switch (horizontalAlign) {
    case "left":
      x = targetBox.x;
      break;
    case "center":
      x = targetBox.x + (targetBox.width - sourceBox.width) / 2;
      break;
    case "right":
      x = targetBox.x + targetBox.width - sourceBox.width;
      break;
  }

  // Vertical alignment
  switch (verticalAlign) {
    case "top":
      y = targetBox.y;
      break;
    case "center":
      y = targetBox.y + (targetBox.height - sourceBox.height) / 2;
      break;
    case "bottom":
      y = targetBox.y + targetBox.height - sourceBox.height;
      break;
  }

  return {
    x,
    y,
    width: sourceBox.width,
    height: sourceBox.height,
  };
}
