/**
 * Tests for token extraction
 */
import { describe, expect, it } from "@jest/globals";

import type { SimplifiedDesign } from "@/extractors/types";
import { extractTokens } from "@/tokens/extractor";

// Helper to create typed design with proper style casting
function createDesign(
  styles: Record<string, unknown>,
  nodes: SimplifiedDesign["nodes"] = []
): SimplifiedDesign {
  return {
    name: "Test Design",
    nodes,
    components: {},
    componentSets: {},
    globalVars: {
      styles: styles as Record<string, never>,
    },
  };
}

describe("Token Extraction", () => {
  describe("extractTokens", () => {
    it("should extract color tokens from globalVars.styles", () => {
      const design = createDesign({
        "style-1": "#ffffff",
        "style-2": "rgba(0, 0, 0, 0.5)",
        "style-3": "#176cf7",
      });

      const tokens = extractTokens(design);

      expect(tokens.colors.all).toBeDefined();
      expect(Object.keys(tokens.colors.all)).toHaveLength(3);
      expect(tokens.colors.all["style-1"]).toMatchObject({
        name: "style-1",
        value: "#ffffff",
        category: "color",
      });
    });

    it("should detect color families from naming patterns", () => {
      const design = createDesign({
        "primary-100": "#e0f2fe",
        "primary-500": "#0ea5e9",
        "primary-900": "#0c4a6e",
        "neutral-100": "#f5f5f5",
        "neutral-500": "#737373",
      });

      const tokens = extractTokens(design, { detectPatterns: true });

      expect(tokens.colors.families).toBeDefined();
      expect(tokens.colors.families.primary).toBeDefined();
      expect(tokens.colors.families.primary[100]).toMatchObject({
        name: "primary-100",
        scale: 100,
        family: "primary",
      });
      expect(tokens.colors.families.neutral).toBeDefined();
      expect(tokens.colors.families.neutral[500]).toMatchObject({
        name: "neutral-500",
        scale: 500,
        family: "neutral",
      });
    });

    it("should calculate contrast ratios when enabled", () => {
      const design = createDesign({
        white: "#ffffff",
        black: "#000000",
        blue: "#0000ff",
      });

      const tokens = extractTokens(design, { calculateContrast: true });

      expect(tokens.colors.all["white"].contrast).toBeDefined();
      expect(tokens.colors.all["white"].contrast?.onWhite).toBe(1);
      expect(tokens.colors.all["white"].contrast?.onBlack).toBeGreaterThan(1);
    });

    it("should extract typography tokens from styles", () => {
      const design = createDesign({
        "heading-lg": {
          fontFamily: "Inter",
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: "1.2",
        },
        "body-md": {
          fontFamily: "Inter",
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "1.5",
        },
      });

      const tokens = extractTokens(design);

      expect(tokens.typography.styles).toBeDefined();
      expect(tokens.typography.styles["heading-lg"]).toMatchObject({
        name: "heading-lg",
        category: "typography",
        value: {
          fontFamily: "Inter",
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: "1.2",
        },
      });
    });

    it("should extract font families from typography tokens", () => {
      const design = createDesign({
        "style-1": {
          fontFamily: "Inter",
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "1.5",
        },
        "style-2": {
          fontFamily: "Roboto",
          fontSize: "14px",
          fontWeight: 400,
          lineHeight: "1.4",
        },
      });

      const tokens = extractTokens(design);

      expect(tokens.typography.families).toContain("Inter");
      expect(tokens.typography.families).toContain("Roboto");
    });

    it("should extract spacing tokens from node layouts", () => {
      const design: SimplifiedDesign = {
        name: "Test Design",
        nodes: [
          {
            id: "1",
            name: "Container",
            type: "FRAME",
            layout: {
              padding: { top: 16, right: 16, bottom: 16, left: 16 },
              gap: 8,
            } as never,
            children: [],
          },
          {
            id: "2",
            name: "Card",
            type: "FRAME",
            layout: {
              padding: 24,
            } as never,
            children: [],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const tokens = extractTokens(design);

      expect(tokens.spacing.scale).toBeDefined();
      const spacingKeys = Object.keys(tokens.spacing.scale);
      expect(spacingKeys.length).toBeGreaterThan(0);
      expect(spacingKeys.some((k) => k.includes("padding"))).toBe(true);
      expect(spacingKeys.some((k) => k.includes("gap"))).toBe(true);
    });

    it("should extract border radius tokens from nodes", () => {
      const design: SimplifiedDesign = {
        name: "Test Design",
        nodes: [
          {
            id: "1",
            name: "Button",
            type: "FRAME",
            borderRadius: "8px",
            children: [],
          },
          {
            id: "2",
            name: "Card",
            type: "FRAME",
            borderRadius: "16px",
            children: [],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const tokens = extractTokens(design);

      expect(tokens.borders.radius).toBeDefined();
      const radiusKeys = Object.keys(tokens.borders.radius);
      expect(radiusKeys.length).toBeGreaterThan(0);
      expect(tokens.borders.radius["radius-8px"]).toMatchObject({
        name: "radius-8px",
        value: "8px",
        category: "border",
      });
    });

    it("should calculate statistics correctly", () => {
      const design: SimplifiedDesign = {
        name: "Test Design",
        nodes: [
          {
            id: "1",
            name: "Container",
            type: "FRAME",
            borderRadius: "8px",
            layout: { padding: 16 } as never,
            children: [],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: {
          styles: {
            "primary-500": "#0ea5e9",
            "primary-600": "#0284c7",
            white: "#ffffff",
            heading: {
              fontFamily: "Inter",
              fontSize: "24px",
              fontWeight: 700,
              lineHeight: "1.2",
            },
          } as unknown as Record<string, never>,
        },
      };

      const tokens = extractTokens(design);

      expect(tokens.stats).toBeDefined();
      expect(tokens.stats.totalColorTokens).toBe(3);
      expect(tokens.stats.totalTypographyTokens).toBe(1);
      expect(tokens.stats.totalSpacingTokens).toBeGreaterThan(0);
      expect(tokens.stats.totalBorderTokens).toBe(1);
      expect(tokens.stats.semanticColorCoverage).toBeGreaterThan(0);
    });

    it("should handle empty design gracefully", () => {
      const design: SimplifiedDesign = {
        name: "Empty Design",
        nodes: [],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const tokens = extractTokens(design);

      expect(tokens.colors.all).toEqual({});
      expect(tokens.typography.styles).toEqual({});
      expect(tokens.spacing.scale).toEqual({});
      expect(tokens.stats.totalColorTokens).toBe(0);
      expect(tokens.stats.totalTypographyTokens).toBe(0);
    });

    it("should handle StyleWithMetadata wrapper", () => {
      const design = createDesign({
        "style-1": {
          value: "#176cf7",
          semanticName: "Primary/700",
          category: "color",
          originalId: "style-1",
        },
      });

      const tokens = extractTokens(design);

      expect(tokens.colors.all["Primary/700"]).toBeDefined();
      expect(tokens.colors.all["Primary/700"].value).toBe("#176cf7");
      expect(tokens.colors.semantic["Primary/700"]).toBeDefined();
    });

    it("should format rgba colors correctly", () => {
      const design = createDesign({
        transparent: "rgba(255, 0, 0, 0.5)",
        opaque: "rgb(0, 128, 255)",
      });

      const tokens = extractTokens(design);

      expect(tokens.colors.all["transparent"]).toMatchObject({
        name: "transparent",
        value: "rgba(255, 0, 0, 0.5)",
      });
      expect(tokens.colors.all["opaque"]).toMatchObject({
        name: "opaque",
        value: "rgb(0, 128, 255)",
      });
    });

    it("should handle array color values", () => {
      const design = createDesign({
        "color-fill": ["#ff0000", "#00ff00"],
      });

      const tokens = extractTokens(design);

      expect(tokens.colors.all["color-fill"]).toBeDefined();
      expect(tokens.colors.all["color-fill"].value).toBe("#ff0000");
    });
  });
});
