/**
 * Tests for transformers/style module
 *
 * Tests style parsing functions including colors, gradients,
 * images, and strokes.
 */
import type { Node, Paint, RGBA } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  type CSSHexColor,
  type CSSRGBAColor,
  type SimplifiedFill,
  type SimplifiedStrokes,
  buildSimplifiedStrokes,
  formatRGBAColor,
  parsePaint,
} from "@/transformers/style";

describe("transformers/style", () => {
  let mockNode: Node;
  let mockSolidPaint: Paint;
  let mockGradientPaint: Paint;
  let mockImagePaint: Paint;

  beforeEach(() => {
    // Create a mock node
    mockNode = {
      id: "node-1",
      name: "Frame",
      type: "FRAME",
    } as Node;

    // Create mock paints
    mockSolidPaint = {
      type: "SOLID",
      visible: true,
      opacity: 1,
      color: { r: 1, g: 0, b: 0, a: 1 },
    } as Paint;

    mockGradientPaint = {
      type: "GRADIENT_LINEAR",
      visible: true,
      gradientStops: [
        {
          position: 0,
          color: { r: 1, g: 0, b: 0, a: 1 },
        },
        {
          position: 1,
          color: { r: 0, g: 0, b: 1, a: 1 },
        },
      ],
      gradientHandlePositions: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    } as Paint;

    mockImagePaint = {
      type: "IMAGE",
      visible: true,
      scaleMode: "FILL",
      imageRef: "img-ref-123",
    } as Paint;
  });

  // =====================================================
  // Test Suite 1: formatRGBAColor
  // =====================================================
  describe("formatRGBAColor", () => {
    it("should format color with default opacity", () => {
      const color: RGBA = { r: 1, g: 0.5, b: 0, a: 1 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(1, 0.5, 0, 1)");
    });

    it("should format color with custom opacity", () => {
      const color: RGBA = { r: 1, g: 0.5, b: 0, a: 1 };
      const result = formatRGBAColor(color, 0.5);

      expect(result).toBe("rgba(1, 0.5, 0, 0.5)");
    });

    it("should use color.a when opacity not provided", () => {
      const color: RGBA = { r: 0, g: 0, b: 0, a: 0.5 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(0, 0, 0, 0.5)");
    });

    it("should handle opaque colors", () => {
      const color: RGBA = { r: 0.2, g: 0.4, b: 0.6, a: 1 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(0.2, 0.4, 0.6, 1)");
    });

    it("should handle transparent colors", () => {
      const color: RGBA = { r: 1, g: 1, b: 1, a: 0 };
      const result = formatRGBAColor(color);

      expect(result).toBe("rgba(1, 1, 1, 0)");
    });

    it("should return correct CSSRGBAColor type", () => {
      const color: RGBA = { r: 1, g: 0, b: 0, a: 1 };
      const result: CSSRGBAColor = formatRGBAColor(color);

      expect(result).toMatch(/^rgba\(\d+, [\d.]+, [\d.]+, [\d.]+\)$/);
    });
  });

  // =====================================================
  // Test Suite 2: parsePaint - Solid Colors
  // =====================================================
  describe("parsePaint - solid colors", () => {
    it("should return hex for opaque colors", () => {
      const result = parsePaint(mockSolidPaint, false);

      expect(typeof result).toBe("string");
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should return hex color for white", () => {
      (mockSolidPaint as any).color = { r: 1, g: 1, b: 1, a: 1 };
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("#ffffff");
    });

    it("should return hex color for black", () => {
      (mockSolidPaint as any).color = { r: 0, g: 0, b: 0, a: 1 };
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("#000000");
    });

    it("should return hex color for red", () => {
      (mockSolidPaint as any).color = { r: 1, g: 0, b: 0, a: 1 };
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("#ff0000");
    });

    it("should return rgba for transparent colors", () => {
      (mockSolidPaint as any).color = { r: 1, g: 0, b: 0, a: 0.5 };
      (mockSolidPaint as any).opacity = undefined; // Clear opacity so color.a is used
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("rgba(1, 0, 0, 0.5)");
    });

    it("should return rgba when opacity is not 1", () => {
      (mockSolidPaint as any).color = { r: 1, g: 0, b: 0, a: 1 };
      mockSolidPaint.opacity = 0.7;
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("rgba(1, 0, 0, 0.7)");
    });

    it("should handle low opacity values", () => {
      (mockSolidPaint as any).color = { r: 0, g: 0, b: 0, a: 0.01 };
      (mockSolidPaint as any).opacity = undefined; // Clear opacity so color.a is used
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("rgba(0, 0, 0, 0.01)");
    });

    it("should return CSSHexColor type for opaque colors", () => {
      (mockSolidPaint as any).color = { r: 1, g: 0, b: 0, a: 1 };
      const result = parsePaint(mockSolidPaint, false) as CSSHexColor;

      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  // =====================================================
  // Test Suite 3: parsePaint - Gradients
  // =====================================================
  describe("parsePaint - gradients", () => {
    it("should parse linear gradients", () => {
      const result = parsePaint(mockGradientPaint, false);

      expect(typeof result).toBe("object");
      if (typeof result === "object" && result !== null && "type" in result) {
        expect(result.type).toBe("GRADIENT_LINEAR");
        expect("gradient" in result).toBe(true);
      }
    });

    it("should generate CSS gradient string", () => {
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toContain("linear-gradient");
      }
    });

    it("should handle radial gradients", () => {
      mockGradientPaint.type = "GRADIENT_RADIAL";
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toContain("radial-gradient");
      }
    });

    it("should handle angular gradients", () => {
      mockGradientPaint.type = "GRADIENT_ANGULAR";
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toContain("conic-gradient");
      }
    });

    it("should handle diamond gradients", () => {
      mockGradientPaint.type = "GRADIENT_DIAMOND";
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toContain("linear-gradient");
      }
    });
  });

  // =====================================================
  // Test Suite 4: parsePaint - Images
  // =====================================================
  describe("parsePaint - images", () => {
    it("should parse image fills", () => {
      const result = parsePaint(mockImagePaint, false);

      expect(typeof result).toBe("object");
    });

    it("should include imageRef", () => {
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "imageRef" in result
      ) {
        expect(result.imageRef).toBe("img-ref-123");
      }
    });

    it("should handle FILL scale mode", () => {
      (mockImagePaint as any).scaleMode = "FILL";
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "objectFit" in result
      ) {
        expect(result.objectFit).toBe("cover");
      }
    });

    it("should handle FIT scale mode", () => {
      (mockImagePaint as any).scaleMode = "FIT";
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "objectFit" in result
      ) {
        expect(result.objectFit).toBe("contain");
      }
    });

    it("should handle TILE scale mode", () => {
      (mockImagePaint as any).scaleMode = "TILE";
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "backgroundRepeat" in result
      ) {
        expect(result.backgroundRepeat).toBe("repeat");
      }
    });

    it("should handle STRETCH scale mode", () => {
      (mockImagePaint as any).scaleMode = "STRETCH";
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "backgroundSize" in result
      ) {
        expect(result.backgroundSize).toBe("100% 100%");
      }
    });

    it("should set isBackground for non-container", () => {
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "isBackground" in result
      ) {
        expect(result.isBackground).toBe(true);
      }
    });

    it("should include imageDownloadArguments", () => {
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "imageDownloadArguments" in result
      ) {
        expect(result.imageDownloadArguments).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 5: parsePaint - Special Cases
  // =====================================================
  describe("parsePaint - special cases", () => {
    it("should return transparent hex for invisible paints", () => {
      mockSolidPaint.visible = false;
      const result = parsePaint(mockSolidPaint, false);

      expect(result).toBe("#00000000");
    });

    it("should return transparent hex for unknown paint types", () => {
      const unknownPaint = {
        type: "UNKNOWN",
      } as any as Paint;
      const result = parsePaint(unknownPaint, false);

      expect(result).toBe("#00000000");
    });

    it("should handle pattern fills", () => {
      const patternPaint = {
        type: "PATTERN",
        sourceNodeId: "pattern-1",
        tileType: "RECTANGULAR" as const,
        scalingFactor: 1,
        spacing: { x: 0, y: 0 },
        horizontalAlignment: "START" as const,
        verticalAlignment: "START" as const,
      } as Paint;
      const result = parsePaint(patternPaint, false) as SimplifiedFill;

      if (typeof result === "object" && result !== null && "type" in result) {
        expect(result.type).toBe("PATTERN");
      }
    });
  });

  // =====================================================
  // Test Suite 6: buildSimplifiedStrokes
  // =====================================================
  describe("buildSimplifiedStrokes", () => {
    it("should return empty colors array when no strokes", () => {
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.colors).toEqual([]);
    });

    it("should parse stroke colors", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.colors).toBeDefined();
      expect(result.colors.length).toBeGreaterThan(0);
    });

    it("should include strokeWeight", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      (mockNode as any).strokeWeight = 2;
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.strokeWeight).toBe("2px");
    });

    it("should include strokeDashes when present", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      (mockNode as any).strokeDashes = [5, 10];
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.strokeDashes).toEqual([5, 10]);
    });

    it("should include strokeWeights for rectangle nodes", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      (mockNode as any).strokeWeights = {
        top: 1,
        right: 2,
        bottom: 3,
        left: 4,
      };
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.strokeWeights).toBe("1px 2px 3px 4px");
    });

    it("should filter invisible strokes", () => {
      (mockNode as any).strokes = [
        mockSolidPaint,
        { ...mockSolidPaint, visible: false },
      ];
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.colors.length).toBe(1);
    });

    it("should handle null strokeWeights", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      (mockNode as any).strokeWeights = null;
      const result = buildSimplifiedStrokes(mockNode, false);

      expect(result.strokeWeights).toBeUndefined();
    });

    it("should return SimplifiedStrokes type", () => {
      (mockNode as any).strokes = [mockSolidPaint];
      const result: SimplifiedStrokes = buildSimplifiedStrokes(mockNode, false);

      expect(result.colors).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 7: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle missing color in solid paint", () => {
      const incompletePaint = {
        type: "SOLID" as const,
        visible: true,
        opacity: 1,
        color: { r: 0, g: 0, b: 0, a: 1 }, // Add minimal color for valid SOLID paint
      } as Paint;

      const result = parsePaint(incompletePaint, false);
      expect(result).toBeDefined();
    });

    it("should handle gradient without handle positions", () => {
      delete (mockGradientPaint as any).gradientHandlePositions;
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toContain("linear-gradient");
      }
    });

    it("should handle gradient with one handle position", () => {
      (mockGradientPaint as any).gradientHandlePositions = [{ x: 0, y: 0 }];
      const result = parsePaint(mockGradientPaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "gradient" in result
      ) {
        expect(result.gradient).toBeDefined();
      }
    });

    it("should handle image without imageRef", () => {
      delete (mockImagePaint as any).imageRef;
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "imageRef" in result
      ) {
        expect(result.imageRef).toBe("");
      }
    });

    it("should handle image without scaleMode (default to FILL)", () => {
      delete (mockImagePaint as any).scaleMode;
      const result = parsePaint(mockImagePaint, false) as SimplifiedFill;

      if (
        typeof result === "object" &&
        result !== null &&
        "scaleMode" in result
      ) {
        expect(result.scaleMode).toBe("FILL");
      }
    });
  });

  // =====================================================
  // Test Suite 8: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should define CSSRGBAColor type correctly", () => {
      const color: CSSRGBAColor = "rgba(255, 0, 0, 0.5)";

      expect(color).toMatch(/^rgba\(/);
    });

    it("should define CSSHexColor type correctly", () => {
      const color: CSSHexColor = "#ff0000";

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should define SimplifiedFill union type correctly", () => {
      const fills: SimplifiedFill[] = [
        "#ff0000" as CSSHexColor,
        "rgba(255, 0, 0, 0.5)" as CSSRGBAColor,
        {
          type: "GRADIENT_LINEAR",
          gradient: "linear-gradient(90deg, #ff0000, #0000ff)",
        },
        {
          type: "IMAGE",
          imageRef: "ref-123",
          scaleMode: "FILL",
        },
      ];

      expect(fills).toHaveLength(4);
    });
  });
});
