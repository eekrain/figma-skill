/**
 * Unit tests for transformers/mask module
 *
 * Tests mask transformer for extracting mask information from Figma nodes
 *
 * TDD Pattern: RED (failing tests) -> GREEN (implementation) -> REFACTOR
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  type MaskRelationship,
  type SimplifiedMask,
  buildSimplifiedMask,
  detectMaskRelationships,
} from "@/transformers/mask";
import {
  createEllipseNode,
  createMaskNode,
  createMaskedGroup,
  createMaskedInstance,
  createMaskedParent,
  createMultipleMaskParent,
  createNestedMaskStructure,
  createNoMaskParent,
  createNonMaskNode,
  createRectangleNode,
  createVectorNode,
} from "@/tests/fixtures/nodes";

describe("transformers/mask", () => {
  // =====================================================
  // Test Suite 1: buildSimplifiedMask - Basic Detection
  // =====================================================
  describe("buildSimplifiedMask - basic mask detection", () => {
    it("should detect isMask: true on a mask node", () => {
      const maskNode = createMaskNode("mask-1", "ALPHA");

      const result = buildSimplifiedMask(maskNode);

      expect(result.isMask).toBe(true);
    });

    it("should detect isMask: false on a non-mask node", () => {
      const nonMaskNode = createNonMaskNode("regular-1");

      const result = buildSimplifiedMask(nonMaskNode);

      expect(result.isMask).toBe(false);
    });

    it("should default isMask to false when property is missing", () => {
      const nodeWithoutMask = createNonMaskNode("no-mask-prop", {
        // isMask intentionally omitted
      } as Partial<Node>);

      const result = buildSimplifiedMask(nodeWithoutMask);

      expect(result.isMask).toBe(false);
    });

    it("should handle undefined node gracefully", () => {
      const result = buildSimplifiedMask(undefined as unknown as Node);

      expect(result).toBeDefined();
      expect(result.isMask).toBe(false);
    });
  });

  // =====================================================
  // Test Suite 2: buildSimplifiedMask - Mask Type Detection
  // =====================================================
  describe("buildSimplifiedMask - mask type detection", () => {
    it("should detect ALPHA mask type", () => {
      const alphaMask = createMaskNode("alpha-mask", "ALPHA");

      const result = buildSimplifiedMask(alphaMask);

      expect(result.maskType).toBe("ALPHA");
    });

    it("should detect VECTOR mask type", () => {
      const vectorMask = createMaskNode("vector-mask", "VECTOR");

      const result = buildSimplifiedMask(vectorMask);

      expect(result.maskType).toBe("VECTOR");
    });

    it("should detect LUMINANCE mask type", () => {
      const luminanceMask = createMaskNode("luminance-mask", "LUMINANCE");

      const result = buildSimplifiedMask(luminanceMask);

      expect(result.maskType).toBe("LUMINANCE");
    });

    it("should default maskType to undefined when not specified", () => {
      const maskWithoutType = createMaskNode("mask-no-type", "ALPHA", {
        maskType: undefined as unknown as "ALPHA",
      });

      const result = buildSimplifiedMask(maskWithoutType);

      expect(result.maskType).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 3: buildSimplifiedMask - Mask ID Detection
  // =====================================================
  describe("buildSimplifiedMask - mask ID detection", () => {
    it("should not set maskId for non-mask nodes", () => {
      const nonMaskNode = createNonMaskNode("non-mask");

      const result = buildSimplifiedMask(nonMaskNode);

      expect(result.maskId).toBeUndefined();
    });

    it("should not set maskId for mask nodes (masks don't mask themselves)", () => {
      const maskNode = createMaskNode("mask-node", "ALPHA");

      const result = buildSimplifiedMask(maskNode);

      expect(result.maskId).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 4: buildSimplifiedMask - Different Node Types
  // =====================================================
  describe("buildSimplifiedMask - different node types as masks", () => {
    it("should handle VECTOR nodes as masks", () => {
      const vectorMask = createVectorNode("vector-1", { isMask: true, maskType: "VECTOR" });

      const result = buildSimplifiedMask(vectorMask);

      expect(result.isMask).toBe(true);
      expect(result.maskType).toBe("VECTOR");
    });

    it("should handle ELLIPSE nodes as masks", () => {
      const ellipseMask = createEllipseNode("ellipse-1", true);

      const result = buildSimplifiedMask(ellipseMask);

      expect(result.isMask).toBe(true);
    });

    it("should handle RECTANGLE nodes as masks", () => {
      const rectMask = createRectangleNode("rect-1", true);

      const result = buildSimplifiedMask(rectMask);

      expect(result.isMask).toBe(true);
    });

    it("should handle FRAME nodes as masks", () => {
      const frameMask = createNonMaskNode("frame-1", {
        type: "FRAME",
        isMask: true,
        maskType: "ALPHA",
      } as unknown as Node);

      const result = buildSimplifiedMask(frameMask);

      expect(result.isMask).toBe(true);
    });
  });

  // =====================================================
  // Test Suite 5: buildSimplifiedMask - Return Type
  // =====================================================
  describe("buildSimplifiedMask - return type", () => {
    it("should return SimplifiedMask type", () => {
      const maskNode = createMaskNode("mask-1", "ALPHA");

      const result: SimplifiedMask = buildSimplifiedMask(maskNode);

      expect(result).toBeDefined();
      expect(typeof result.isMask).toBe("boolean");
    });

    it("should only include maskType when isMask is true", () => {
      const maskNode = createMaskNode("mask-1", "VECTOR");

      const result = buildSimplifiedMask(maskNode);

      if (result.isMask) {
        expect(result.maskType).toBeDefined();
      } else {
        expect(result.maskType).toBeUndefined();
      }
    });

    it("should not include optional properties when not applicable", () => {
      const nonMaskNode = createNonMaskNode("non-mask");

      const result = buildSimplifiedMask(nonMaskNode);

      expect(result.isMask).toBe(false);
      expect(result.maskType).toBeUndefined();
      expect(result.maskId).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 6: detectMaskRelationships - Sibling Stencil Model
  // =====================================================
  describe("detectMaskRelationships - sibling stencil model", () => {
    it("should detect single isMask node masking subsequent siblings", () => {
      const parent = createMaskedParent("ALPHA", 2);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(2);
      expect(relationships[0].maskNodeId).toBe("mask-1");
      expect(relationships[0].targetNodeId).toBe("target-1");
      expect(relationships[0].maskType).toBe("ALPHA");
      expect(relationships[1].targetNodeId).toBe("target-2");
    });

    it("should detect multiple masks in same parent", () => {
      const parent = createMultipleMaskParent();

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(3);
      // First mask (ALPHA) masks target-1 and target-2
      expect(relationships[0].maskNodeId).toBe("mask-1");
      expect(relationships[0].targetNodeId).toBe("target-1");
      expect(relationships[1].maskNodeId).toBe("mask-1");
      expect(relationships[1].targetNodeId).toBe("target-2");
      // Second mask (VECTOR) masks target-3
      expect(relationships[2].maskNodeId).toBe("mask-2");
      expect(relationships[2].targetNodeId).toBe("target-3");
    });

    it("should return empty array when no masks present", () => {
      const parent = createNoMaskParent();

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });

    it("should return empty array for parent with no children", () => {
      const parent = createNonMaskNode("empty-parent", {
        type: "FRAME",
        children: [],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });

    it("should handle parent with undefined children", () => {
      const parent = createNonMaskNode("undefined-children", {
        type: "FRAME",
        children: undefined as unknown as [],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });

    it("should correctly identify maskType from Figma node", () => {
      const parent = createMaskedParent("VECTOR", 1);

      const relationships = detectMaskRelationships(parent);

      expect(relationships[0].maskType).toBe("VECTOR");
    });
  });

  // =====================================================
  // Test Suite 7: detectMaskRelationships - Different Parent Types
  // =====================================================
  describe("detectMaskRelationships - different parent types", () => {
    it("should detect masks in FRAME nodes", () => {
      const frameParent = createMaskedParent("ALPHA", 2);

      const relationships = detectMaskRelationships(frameParent);

      expect(relationships).toHaveLength(2);
    });

    it("should detect masks in GROUP nodes", () => {
      const groupParent = createMaskedGroup("ALPHA");

      const relationships = detectMaskRelationships(groupParent);

      expect(relationships).toHaveLength(2);
    });

    it("should detect masks in INSTANCE nodes", () => {
      const instanceParent = createMaskedInstance("VECTOR");

      const relationships = detectMaskRelationships(instanceParent);

      expect(relationships).toHaveLength(1);
    });

    it("should return empty for non-container nodes", () => {
      const textNode = createNonMaskNode("text-node", {
        type: "TEXT",
      } as unknown as Node);

      const relationships = detectMaskRelationships(textNode);

      expect(relationships).toEqual([]);
    });
  });

  // =====================================================
  // Test Suite 8: detectMaskRelationships - Mask Stopping
  // =====================================================
  describe("detectMaskRelationships - mask stopping behavior", () => {
    it("should stop masking when another mask is encountered", () => {
      const parent = createMultipleMaskParent();

      const relationships = detectMaskRelationships(parent);

      // First mask should not mask the second mask or targets after second mask
      const firstMaskTargets = relationships
        .filter((r) => r.maskNodeId === "mask-1")
        .map((r) => r.targetNodeId);

      expect(firstMaskTargets).not.toContain("mask-2");
      expect(firstMaskTargets).not.toContain("target-3");
    });

    it("should handle masks at the end of children (no targets)", () => {
      const parent = createNonMaskNode("mask-at-end", {
        type: "FRAME",
        children: [
          createNonMaskNode("child-1"),
          createNonMaskNode("child-2"),
          createMaskNode("mask-1", "ALPHA"),
        ],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      // Mask at end has no targets
      const maskRelationships = relationships.filter((r) => r.maskNodeId === "mask-1");
      expect(maskRelationships).toHaveLength(0);
    });

    it("should handle mask as only child", () => {
      const parent = createNonMaskNode("only-mask", {
        type: "FRAME",
        children: [createMaskNode("mask-1", "ALPHA")],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toHaveLength(0);
    });
  });

  // =====================================================
  // Test Suite 9: detectMaskRelationships - Nested Masks
  // =====================================================
  describe("detectMaskRelationships - nested structures", () => {
    it("should detect masks in nested structures (1 level)", () => {
      const nested = createNestedMaskStructure();

      const relationships = detectMaskRelationships(nested);

      // Outer mask: outer-mask masks outer-target-1 and nested-parent
      const outerMaskRels = relationships.filter((r) => r.maskNodeId === "outer-mask");
      expect(outerMaskRels.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle multiple nested mask groups separately", () => {
      const parent = createNonMaskNode("root", {
        type: "FRAME",
        children: [
          createMaskNode("mask-1", "ALPHA"),
          createNonMaskNode("target-1"),
          {
            id: "nested-group",
            name: "Nested",
            type: "GROUP",
            children: [
              createMaskNode("mask-2", "VECTOR"),
              createNonMaskNode("target-2"),
            ],
          } as unknown as Node,
        ],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      // Should detect masks at both levels
      expect(relationships.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 10: detectMaskRelationships - Edge Cases
  // =====================================================
  describe("detectMaskRelationships - edge cases", () => {
    it("should handle null children", () => {
      const parent = createNonMaskNode("null-children", {
        type: "FRAME",
        children: null as unknown as [],
      });

      const relationships = detectMaskRelationships(parent);

      expect(relationships).toEqual([]);
    });

    it("should handle children without id property", () => {
      const parent = createNonMaskNode("no-id-children", {
        type: "FRAME",
        children: [
          { name: "No ID", isMask: true, type: "VECTOR" },
          { name: "Target", isMask: false, type: "FRAME" },
        ] as unknown as Node[],
      } as unknown as Node);

      // Should handle gracefully - either skip or use placeholder
      const relationships = detectMaskRelationships(parent);

      expect(relationships).toBeDefined();
    });

    it("should handle mixed masked and non-masked children", () => {
      const parent = createNonMaskNode("mixed-children", {
        type: "FRAME",
        children: [
          createNonMaskNode("regular-1"),
          createMaskNode("mask-1", "ALPHA"),
          createNonMaskNode("target-1"),
          createNonMaskNode("target-2"),
          createMaskNode("mask-2", "VECTOR"),
          createNonMaskNode("regular-2"),
          createNonMaskNode("target-3"),
        ],
      } as unknown as Node);

      const relationships = detectMaskRelationships(parent);

      // mask-1 should only mask target-1 and target-2
      const mask1Targets = relationships
        .filter((r) => r.maskNodeId === "mask-1")
        .map((r) => r.targetNodeId);

      expect(mask1Targets).toContain("target-1");
      expect(mask1Targets).toContain("target-2");
      expect(mask1Targets).not.toContain("regular-1");
      expect(mask1Targets).not.toContain("mask-2");

      // mask-2 should only mask regular-2 and target-3
      const mask2Targets = relationships
        .filter((r) => r.maskNodeId === "mask-2")
        .map((r) => r.targetNodeId);

      expect(mask2Targets).toContain("regular-2");
      expect(mask2Targets).toContain("target-3");
    });

    it("should handle LUMINANCE mask type", () => {
      const parent = createMaskedParent("LUMINANCE", 2);

      const relationships = detectMaskRelationships(parent);

      expect(relationships[0].maskType).toBe("LUMINANCE");
    });
  });

  // =====================================================
  // Test Suite 11: MaskRelationship Type Validation
  // =====================================================
  describe("MaskRelationship type validation", () => {
    it("should return relationships with valid structure", () => {
      const parent = createMaskedParent("ALPHA", 1);

      const relationships = detectMaskRelationships(parent);

      const rel = relationships[0] as MaskRelationship;

      expect(rel).toHaveProperty("targetNodeId");
      expect(rel).toHaveProperty("maskNodeId");
      expect(rel).toHaveProperty("maskType");
      expect(typeof rel.targetNodeId).toBe("string");
      expect(typeof rel.maskNodeId).toBe("string");
      expect(["ALPHA", "VECTOR", "LUMINANCE"]).toContain(rel.maskType);
    });

    it("should maintain relationship order (targets in order)", () => {
      const parent = createMaskedParent("ALPHA", 3);

      const relationships = detectMaskRelationships(parent);

      const maskRels = relationships.filter((r) => r.maskNodeId === "mask-1");

      expect(maskRels[0].targetNodeId).toBe("target-1");
      expect(maskRels[1].targetNodeId).toBe("target-2");
      expect(maskRels[2].targetNodeId).toBe("target-3");
    });
  });

  // =====================================================
  // Test Suite 12: SimplifiedMask Type Validation
  // =====================================================
  describe("SimplifiedMask type validation", () => {
    it("should return valid SimplifiedMask for mask nodes", () => {
      const maskNode = createMaskNode("mask-1", "VECTOR");

      const result: SimplifiedMask = buildSimplifiedMask(maskNode);

      expect(result.isMask).toBe(true);
      expect(result.maskType).toBe("VECTOR");
      expect(result.maskId).toBeUndefined();
    });

    it("should return valid SimplifiedMask for non-mask nodes", () => {
      const nonMaskNode = createNonMaskNode("non-mask");

      const result: SimplifiedMask = buildSimplifiedMask(nonMaskNode);

      expect(result.isMask).toBe(false);
      expect(result.maskType).toBeUndefined();
      expect(result.maskId).toBeUndefined();
    });

    it("should handle all mask types", () => {
      const alphaMask = buildSimplifiedMask(createMaskNode("a", "ALPHA"));
      const vectorMask = buildSimplifiedMask(createMaskNode("v", "VECTOR"));
      const luminanceMask = buildSimplifiedMask(createMaskNode("l", "LUMINANCE"));

      expect(alphaMask.maskType).toBe("ALPHA");
      expect(vectorMask.maskType).toBe("VECTOR");
      expect(luminanceMask.maskType).toBe("LUMINANCE");
    });
  });
});
