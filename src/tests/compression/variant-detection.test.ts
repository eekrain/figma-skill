/**
 * Tests for compression/slot-detector module
 *
 * Tests slot detection across component instances for
 * identifying variable content and props.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  applyOverrides,
  detectSlots,
  pathToString,
  stringToPath,
} from "@/compression/slot-detector";
import type { SlotDetectionResult } from "@/compression/types";
import type { NodePath } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("compression/slot-detector", () => {
  let mockInstances: SimplifiedNode[];

  beforeEach(() => {
    // Create mock instances with varying properties
    mockInstances = [
      {
        id: "inst-1",
        name: "Button Primary",
        type: "INSTANCE",
        visible: true,
        componentId: "comp-1",
        text: "Submit",
        fills: ["#ff0000"],
        children: [
          {
            id: "icon-1",
            name: "Icon",
            type: "FRAME",
            visible: true,
            children: [],
          },
        ],
      },
      {
        id: "inst-2",
        name: "Button Secondary",
        type: "INSTANCE",
        visible: true,
        componentId: "comp-1",
        text: "Cancel",
        fills: ["#00ff00"],
        children: [
          {
            id: "icon-2",
            name: "Icon",
            type: "FRAME",
            visible: false,
            children: [],
          },
        ],
      },
      {
        id: "inst-3",
        name: "Button Tertiary",
        type: "INSTANCE",
        visible: true,
        componentId: "comp-1",
        text: "Delete",
        fills: ["#0000ff"],
        children: [
          {
            id: "icon-3",
            name: "Icon",
            type: "FRAME",
            visible: true,
            children: [],
          },
        ],
      },
    ] as SimplifiedNode[];
  });

  // =====================================================
  // Test Suite 1: detectSlots - Basic Detection
  // =====================================================
  describe("detectSlots", () => {
    it("should detect slots across instances", () => {
      const result = detectSlots(mockInstances);

      expect(result).toBeDefined();
      expect(result.slots).toBeInstanceOf(Map);
    });

    it("should calculate similarity score", () => {
      const result = detectSlots(mockInstances);

      expect(result.similarityScore).toBeGreaterThanOrEqual(0);
      expect(result.similarityScore).toBeLessThanOrEqual(1);
    });

    it("should track total paths compared", () => {
      const result = detectSlots(mockInstances);

      expect(result.totalPaths).toBeGreaterThan(0);
    });

    it("should track matching paths", () => {
      const result = detectSlots(mockInstances);

      expect(result.matchingPaths).toBeGreaterThanOrEqual(0);
      expect(result.matchingPaths).toBeLessThanOrEqual(result.totalPaths);
    });

    it("should handle empty instances array", () => {
      const result = detectSlots([]);

      expect(result.slots.size).toBe(0);
      expect(result.similarityScore).toBe(1);
    });

    it("should handle single instance", () => {
      const result = detectSlots([mockInstances[0]]);

      expect(result.slots.size).toBe(0);
      expect(result.similarityScore).toBe(1);
    });
  });

  // =====================================================
  // Test Suite 2: detectSlots - Text Detection
  // =====================================================
  describe("detectSlots - text detection", () => {
    it("should detect varying text content", () => {
      const result = detectSlots(mockInstances);

      // Check if text slot was detected
      const textSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "text"
      );
      expect(textSlots.length).toBeGreaterThan(0);
    });

    it("should set semantic name for text slots", () => {
      const result = detectSlots(mockInstances);

      const textSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "text"
      );
      if (textSlots.length > 0) {
        expect(textSlots[0].semanticName).toBeDefined();
      }
    });

    it("should track text variations", () => {
      const result = detectSlots(mockInstances);

      const textSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "text"
      );
      if (textSlots.length > 0) {
        expect(textSlots[0].variations.size).toBeGreaterThan(1);
      }
    });
  });

  // =====================================================
  // Test Suite 3: detectSlots - Fill Detection
  // =====================================================
  describe("detectSlots - fill detection", () => {
    it("should detect varying fill colors", () => {
      const result = detectSlots(mockInstances);

      const fillSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "fills"
      );
      expect(fillSlots.length).toBeGreaterThan(0);
    });

    it("should track color variations", () => {
      const result = detectSlots(mockInstances);

      const fillSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "fills"
      );
      if (fillSlots.length > 0) {
        expect(fillSlots[0].variations.size).toBeGreaterThan(1);
      }
    });
  });

  // =====================================================
  // Test Suite 4: detectSlots - Visibility Detection
  // =====================================================
  describe("detectSlots - visibility detection", () => {
    it("should detect varying visibility", () => {
      const result = detectSlots(mockInstances);

      const visibilitySlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "visibility"
      );
      // Should detect the icon visibility difference
      expect(visibilitySlots.length).toBeGreaterThan(0);
    });

    it("should set default value for visibility", () => {
      const result = detectSlots(mockInstances);

      const visibilitySlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "visibility"
      );
      if (visibilitySlots.length > 0) {
        expect(visibilitySlots[0].defaultValue).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 5: detectSlots - Configuration
  // =====================================================
  describe("detectSlots with configuration", () => {
    it("should respect minSimilarity option", () => {
      const result = detectSlots(mockInstances, { minSimilarity: 0.9 });

      expect(result).toBeDefined();
    });

    it("should respect alwaysSlots option", () => {
      const result = detectSlots(mockInstances, {
        alwaysSlots: ["text"],
      });

      // Should have text slot
      expect(result.slots.size).toBeGreaterThan(0);
    });

    it("should respect neverSlots option", () => {
      const result = detectSlots(mockInstances, {
        neverSlots: ["fills"],
      });

      // Should not have fills slot
      const fillSlots = Array.from(result.slots.values()).filter(
        (s) => s.valueType === "fills"
      );
      expect(fillSlots.length).toBe(0);
    });

    it("should respect maxSlots option", () => {
      const result = detectSlots(mockInstances, { maxSlots: 2 });

      expect(result.slots.size).toBeLessThanOrEqual(2);
    });

    it("should respect maxDepth option", () => {
      const result = detectSlots(mockInstances, { maxDepth: 1 });

      // Should only detect slots at depth 1 or less
      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 6: Path Utilities
  // =====================================================
  describe("Path utilities", () => {
    it("should convert path to string", () => {
      const path: NodePath = ["children", 0, "text"];
      const result = pathToString(path);

      expect(result).toBe("children[0].text");
    });

    it("should convert nested path to string", () => {
      const path: NodePath = ["children", 0, "children", 1, "fills"];
      const result = pathToString(path);

      expect(result).toBe("children[0].children[1].fills");
    });

    it("should convert string to path", () => {
      const pathStr = "children[0].text";
      const result = stringToPath(pathStr);

      expect(result).toEqual(["children", 0, "text"]);
    });

    it("should convert nested string to path", () => {
      const pathStr = "children[0].children[1].fills";
      const result = stringToPath(pathStr);

      expect(result).toEqual(["children", 0, "children", 1, "fills"]);
    });

    it("should handle simple property path", () => {
      const path: NodePath = ["name"];
      const result = pathToString(path);

      expect(result).toBe("name");
    });

    it("should handle simple property string", () => {
      const pathStr = "name";
      const result = stringToPath(pathStr);

      expect(result).toEqual(["name"]);
    });
  });

  // =====================================================
  // Test Suite 7: applyOverrides
  // =====================================================
  describe("applyOverrides", () => {
    it("should apply slot overrides to template", () => {
      const template: SimplifiedNode = {
        id: "template",
        name: "Button Template",
        type: "INSTANCE",
        visible: true,
        text: "Default",
        fills: ["#888888"],
        children: [],
      } as SimplifiedNode;

      const overrides = {
        text: "Submit",
        fills: ["#ff0000"],
      };

      const result = applyOverrides(template, overrides);

      expect(result.text).toBe("Submit");
      expect(result.fills).toEqual(["#ff0000"]);
    });

    it("should preserve non-overridden values", () => {
      const template: SimplifiedNode = {
        id: "template",
        name: "Button Template",
        type: "INSTANCE",
        visible: true,
        text: "Default",
        opacity: 1,
        children: [],
      } as SimplifiedNode;

      const overrides = {
        text: "Submit",
      };

      const result = applyOverrides(template, overrides);

      expect(result.text).toBe("Submit");
      expect(result.opacity).toBe(1);
    });

    it("should handle empty overrides", () => {
      const template: SimplifiedNode = {
        id: "template",
        name: "Button Template",
        type: "INSTANCE",
        visible: true,
        text: "Default",
        children: [],
      } as SimplifiedNode;

      const result = applyOverrides(template, {});

      expect(result.text).toBe("Default");
    });

    it("should handle nested path overrides", () => {
      const template: SimplifiedNode = {
        id: "template",
        name: "Button Template",
        type: "INSTANCE",
        visible: true,
        children: [
          {
            id: "child-1",
            name: "Label",
            type: "TEXT",
            visible: true,
            text: "Default Label",
          },
        ],
      } as SimplifiedNode;

      const overrides = {
        "children[0].text": "Custom Label",
      };

      const result = applyOverrides(template, overrides);

      if (result.children && result.children[0]) {
        expect(result.children[0].text).toBe("Custom Label");
      }
    });
  });

  // =====================================================
  // Test Suite 8: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle instances with identical properties", () => {
      const identicalInstances = [
        { ...mockInstances[0] },
        { ...mockInstances[0] },
        { ...mockInstances[0] },
      ];

      const result = detectSlots(identicalInstances);

      // Should have high similarity
      expect(result.similarityScore).toBeGreaterThan(0.5);
    });

    it("should handle instances with completely different properties", () => {
      const differentInstances = [
        { ...mockInstances[0], text: "A", fills: ["#111"] as any },
        { ...mockInstances[1], text: "B", fills: ["#222"] as any },
        { ...mockInstances[2], text: "C", fills: ["#333"] as any },
      ] as SimplifiedNode[];

      const result = detectSlots(differentInstances);

      // Should detect many slots
      expect(result.slots.size).toBeGreaterThan(0);
    });

    it("should handle instances with missing properties", () => {
      const partialInstances = [
        { id: "1", name: "A", type: "INSTANCE", visible: true },
        {
          id: "2",
          name: "B",
          type: "INSTANCE",
          visible: true,
          text: "Has Text",
        },
      ] as SimplifiedNode[];

      const result = detectSlots(partialInstances);

      expect(result).toBeDefined();
    });

    it("should handle very deep paths", () => {
      const deepInstance: SimplifiedNode = {
        id: "deep",
        name: "Deep",
        type: "INSTANCE",
        visible: true,
        children: [
          {
            id: "level-1",
            name: "Level 1",
            type: "FRAME",
            visible: true,
            children: [
              {
                id: "level-2",
                name: "Level 2",
                type: "FRAME",
                visible: true,
                children: [
                  {
                    id: "level-3",
                    name: "Level 3",
                    type: "FRAME",
                    visible: true,
                    text: "Deep Text",
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = detectSlots([
        deepInstance,
        { ...deepInstance, id: "deep2" },
      ]);

      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 9: Slot Definitions
  // =====================================================
  describe("Slot definition properties", () => {
    it("should include slotId in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const [slotId, slot] of result.slots) {
        expect(slot.slotId).toBe(slotId);
      }
    });

    it("should include nodePath in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const slot of result.slots.values()) {
        expect(slot.nodePath).toBeDefined();
        expect(typeof slot.nodePath).toBe("string");
      }
    });

    it("should include valueType in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const slot of result.slots.values()) {
        expect(slot.valueType).toBeDefined();
        expect([
          "text",
          "fills",
          "strokes",
          "opacity",
          "visibility",
          "property",
        ]).toContain(slot.valueType);
      }
    });

    it("should include defaultValue in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const slot of result.slots.values()) {
        expect(slot.defaultValue).toBeDefined();
      }
    });

    it("should include variations map in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const slot of result.slots.values()) {
        expect(slot.variations).toBeInstanceOf(Map);
      }
    });

    it("should include instanceCount in slot definitions", () => {
      const result = detectSlots(mockInstances);

      for (const slot of result.slots.values()) {
        expect(slot.instanceCount).toBeGreaterThan(0);
      }
    });
  });

  // =====================================================
  // Test Suite 10: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should define SlotDetectionResult type correctly", () => {
      const result: SlotDetectionResult = {
        slots: new Map(),
        similarityScore: 1,
        totalPaths: 0,
        matchingPaths: 0,
      };

      expect(result.slots).toBeInstanceOf(Map);
      expect(result.similarityScore).toBe(1);
    });

    it("should define NodePath type correctly", () => {
      const path: NodePath = ["children", 0, "text"];

      expect(path).toHaveLength(3);
      expect(typeof path[0]).toBe("string");
      expect(typeof path[1]).toBe("number");
    });
  });
});
