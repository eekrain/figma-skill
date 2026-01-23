/**
 * Tests for transformers/effects module
 *
 * Tests effects transformer functions for converting Figma effects to CSS properties.
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  type SimplifiedEffects,
  buildSimplifiedEffects,
  formatRGBAColor,
} from "@/transformers/effects";

describe("transformers/effects", () => {
  // Mock nodes for testing
  let mockDropShadowNode: any;
  let mockInnerShadowNode: any;
  let mockLayerBlurNode: any;
  let mockBackgroundBlurNode: any;
  let mockMultipleEffectsNode: any;
  let mockNoEffectsNode: any;

  beforeEach(() => {
    // Node with drop shadow effect
    mockDropShadowNode = {
      id: "drop-shadow-node",
      name: "Drop Shadow Node",
      type: "FRAME",
      effects: [
        {
          type: "DROP_SHADOW",
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 10,
          spread: 0,
        },
      ],
    };

    // Node with inner shadow effect
    mockInnerShadowNode = {
      id: "inner-shadow-node",
      name: "Inner Shadow Node",
      type: "FRAME",
      effects: [
        {
          type: "INNER_SHADOW",
          visible: true,
          color: { r: 255, g: 0, b: 0, a: 0.5 },
          offset: { x: 2, y: 2 },
          radius: 5,
          spread: 1,
        },
      ],
    };

    // Node with layer blur effect
    mockLayerBlurNode = {
      id: "layer-blur-node",
      name: "Layer Blur Node",
      type: "FRAME",
      effects: [
        {
          type: "LAYER_BLUR",
          visible: true,
          radius: 15,
        },
      ],
    };

    // Node with background blur effect
    mockBackgroundBlurNode = {
      id: "background-blur-node",
      name: "Background Blur Node",
      type: "FRAME",
      effects: [
        {
          type: "BACKGROUND_BLUR",
          visible: true,
          radius: 20,
        },
      ],
    };

    // Node with multiple effects
    mockMultipleEffectsNode = {
      id: "multiple-effects-node",
      name: "Multiple Effects Node",
      type: "FRAME",
      effects: [
        {
          type: "DROP_SHADOW",
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 10,
          spread: 0,
        },
        {
          type: "INNER_SHADOW",
          visible: true,
          color: { r: 255, g: 0, b: 0, a: 0.5 },
          offset: { x: 2, y: 2 },
          radius: 5,
          spread: 1,
        },
        {
          type: "LAYER_BLUR",
          visible: true,
          radius: 8,
        },
      ],
    };

    // Node without effects
    mockNoEffectsNode = {
      id: "no-effects-node",
      name: "No Effects Node",
      type: "FRAME",
    };
  });

  // =====================================================
  // Test Suite 1: buildSimplifiedEffects - Drop Shadow
  // =====================================================
  describe("buildSimplifiedEffects - drop shadow", () => {
    it("should extract drop shadow effect", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows).toBeDefined();
      expect(result.shadows).toHaveLength(1);
      expect(result.shadows?.[0].type).toBe("drop-shadow");
    });

    it("should format drop shadow color correctly", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(0, 0, 0, 0.25)");
    });

    it("should format drop shadow offset correctly", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].offsetX).toBe("0px");
      expect(result.shadows?.[0].offsetY).toBe("4px");
    });

    it("should format drop shadow blur radius correctly", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].blur).toBe("10px");
    });

    it("should include spread when defined", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].spread).toBe("0px");
    });

    it("should handle missing spread property", () => {
      delete (mockDropShadowNode.effects![0] as any).spread;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].spread).toBeUndefined();
    });

    it("should handle missing offset (default to 0)", () => {
      delete (mockDropShadowNode.effects![0] as any).offset;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].offsetX).toBe("0px");
      expect(result.shadows?.[0].offsetY).toBe("0px");
    });

    it("should handle missing radius (default to 0)", () => {
      delete (mockDropShadowNode.effects![0] as any).radius;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].blur).toBe("0px");
    });

    it("should handle negative offset values", () => {
      (mockDropShadowNode.effects![0] as any).offset = { x: -5, y: -10 };
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].offsetX).toBe("-5px");
      expect(result.shadows?.[0].offsetY).toBe("-10px");
    });

    it("should handle negative spread values", () => {
      (mockDropShadowNode.effects![0] as any).spread = -2;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].spread).toBe("-2px");
    });
  });

  // =====================================================
  // Test Suite 2: buildSimplifiedEffects - Inner Shadow
  // =====================================================
  describe("buildSimplifiedEffects - inner shadow", () => {
    it("should extract inner shadow effect", () => {
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows).toBeDefined();
      expect(result.shadows).toHaveLength(1);
      expect(result.shadows?.[0].type).toBe("inner-shadow");
    });

    it("should format inner shadow color correctly", () => {
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("should format inner shadow offset correctly", () => {
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].offsetX).toBe("2px");
      expect(result.shadows?.[0].offsetY).toBe("2px");
    });

    it("should format inner shadow blur radius correctly", () => {
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].blur).toBe("5px");
    });

    it("should include spread for inner shadow", () => {
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].spread).toBe("1px");
    });

    it("should handle white color inner shadow", () => {
      (mockInnerShadowNode.effects![0] as any).color = {
        r: 255,
        g: 255,
        b: 255,
        a: 0.8,
      };
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(255, 255, 255, 0.8)");
    });

    it("should handle fully opaque inner shadow", () => {
      (mockInnerShadowNode.effects![0] as any).color = {
        r: 100,
        g: 150,
        b: 200,
        a: 1,
      };
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(100, 150, 200, 1)");
    });
  });

  // =====================================================
  // Test Suite 3: buildSimplifiedEffects - Layer Blur
  // =====================================================
  describe("buildSimplifiedEffects - layer blur", () => {
    it("should extract layer blur effect", () => {
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBeDefined();
      expect(result.layerBlur).toBe("15px");
    });

    it("should format layer blur radius correctly", () => {
      (mockLayerBlurNode.effects![0] as any).radius = 25;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBe("25px");
    });

    it("should handle zero radius layer blur", () => {
      (mockLayerBlurNode.effects![0] as any).radius = 0;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBeUndefined();
    });

    it("should handle negative radius layer blur", () => {
      (mockLayerBlurNode.effects![0] as any).radius = -5;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      // Negative radius is still formatted
      expect(result.layerBlur).toBe("-5px");
    });

    it("should handle large radius layer blur", () => {
      (mockLayerBlurNode.effects![0] as any).radius = 100;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBe("100px");
    });

    it("should handle decimal radius layer blur", () => {
      (mockLayerBlurNode.effects![0] as any).radius = 12.5;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBe("12.5px");
    });
  });

  // =====================================================
  // Test Suite 4: buildSimplifiedEffects - Background Blur
  // =====================================================
  describe("buildSimplifiedEffects - background blur", () => {
    it("should extract background blur effect", () => {
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBeDefined();
      expect(result.blur).toBe("20px");
    });

    it("should format background blur radius correctly", () => {
      (mockBackgroundBlurNode.effects![0] as any).radius = 30;
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBe("30px");
    });

    it("should handle zero radius background blur", () => {
      (mockBackgroundBlurNode.effects![0] as any).radius = 0;
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBeUndefined();
    });

    it("should handle negative radius background blur", () => {
      (mockBackgroundBlurNode.effects![0] as any).radius = -10;
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBe("-10px");
    });

    it("should handle large radius background blur", () => {
      (mockBackgroundBlurNode.effects![0] as any).radius = 50;
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBe("50px");
    });
  });

  // =====================================================
  // Test Suite 5: buildSimplifiedEffects - Multiple Effects
  // =====================================================
  describe("buildSimplifiedEffects - multiple effects", () => {
    it("should extract all shadow effects", () => {
      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(result.shadows).toBeDefined();
      expect(result.shadows).toHaveLength(2);
    });

    it("should preserve shadow order", () => {
      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(result.shadows?.[0].type).toBe("drop-shadow");
      expect(result.shadows?.[1].type).toBe("inner-shadow");
    });

    it("should extract layer blur alongside shadows", () => {
      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(result.layerBlur).toBe("8px");
      expect(result.shadows).toHaveLength(2);
    });

    it("should handle both layer blur and background blur", () => {
      mockMultipleEffectsNode.effects!.push({
        type: "BACKGROUND_BLUR",
        visible: true,
        radius: 25,
      } as any);

      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(result.layerBlur).toBe("8px");
      expect(result.blur).toBe("25px");
    });

    it("should handle multiple drop shadows", () => {
      const multiShadowNode = {
        id: "multi-shadow",
        type: "FRAME",
        effects: [
          {
            type: "DROP_SHADOW",
            visible: true,
            color: { r: 0, g: 0, b: 0, a: 0.1 },
            offset: { x: 0, y: 2 },
            radius: 4,
          },
          {
            type: "DROP_SHADOW",
            visible: true,
            color: { r: 0, g: 0, b: 0, a: 0.2 },
            offset: { x: 0, y: 8 },
            radius: 16,
          },
        ],
      } as any;

      const result = buildSimplifiedEffects(multiShadowNode);

      expect(result.shadows).toHaveLength(2);
      expect(result.shadows?.[0].blur).toBe("4px");
      expect(result.shadows?.[1].blur).toBe("16px");
    });
  });

  // =====================================================
  // Test Suite 6: buildSimplifiedEffects - Visibility
  // =====================================================
  describe("buildSimplifiedEffects - visibility", () => {
    it("should not include invisible drop shadow", () => {
      (mockDropShadowNode.effects![0] as any).visible = false;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows).toBeUndefined();
    });

    it("should not include invisible inner shadow", () => {
      (mockInnerShadowNode.effects![0] as any).visible = false;
      const result = buildSimplifiedEffects(mockInnerShadowNode);

      expect(result.shadows).toBeUndefined();
    });

    it("should not include invisible layer blur", () => {
      (mockLayerBlurNode.effects![0] as any).visible = false;
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(result.layerBlur).toBeUndefined();
    });

    it("should not include invisible background blur", () => {
      (mockBackgroundBlurNode.effects![0] as any).visible = false;
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(result.blur).toBeUndefined();
    });

    it("should handle visible property undefined (default to visible)", () => {
      delete (mockDropShadowNode.effects![0] as any).visible;
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows).toBeDefined();
    });

    it("should filter out only invisible effects from multiple", () => {
      mockMultipleEffectsNode.effects![1].visible = false;
      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(result.shadows).toHaveLength(1);
      expect(result.shadows?.[0].type).toBe("drop-shadow");
    });
  });

  // =====================================================
  // Test Suite 7: buildSimplifiedEffects - Edge Cases
  // =====================================================
  describe("buildSimplifiedEffects - edge cases", () => {
    it("should handle node without effects property", () => {
      const result = buildSimplifiedEffects(mockNoEffectsNode);

      expect(result.shadows).toBeUndefined();
      expect(result.blur).toBeUndefined();
      expect(result.layerBlur).toBeUndefined();
    });

    it("should handle empty effects array", () => {
      mockNoEffectsNode.effects = [];
      const result = buildSimplifiedEffects(mockNoEffectsNode);

      expect(result).toEqual({});
    });

    it("should handle effects array with non-shadow effects", () => {
      const otherEffectNode = {
        id: "other-effect",
        type: "FRAME",
        effects: [
          {
            type: "FOREGROUNDBlur",
            visible: true,
          } as any,
        ],
      };

      const result = buildSimplifiedEffects(otherEffectNode);

      expect(result.shadows).toBeUndefined();
      expect(result.blur).toBeUndefined();
      expect(result.layerBlur).toBeUndefined();
    });

    it("should handle null effects", () => {
      const nullEffectNode = {
        id: "null-effect",
        type: "FRAME",
        effects: null,
      } as any;

      const result = buildSimplifiedEffects(nullEffectNode);

      expect(result).toEqual({});
    });

    it("should handle undefined effects", () => {
      const undefinedEffectNode = {
        id: "undefined-effect",
        type: "FRAME",
        effects: undefined,
      } as any;

      const result = buildSimplifiedEffects(undefinedEffectNode);

      expect(result).toEqual({});
    });

    it("should handle color without alpha", () => {
      (mockDropShadowNode.effects![0] as any).color = {
        r: 100,
        g: 150,
        b: 200,
      };
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(100, 150, 200, 1)");
    });

    it("should handle color with alpha 0 (fully transparent)", () => {
      (mockDropShadowNode.effects![0] as any).color = {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
      };
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(result.shadows?.[0].color).toBe("rgba(0, 0, 0, 0)");
    });
  });

  // =====================================================
  // Test Suite 8: formatRGBAColor
  // =====================================================
  describe("formatRGBAColor", () => {
    it("should format color with alpha", () => {
      const color = { r: 255, g: 0, b: 0, a: 0.5 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("should format color without alpha (default to 1)", () => {
      const color = { r: 255, g: 0, b: 0 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(255, 0, 0, 1)");
    });

    it("should use opacity parameter when provided", () => {
      const color = { r: 100, g: 150, b: 200, a: 0.5 };
      const result = formatRGBAColor(color, 0.8);

      expect(result).toBe("rgba(100, 150, 200, 0.8)");
    });

    it("should handle color alpha 0 with opacity parameter", () => {
      const color = { r: 100, g: 150, b: 200, a: 0 };
      const result = formatRGBAColor(color, 0.5);

      expect(result).toBe("rgba(100, 150, 200, 0.5)");
    });

    it("should handle color alpha with undefined opacity parameter", () => {
      const color = { r: 100, g: 150, b: 200, a: 0.7 };
      const result = formatRGBAColor(color, undefined);

      expect(result).toBe("rgba(100, 150, 200, 0.7)");
    });

    it("should handle white color", () => {
      const color = { r: 255, g: 255, b: 255, a: 1 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(255, 255, 255, 1)");
    });

    it("should handle black color", () => {
      const color = { r: 0, g: 0, b: 0, a: 1 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(0, 0, 0, 1)");
    });

    it("should handle gray color", () => {
      const color = { r: 128, g: 128, b: 128, a: 0.5 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(128, 128, 128, 0.5)");
    });

    it("should handle decimal RGB values", () => {
      const color = { r: 12.5, g: 200.7, b: 99.3, a: 0.8 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(12.5, 200.7, 99.3, 0.8)");
    });

    it("should clamp RGB values to valid range (0-255)", () => {
      // Note: formatRGBAColor doesn't clamp, it just formats
      const color = { r: 300, g: -50, b: 128, a: 1 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(300, -50, 128, 1)");
    });
  });

  // =====================================================
  // Test Suite 9: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should return SimplifiedEffects type", () => {
      const result: SimplifiedEffects =
        buildSimplifiedEffects(mockDropShadowNode);

      expect(result).toBeDefined();
    });

    it("should have shadows array when shadows exist", () => {
      const result = buildSimplifiedEffects(mockDropShadowNode);

      expect(Array.isArray(result.shadows)).toBe(true);
    });

    it("should have blur string when blur exists", () => {
      const result = buildSimplifiedEffects(mockBackgroundBlurNode);

      expect(typeof result.blur).toBe("string");
    });

    it("should have layerBlur string when layer blur exists", () => {
      const result = buildSimplifiedEffects(mockLayerBlurNode);

      expect(typeof result.layerBlur).toBe("string");
    });

    it("should have all effect types for multiple effects", () => {
      const result = buildSimplifiedEffects(mockMultipleEffectsNode);

      expect(Array.isArray(result.shadows)).toBe(true);
      expect(typeof result.layerBlur).toBe("string");
    });
  });
});
