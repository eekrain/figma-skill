/**
 * Unit tests for images/mask-detector module
 *
 * Tests mask relationship detection with bounding boxes for image compositing
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  boxesIntersect,
  calculateBoundingBoxArea,
  calculateIntersection,
  calculateUnion,
  detectMaskRelationships,
  extractBoundingBox,
  getBoundingBoxCenter,
  isValidBoundingBox,
  type BoundingBox,
  type MaskRelationship,
} from "@/images/mask-detector";

describe("images/mask-detector", () => {
  // =====================================================
  // Test Suite 1: detectMaskRelationships - Basic Detection
  // =====================================================
  describe("detectMaskRelationships - basic detection", () => {
    it("should detect single isMask node masking subsequent siblings", () => {
      const parent = createParentWithBounds([
        createMaskNodeWithBounds("mask-1", "ALPHA", 0, 0, 100, 100),
        createTargetNodeWithBounds("target-1", 10, 10, 80, 80),
        createTargetNodeWithBounds("target-2", 20, 20, 60, 60),
      ]);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(2);
      expect(relationships[0].maskNodeId).toBe("mask-1");
      expect(relationships[0].targetNodeId).toBe("target-1");
      expect(relationships[0].maskType).toBe("ALPHA");
    });

    it("should return empty array when no masks present", () => {
      const parent = createParentWithBounds([
        createTargetNodeWithBounds("target-1", 0, 0, 100, 100),
        createTargetNodeWithBounds("target-2", 10, 10, 80, 80),
      ]);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });

    it("should handle parent with no children", () => {
      const parent = createParentWithBounds([]);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });
  });

  // =====================================================
  // Test Suite 2: detectMaskRelationships - Bounding Boxes
  // =====================================================
  describe("detectMaskRelationships - bounding boxes", () => {
    it("should include bounding boxes in relationships", () => {
      const parent = createParentWithBounds([
        createMaskNodeWithBounds("mask-1", "VECTOR", 0, 0, 100, 100),
        createTargetNodeWithBounds("target-1", 10, 10, 50, 50),
      ]);

      const relationships = detectMaskRelationships(parent);

      const rel = relationships[0] as MaskRelationship;

      expect(rel.maskBoundingBox).toEqual({ x: 0, y: 0, width: 100, height: 100 });
      expect(rel.targetBoundingBox).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    });

    it("should handle nodes without bounding boxes", () => {
      const parent = {
        id: "parent",
        name: "Parent",
        type: "FRAME",
        children: [
          {
            id: "mask-1",
            name: "Mask",
            type: "VECTOR",
            isMask: true,
            maskType: "ALPHA",
            // No absoluteBoundingBox
          },
          {
            id: "target-1",
            name: "Target",
            type: "FRAME",
            // No absoluteBoundingBox
          },
        ],
      } as unknown as Node;

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].maskBoundingBox).toBeUndefined();
      expect(relationships[0].targetBoundingBox).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 3: detectMaskRelationships - Multiple Masks
  // =====================================================
  describe("detectMaskRelationships - multiple masks", () => {
    it("should detect multiple masks in same parent", () => {
      const parent = createParentWithBounds([
        createMaskNodeWithBounds("mask-1", "ALPHA", 0, 0, 100, 100),
        createTargetNodeWithBounds("target-1", 10, 10, 50, 50),
        createTargetNodeWithBounds("target-2", 20, 20, 40, 40),
        createMaskNodeWithBounds("mask-2", "VECTOR", 50, 50, 100, 100),
        createTargetNodeWithBounds("target-3", 60, 60, 50, 50),
      ]);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(3);
      // First mask masks target-1 and target-2
      expect(relationships[0].maskNodeId).toBe("mask-1");
      expect(relationships[1].maskNodeId).toBe("mask-1");
      // Second mask masks target-3
      expect(relationships[2].maskNodeId).toBe("mask-2");
    });

    it("should stop masking when another mask is encountered", () => {
      const parent = createParentWithBounds([
        createMaskNodeWithBounds("mask-1", "ALPHA", 0, 0, 100, 100),
        createTargetNodeWithBounds("target-1", 10, 10, 50, 50),
        createMaskNodeWithBounds("mask-2", "VECTOR", 50, 50, 100, 100),
        createTargetNodeWithBounds("target-2", 60, 60, 50, 50),
      ]);

      const relationships = detectMaskRelationships(parent);

      const mask1Targets = relationships.filter((r) => r.maskNodeId === "mask-1");
      expect(mask1Targets).toHaveLength(1);
      expect(mask1Targets[0].targetNodeId).toBe("target-1");
    });
  });

  // =====================================================
  // Test Suite 4: extractBoundingBox
  // =====================================================
  describe("extractBoundingBox", () => {
    it("should extract bounding box from node with absoluteBoundingBox", () => {
      const node = createTargetNodeWithBounds("test", 10, 20, 100, 200);

      const box = extractBoundingBox(node);

      expect(box).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    });

    it("should return undefined for node without bounding box", () => {
      const node = {
        id: "no-box",
        name: "No Box",
        type: "FRAME",
      } as Node;

      const box = extractBoundingBox(node);

      expect(box).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 5: calculateIntersection
  // =====================================================
  describe("calculateIntersection", () => {
    it("should calculate intersection of overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection).toEqual({ x: 50, y: 50, width: 50, height: 50 });
    });

    it("should calculate intersection of partially overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 25, y: 25, width: 50, height: 50 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection).toEqual({ x: 25, y: 25, width: 50, height: 50 });
    });

    it("should return zero-width box for non-overlapping horizontal boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 100, y: 0, width: 50, height: 50 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection.width).toBe(0);
    });

    it("should return zero-height box for non-overlapping vertical boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 0, y: 100, width: 50, height: 50 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection.height).toBe(0);
    });

    it("should handle completely contained boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 25, y: 25, width: 25, height: 25 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection).toEqual(box2);
    });

    it("should handle identical boxes", () => {
      const box1: BoundingBox = { x: 10, y: 20, width: 100, height: 200 };
      const box2: BoundingBox = { x: 10, y: 20, width: 100, height: 200 };

      const intersection = calculateIntersection(box1, box2);

      expect(intersection).toEqual(box1);
    });
  });

  // =====================================================
  // Test Suite 6: boxesIntersect
  // =====================================================
  describe("boxesIntersect", () => {
    it("should return true for overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
      const box2: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };

      expect(boxesIntersect(box1, box2)).toBe(true);
    });

    it("should return false for non-overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 100, y: 100, width: 50, height: 50 };

      expect(boxesIntersect(box1, box2)).toBe(false);
    });

    it("should return false for touching boxes (edge case)", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 50, y: 0, width: 50, height: 50 };

      expect(boxesIntersect(box1, box2)).toBe(false);
    });

    it("should return true for boxes that share only a corner", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 49, y: 49, width: 50, height: 50 };

      expect(boxesIntersect(box1, box2)).toBe(true);
    });
  });

  // =====================================================
  // Test Suite 7: calculateUnion
  // =====================================================
  describe("calculateUnion", () => {
    it("should calculate union of two boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 25, y: 25, width: 50, height: 50 };

      const union = calculateUnion(box1, box2);

      expect(union).toEqual({ x: 0, y: 0, width: 75, height: 75 });
    });

    it("should calculate union of non-overlapping boxes", () => {
      const box1: BoundingBox = { x: 0, y: 0, width: 50, height: 50 };
      const box2: BoundingBox = { x: 100, y: 0, width: 50, height: 50 };

      const union = calculateUnion(box1, box2);

      expect(union).toEqual({ x: 0, y: 0, width: 150, height: 50 });
    });

    it("should handle identical boxes", () => {
      const box1: BoundingBox = { x: 10, y: 20, width: 100, height: 200 };
      const box2: BoundingBox = { x: 10, y: 20, width: 100, height: 200 };

      const union = calculateUnion(box1, box2);

      expect(union).toEqual(box1);
    });
  });

  // =====================================================
  // Test Suite 8: isValidBoundingBox
  // =====================================================
  describe("isValidBoundingBox", () => {
    it("should return true for valid boxes", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      expect(isValidBoundingBox(box)).toBe(true);
    });

    it("should return false for zero width", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 0, height: 100 };

      expect(isValidBoundingBox(box)).toBe(false);
    });

    it("should return false for zero height", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 0 };

      expect(isValidBoundingBox(box)).toBe(false);
    });

    it("should return false for negative width", () => {
      const box: BoundingBox = { x: 0, y: 0, width: -10, height: 100 };

      expect(isValidBoundingBox(box)).toBe(false);
    });

    it("should return false for negative height", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: -10 };

      expect(isValidBoundingBox(box)).toBe(false);
    });
  });

  // =====================================================
  // Test Suite 9: getBoundingBoxCenter
  // =====================================================
  describe("getBoundingBoxCenter", () => {
    it("should calculate center of box", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };

      const center = getBoundingBoxCenter(box);

      expect(center).toEqual({ x: 50, y: 50 });
    });

    it("should calculate center of offset box", () => {
      const box: BoundingBox = { x: 10, y: 20, width: 100, height: 200 };

      const center = getBoundingBoxCenter(box);

      expect(center).toEqual({ x: 60, y: 120 });
    });

    it("should handle odd dimensions", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 99, height: 101 };

      const center = getBoundingBoxCenter(box);

      expect(center.x).toBe(49.5);
      expect(center.y).toBe(50.5);
    });
  });

  // =====================================================
  // Test Suite 10: calculateBoundingBoxArea
  // =====================================================
  describe("calculateBoundingBoxArea", () => {
    it("should calculate area of box", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 100, height: 50 };

      const area = calculateBoundingBoxArea(box);

      expect(area).toBe(5000);
    });

    it("should calculate area of square", () => {
      const box: BoundingBox = { x: 10, y: 20, width: 75, height: 75 };

      const area = calculateBoundingBoxArea(box);

      expect(area).toBe(5625);
    });

    it("should return zero for zero dimensions", () => {
      const box: BoundingBox = { x: 0, y: 0, width: 0, height: 100 };

      const area = calculateBoundingBoxArea(box);

      expect(area).toBe(0);
    });
  });
});

// =====================================================
// Helper Functions
// =====================================================

function createParentWithBounds(children: Node[]): Node {
  return {
    id: "parent",
    name: "Parent",
    type: "FRAME",
    children,
  } as unknown as Node;
}

function createMaskNodeWithBounds(
  id: string,
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE",
  x: number,
  y: number,
  width: number,
  height: number
): Node {
  return {
    id,
    name: `Mask ${maskType}`,
    type: "VECTOR",
    isMask: true,
    maskType,
    absoluteBoundingBox: { x, y, width, height },
  } as unknown as Node;
}

function createTargetNodeWithBounds(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): Node {
  return {
    id,
    name: `Target ${id}`,
    type: "FRAME",
    isMask: false,
    absoluteBoundingBox: { x, y, width, height },
  } as unknown as Node;
}
