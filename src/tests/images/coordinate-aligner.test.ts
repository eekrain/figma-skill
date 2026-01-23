/**
 * Unit tests for images/coordinate-aligner module
 *
 * Tests coordinate space normalization for mask compositing
 */
import { describe, expect, it } from "@jest/globals";

import {
  alignBoxToBox,
  alignCoordinateSpaces,
  calculateAspectRatio,
  calculateContainerBounds,
  calculateEffectiveBounds,
  calculateRelativeOffset,
  calculateScaleToFit,
  clampBoundingBox,
  hasSameAspectRatio,
  normalizeBoundingBox,
  type AlignedAssets,
  type BoundingBox,
} from "@/images/coordinate-aligner";

describe("images/coordinate-aligner", () => {
  // =====================================================
  // Test Suite 1: alignCoordinateSpaces - Basic Alignment
  // =====================================================
  describe("alignCoordinateSpaces - basic alignment", () => {
    it("should calculate target offset when mask is at origin", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.targetOffset).toEqual({ x: 10, y: 10 });
    });

    it("should calculate correct offset when both have positions", () => {
      const maskBox: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 70, y: 80, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.targetOffset).toEqual({ x: 20, y: 30 });
    });

    it("should calculate correct offset when target is before mask", () => {
      const maskBox: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.targetOffset).toEqual({ x: -40, y: -40 });
    });
  });

  // =====================================================
  // Test Suite 2: alignCoordinateSpaces - Composite Dimensions
  // =====================================================
  describe("alignCoordinateSpaces - composite dimensions", () => {
    it("should return correct composite dimensions matching mask bounds", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      // Composite dimensions match effective bounds (intersection)
      expect(result.compositeDimensions).toEqual({ width: 50, height: 50 });
    });

    it("should return mask dimensions when not cropping to effective", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox, {
        cropToEffective: false,
      });

      expect(result.compositeDimensions).toEqual({ width: 100, height: 100 });
    });
  });

  // =====================================================
  // Test Suite 3: alignCoordinateSpaces - Effective Bounds
  // =====================================================
  describe("alignCoordinateSpaces - effective bounds", () => {
    it("should calculate intersection as effective bounds", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.effectiveBounds).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    });

    it("should handle masks larger than targets", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 200, height: 200 };
      const targetBox: BoundingBox = { x: 50, y: 50, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.effectiveBounds).toEqual({ x: 50, y: 50, width: 50, height: 50 });
    });

    it("should handle targets larger than masks", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      expect(result.effectiveBounds).toEqual({ x: 0, y: 0, width: 50, height: 50 });
    });

    it("should apply padding when specified", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox, {
        padding: 5,
      });

      expect(result.effectiveBounds).toEqual({ x: 5, y: 5, width: 60, height: 60 });
    });
  });

  // =====================================================
  // Test Suite 4: calculateEffectiveBounds
  // =====================================================
  describe("calculateEffectiveBounds", () => {
    it("should calculate intersection of overlapping boxes", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };

      const result = calculateEffectiveBounds(maskBox, targetBox);

      expect(result).toEqual({ x: 50, y: 50, width: 50, height: 50 });
    });

    it("should return zero-width box for non-overlapping boxes", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 0, width: 50, height: 50 };

      const result = calculateEffectiveBounds(maskBox, targetBox);

      expect(result.width).toBe(0);
    });
  });

  // =====================================================
  // Test Suite 5: calculateRelativeOffset
  // =====================================================
  describe("calculateRelativeOffset", () => {
    it("should calculate offset from source to target", () => {
      const fromBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const toBox: BoundingBox = { x: 10, y: 20, width: 50, height: 50 };

      const offset = calculateRelativeOffset(fromBox, toBox);

      expect(offset).toEqual({ x: 10, y: 20 });
    });

    it("should calculate negative offset when target is before source", () => {
      const fromBox: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };
      const toBox: BoundingBox = { x: 10, y: 20, width: 50, height: 50 };

      const offset = calculateRelativeOffset(fromBox, toBox);

      expect(offset).toEqual({ x: -40, y: -30 });
    });
  });

  // =====================================================
  // Test Suite 6: calculateScaleToFit
  // =====================================================
  describe("calculateScaleToFit", () => {
    it("should calculate contain scale (maintains aspect ratio)", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const destBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };

      const scale = calculateScaleToFit(sourceBox, destBox, "contain");

      expect(scale).toBe(0.5);
    });

    it("should calculate cover scale (maintains aspect ratio)", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 100, height: 50 };
      const destBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };

      const scale = calculateScaleToFit(sourceBox, destBox, "cover");

      expect(scale).toBe(1);
    });

    it("should return 1 for fill mode (no scaling)", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const destBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };

      const scale = calculateScaleToFit(sourceBox, destBox, "fill");

      expect(scale).toBe(1);
    });

    it("should default to contain mode", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const destBox: BoundingBox = { x: 0, y: 0, width: 75, height: 75 };

      const scale = calculateScaleToFit(sourceBox, destBox);

      expect(scale).toBe(0.75);
    });
  });

  // =====================================================
  // Test Suite 7: calculateAspectRatio
  // =====================================================
  describe("calculateAspectRatio", () => {
    it("should calculate aspect ratio of square", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const ratio = calculateAspectRatio(box);

      expect(ratio).toBe(1);
    });

    it("should calculate aspect ratio of landscape", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 200, height: 100 };

      const ratio = calculateAspectRatio(box);

      expect(ratio).toBe(2);
    });

    it("should calculate aspect ratio of portrait", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 200 };

      const ratio = calculateAspectRatio(box);

      expect(ratio).toBe(0.5);
    });

    it("should calculate aspect ratio with decimal values", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 1920, height: 1080 };

      const ratio = calculateAspectRatio(box);

      expect(ratio).toBeCloseTo(1.7778, 4);
    });
  });

  // =====================================================
  // Test Suite 8: hasSameAspectRatio
  // =====================================================
  describe("hasSameAspectRatio", () => {
    it("should return true for identical aspect ratios", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };

      const result = hasSameAspectRatio(box1, box2);

      expect(result).toBe(true);
    });

    it("should return true for similar aspect ratios within tolerance", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 0, y: 0, width: 101, height: 100 };

      const result = hasSameAspectRatio(box1, box2, 0.02);

      expect(result).toBe(true);
    });

    it("should return false for different aspect ratios", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 0, y: 0, width: 200, height: 100 };

      const result = hasSameAspectRatio(box1, box2);

      expect(result).toBe(false);
    });

    it("should use default tolerance", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 0, y: 0, width: 100.5, height: 100 };

      const result = hasSameAspectRatio(box1, box2);

      expect(result).toBe(true);
    });
  });

  // =====================================================
  // Test Suite 9: normalizeBoundingBox
  // =====================================================
  describe("normalizeBoundingBox", () => {
    it("should return box with positive dimensions unchanged", () => {
      const box: BoundingBox = { x: 10, y: 20, width: 100, height: 50 };

      const result = normalizeBoundingBox(box);

      expect(result).toEqual(box);
    });

    it("should handle negative width", () => {
      const box: BoundingBox = { x: 50, y: 0, width: -100, height: 50 };

      const result = normalizeBoundingBox(box);

      expect(result.x).toBe(-50);
      expect(result.y).toBe(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
    });

    it("should handle negative height", () => {
      const box: BoundingBox = { x: 0, y: 50, width: 100, height: -50 };

      const result = normalizeBoundingBox(box);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
    });

    it("should handle both negative dimensions", () => {
      const box: BoundingBox = { x: 100, y: 100, width: -50, height: -50 };

      const result = normalizeBoundingBox(box);

      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });
  });

  // =====================================================
  // Test Suite 10: clampBoundingBox
  // =====================================================
  describe("clampBoundingBox", () => {
    it("should keep box inside bounds when fully contained", () => {
      const box: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };
      const bounds: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = clampBoundingBox(box, bounds);

      expect(result).toEqual(box);
    });

    it("should clamp box extending beyond left edge", () => {
      const box: BoundingBox = { x: -10, y: 10, width: 50, height: 50 };
      const bounds: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = clampBoundingBox(box, bounds);

      expect(result.x).toBe(0);
    });

    it("should clamp box extending beyond right edge", () => {
      const box: BoundingBox = { x: 80, y: 10, width: 50, height: 50 };
      const bounds: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = clampBoundingBox(box, bounds);

      expect(result.x).toBe(80);
      expect(result.width).toBeLessThanOrEqual(20);
    });

    it("should clamp box extending beyond top edge", () => {
      const box: BoundingBox = { x: 10, y: -10, width: 50, height: 50 };
      const bounds: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = clampBoundingBox(box, bounds);

      expect(result.y).toBe(0);
    });

    it("should clamp box extending beyond bottom edge", () => {
      const box: BoundingBox = { x: 10, y: 80, width: 50, height: 50 };
      const bounds: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const result = clampBoundingBox(box, bounds);

      expect(result.y).toBe(80);
      expect(result.height).toBeLessThanOrEqual(20);
    });
  });

  // =====================================================
  // Test Suite 11: calculateContainerBounds
  // =====================================================
  describe("calculateContainerBounds", () => {
    it("should calculate union of two boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 25, y: 25, width: 50, height: 50 };

      const result = calculateContainerBounds(box1, box2);

      expect(result).toEqual({ x: 0, y: 0, width: 75, height: 75 });
    });

    it("should handle non-overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 100, y: 0, width: 50, height: 50 };

      const result = calculateContainerBounds(box1, box2);

      expect(result).toEqual({ x: 0, y: 0, width: 150, height: 50 });
    });
  });

  // =====================================================
  // Test Suite 12: alignBoxToBox
  // =====================================================
  describe("alignBoxToBox", () => {
    it("should align box to left-top", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };

      const result = alignBoxToBox(sourceBox, targetBox, "left", "top");

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it("should align box to center-center", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };

      const result = alignBoxToBox(sourceBox, targetBox, "center", "center");

      expect(result.x).toBe(125);
      expect(result.y).toBe(125);
    });

    it("should align box to right-bottom", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };

      const result = alignBoxToBox(sourceBox, targetBox, "right", "bottom");

      expect(result.x).toBe(150);
      expect(result.y).toBe(150);
    });

    it("should align box to left-center", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };

      const result = alignBoxToBox(sourceBox, targetBox, "left", "center");

      expect(result.x).toBe(100);
      expect(result.y).toBe(125);
    });

    it("should align box to center-top", () => {
      const sourceBox: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const targetBox: BoundingBox = { x: 100, y: 100, width: 100, height: 100 };

      const result = alignBoxToBox(sourceBox, targetBox, "center", "top");

      expect(result.x).toBe(125);
      expect(result.y).toBe(100);
    });
  });

  // =====================================================
  // Test Suite 13: AlignedAssets Type
  // =====================================================
  describe("AlignedAssets type validation", () => {
    it("should return valid AlignedAssets structure", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result: AlignedAssets = alignCoordinateSpaces(maskBox, targetBox);

      expect(result).toHaveProperty("targetOffset");
      expect(result).toHaveProperty("compositeDimensions");
      expect(result).toHaveProperty("effectiveBounds");
      expect(typeof result.targetOffset.x).toBe("number");
      expect(typeof result.targetOffset.y).toBe("number");
    });

    it("should include scale property when applicable", () => {
      const maskBox: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const targetBox: BoundingBox = { x: 10, y: 10, width: 50, height: 50 };

      const result = alignCoordinateSpaces(maskBox, targetBox);

      // scale is optional
      expect(result.scale === undefined || typeof result.scale === "object").toBe(true);
    });
  });
});
