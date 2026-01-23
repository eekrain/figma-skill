/**
 * Tests for Style Dictionary export functionality
 */
import { describe, expect, it } from "@jest/globals";

import { toStyleDictionary } from "@/export/style-dictionary";
import type { ExportOptions, StyleDictionary } from "@/export/types";
import type { DesignTokens } from "@/tokens/types";

describe("Style Dictionary Export", () => {
  const createMockTokens = (): DesignTokens => ({
    colors: {
      semantic: {
        primary: {
          name: "primary",
          value: "#3b82f6",
          category: "color",
          semanticName: "Primary Blue",
        },
        secondary: {
          name: "secondary",
          value: "#8b5cf6",
          category: "color",
          semanticName: "Secondary Purple",
        },
      },
      all: {
        primary: {
          name: "primary",
          value: "#3b82f6",
          category: "color",
          semanticName: "Primary Blue",
        },
        secondary: {
          name: "secondary",
          value: "#8b5cf6",
          category: "color",
        },
        "primary-500": {
          name: "primary-500",
          value: "#3b82f6",
          category: "color",
          family: "primary",
          scale: 500,
        },
      },
      families: {
        primary: {
          500: {
            name: "primary-500",
            value: "#3b82f6",
            category: "color",
            family: "primary",
            scale: 500,
          },
        },
      },
    },
    typography: {
      styles: {
        "heading-1": {
          name: "heading-1",
          value: {
            fontFamily: "Inter",
            fontSize: "48px",
            fontWeight: 700,
            lineHeight: "1.2",
          },
          category: "typography",
          semanticName: "Heading 1",
        },
        "body-base": {
          name: "body-base",
          value: {
            fontFamily: "Inter",
            fontSize: "16px",
            fontWeight: 400,
            lineHeight: "1.5",
          },
          category: "typography",
        },
      },
      families: ["Inter"],
    },
    spacing: {
      scale: {
        "spacing-4": {
          name: "spacing-4",
          value: "16px",
          category: "spacing",
        },
        "spacing-8": {
          name: "spacing-8",
          value: "32px",
          category: "spacing",
        },
      },
    },
    effects: {
      shadows: {
        md: {
          name: "md",
          value: [
            {
              type: "DROP_SHADOW",
              x: 0,
              y: 4,
              blur: 6,
              spread: -1,
              color: "rgba(0, 0, 0, 0.1)",
            },
          ],
          category: "effect",
        },
      },
      blurs: {},
    },
    borders: {
      radius: {
        "radius-md": {
          name: "radius-md",
          value: "8px",
          category: "border",
        },
      },
    },
    stats: {
      totalColorTokens: 2,
      totalTypographyTokens: 2,
      totalSpacingTokens: 2,
      totalEffectTokens: 1,
      totalBorderTokens: 1,
      semanticColorCoverage: 50,
    },
  });

  describe("toStyleDictionary", () => {
    it("should export Style Dictionary format with all categories", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      expect(sd).toBeDefined();
      expect(sd.color).toBeDefined();
      expect(sd.typography).toBeDefined();
      expect(sd.spacing).toBeDefined();
      expect(sd.borderRadius).toBeDefined();
      expect(sd.boxShadow).toBeDefined();
    });

    it("should export colors with correct type and value", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      expect(sd.color.primary).toMatchObject({
        value: "#3b82f6",
        type: "color",
      });
      // originalValue is included for colors
      expect(sd.color.primary.originalValue).toBe("#3b82f6");
    });

    it("should include semantic name as comment when includeMetadata is true", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens, { includeMetadata: true });

      expect(sd.color.primary.comment).toBe("Primary Blue");
    });

    it("should not include comment when includeMetadata is false", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens, { includeMetadata: false });

      expect(sd.color.primary.comment).toBeUndefined();
    });

    it("should export typography tokens with separate properties", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      // Font family
      expect(sd.typography["heading-1-family"]).toMatchObject({
        value: "Inter",
        type: "fontFamily",
      });

      // Font size
      expect(sd.typography["heading-1-size"]).toEqual({
        value: "48px",
        type: "fontSize",
      });

      // Font weight
      expect(sd.typography["heading-1-weight"]).toEqual({
        value: "700",
        type: "fontWeight",
      });

      // Line height
      expect(sd.typography["heading-1-line-height"]).toEqual({
        value: "1.2",
        type: "lineHeight",
      });
    });

    it("should export all typography properties for each style", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      const typographyKeys = Object.keys(sd.typography);
      expect(typographyKeys).toContain("heading-1-family");
      expect(typographyKeys).toContain("heading-1-size");
      expect(typographyKeys).toContain("heading-1-weight");
      expect(typographyKeys).toContain("heading-1-line-height");
      expect(typographyKeys).toContain("body-base-family");
      expect(typographyKeys).toContain("body-base-size");
      expect(typographyKeys).toContain("body-base-weight");
      expect(typographyKeys).toContain("body-base-line-height");
    });

    it("should include semantic name in typography when includeMetadata is true", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens, { includeMetadata: true });

      // Comment is only included on the font-family property
      expect(sd.typography["heading-1-family"].comment).toBe("Heading 1");
      // Other properties don't have comments
      expect(sd.typography["heading-1-size"].comment).toBeUndefined();
      expect(sd.typography["heading-1-weight"].comment).toBeUndefined();
      expect(sd.typography["heading-1-line-height"].comment).toBeUndefined();
    });

    it("should export spacing tokens with dimension type", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      expect(sd.spacing["spacing-4"]).toEqual({
        value: "16px",
        type: "dimension",
      });
      expect(sd.spacing["spacing-8"]).toEqual({
        value: "32px",
        type: "dimension",
      });
    });

    it("should export border radius tokens", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      expect(sd.borderRadius["radius-md"]).toEqual({
        value: "8px",
        type: "borderRadius",
      });
    });

    it("should export box shadow tokens", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      expect(sd.boxShadow.md).toEqual({
        value: "0px 4px 6px -1px rgba(0, 0, 0, 0.1)",
        type: "boxShadow",
      });
    });

    it("should convert effect array to CSS shadow string", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        effects: {
          shadows: {
            "complex-shadow": {
              name: "complex-shadow",
              value: [
                {
                  type: "DROP_SHADOW",
                  x: 0,
                  y: 2,
                  blur: 4,
                  spread: 0,
                  color: "rgba(0, 0, 0, 0.1)",
                },
                {
                  type: "DROP_SHADOW",
                  x: 0,
                  y: 4,
                  blur: 8,
                  spread: 0,
                  color: "rgba(0, 0, 0, 0.05)",
                },
              ],
              category: "effect",
            },
          },
          blurs: {},
        },
      };

      const sd = toStyleDictionary(tokens);

      expect(sd.boxShadow["complex-shadow"].value).toBe(
        "0px 2px 4px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.05)"
      );
    });

    it("should filter out non-DROP_SHADOW effects", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        effects: {
          shadows: {
            "mixed-effect": {
              name: "mixed-effect",
              value: [
                {
                  type: "DROP_SHADOW",
                  x: 0,
                  y: 2,
                  blur: 4,
                  color: "rgba(0,0,0,0.1)",
                },
                {
                  type: "INNER_SHADOW",
                  x: 0,
                  y: 2,
                  blur: 4,
                  color: "rgba(0,0,0,0.1)",
                },
              ],
              category: "effect",
            },
          },
          blurs: {},
        },
      };

      const sd = toStyleDictionary(tokens);

      // Only DROP_SHADOW should be included
      expect(sd.boxShadow["mixed-effect"].value).toBe(
        "0px 2px 4px rgba(0,0,0,0.1)"
      );
    });

    it("should use custom name transformer when provided", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens, {
        transformName: (name) => name.toUpperCase(),
      });

      expect(sd.color.PRIMARY).toBeDefined();
      expect(sd.color["primary"]).toBeUndefined();
    });

    it("should handle empty tokens gracefully", () => {
      const emptyTokens: DesignTokens = {
        colors: { semantic: {}, all: {}, families: {} },
        typography: { styles: {}, families: [] },
        spacing: { scale: {} },
        effects: { shadows: {}, blurs: {} },
        borders: { radius: {} },
        stats: {
          totalColorTokens: 0,
          totalTypographyTokens: 0,
          totalSpacingTokens: 0,
          totalEffectTokens: 0,
          totalBorderTokens: 0,
          semanticColorCoverage: 0,
        },
      };

      const sd = toStyleDictionary(emptyTokens);

      expect(sd).toBeDefined();
      expect(sd.color).toEqual({});
      expect(sd.typography).toEqual({});
      expect(sd.spacing).toEqual({});
      expect(sd.borderRadius).toEqual({});
      expect(sd.boxShadow).toEqual({});
    });

    it("should handle tokens without semantic names", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        colors: {
          semantic: {},
          all: {
            plain: {
              name: "plain",
              value: "#ff0000",
              category: "color",
            },
          },
          families: {},
        },
      };

      const sd = toStyleDictionary(tokens, { includeMetadata: true });

      expect(sd.color.plain.comment).toBeUndefined();
    });

    it("should handle typography tokens with string fontWeight", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        typography: {
          styles: {
            "text-normal": {
              name: "text-normal",
              value: {
                fontFamily: "Inter",
                fontSize: "16px",
                fontWeight: "400",
                lineHeight: "1.5",
              },
              category: "typography",
            },
          },
          families: ["Inter"],
        },
      };

      const sd = toStyleDictionary(tokens);

      expect(sd.typography["text-normal-weight"]).toEqual({
        value: "400",
        type: "fontWeight",
      });
    });
  });

  describe("ExportOptions", () => {
    it("should use default options when none provided", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens);

      // Default includeMetadata is true
      expect(sd.color.primary.comment).toBeDefined();
    });

    it("should allow overriding includeMetadata option", () => {
      const tokens = createMockTokens();
      const sdWithMetadata = toStyleDictionary(tokens, {
        includeMetadata: true,
      });
      const sdWithoutMetadata = toStyleDictionary(tokens, {
        includeMetadata: false,
      });

      expect(sdWithMetadata.color.primary.comment).toBeDefined();
      expect(sdWithoutMetadata.color.primary.comment).toBeUndefined();
    });

    it("should allow setting custom CSS prefix", () => {
      const tokens = createMockTokens();
      const sd = toStyleDictionary(tokens, { cssPrefix: "sd" });

      // CSS prefix would be used when generating CSS custom properties
      // This is a placeholder for future CSS generation functionality
      expect(sd).toBeDefined();
    });
  });
});
