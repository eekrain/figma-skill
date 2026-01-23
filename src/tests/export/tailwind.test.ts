/**
 * Tests for Tailwind v3 export functionality
 */
import { describe, expect, it } from "@jest/globals";

import { toTailwindV3 } from "@/export/tailwind-v3";
import type { TailwindV3Config, TailwindV3Options } from "@/export/types";
import type { DesignTokens } from "@/tokens/types";

describe("Tailwind v3 Export", () => {
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
        "primary-100": {
          name: "primary-100",
          value: "#dbeafe",
          category: "color",
          family: "primary",
          scale: 100,
        },
        "primary-500": {
          name: "primary-500",
          value: "#3b82f6",
          category: "color",
          family: "primary",
          scale: 500,
        },
        "primary-900": {
          name: "primary-900",
          value: "#1e3a8a",
          category: "color",
          family: "primary",
          scale: 900,
        },
      },
      families: {
        primary: {
          100: {
            name: "primary-100",
            value: "#dbeafe",
            category: "color",
            family: "primary",
            scale: 100,
          },
          500: {
            name: "primary-500",
            value: "#3b82f6",
            category: "color",
            family: "primary",
            scale: 500,
          },
          900: {
            name: "primary-900",
            value: "#1e3a8a",
            category: "color",
            family: "primary",
            scale: 900,
          },
        },
      },
    },
    typography: {
      styles: {
        "heading-1": {
          name: "heading-1",
          value: {
            fontFamily: "Inter, sans-serif",
            fontSize: "48px",
            fontWeight: 700,
            lineHeight: "1.2",
          },
          category: "typography",
        },
        "body-base": {
          name: "body-base",
          value: {
            fontFamily: "Inter, sans-serif",
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
        "spacing-1": {
          name: "spacing-1",
          value: "4px",
          category: "spacing",
        },
        "spacing-2": {
          name: "spacing-2",
          value: "8px",
          category: "spacing",
        },
        "spacing-4": {
          name: "spacing-4",
          value: "16px",
          category: "spacing",
        },
      },
    },
    effects: {
      shadows: {
        sm: {
          name: "sm",
          value: [
            {
              type: "DROP_SHADOW",
              x: 0,
              y: 1,
              blur: 2,
              spread: 0,
              color: "rgba(0, 0, 0, 0.05)",
            },
          ],
          category: "effect",
        },
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
            {
              type: "DROP_SHADOW",
              x: 0,
              y: 2,
              blur: 4,
              spread: -1,
              color: "rgba(0, 0, 0, 0.06)",
            },
          ],
          category: "effect",
        },
      },
      blurs: {},
    },
    borders: {
      radius: {
        "radius-sm": {
          name: "radius-sm",
          value: "4px",
          category: "border",
        },
        "radius-md": {
          name: "radius-md",
          value: "8px",
          category: "border",
        },
        "radius-lg": {
          name: "radius-lg",
          value: "16px",
          category: "border",
        },
      },
    },
    stats: {
      totalColorTokens: 5,
      totalTypographyTokens: 2,
      totalSpacingTokens: 3,
      totalEffectTokens: 2,
      totalBorderTokens: 3,
      semanticColorCoverage: 40,
    },
  });

  describe("toTailwindV3", () => {
    it("should export basic Tailwind config structure", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.theme.extend).toBeDefined();
    });

    it("should export semantic colors at root level", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.colors).toBeDefined();
      // "primary" has both semantic and family, so it becomes an object with DEFAULT
      expect(config.theme.colors?.primary).toMatchObject({
        DEFAULT: "#3b82f6",
      });
      // "secondary" has no family, so it's just a string
      expect(config.theme.colors?.secondary).toBe("#8b5cf6");
    });

    it("should nest color families by default", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.colors?.primary).toBeDefined();
      expect(typeof config.theme.colors?.primary).toBe("object");
      expect(config.theme.colors?.primary).toMatchObject({
        DEFAULT: "#3b82f6", // Semantic color preserved as DEFAULT
        "100": "#dbeafe",
        "500": "#3b82f6",
        "900": "#1e3a8a",
      });
    });

    it("should flatten color families when nestColorFamilies is false", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens, { nestColorFamilies: false });

      expect(config.theme.colors?.["primary-100"]).toBe("#dbeafe");
      expect(config.theme.colors?.["primary-500"]).toBe("#3b82f6");
      expect(config.theme.colors?.["primary-900"]).toBe("#1e3a8a");
    });

    it("should export font families from typography tokens", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.fontFamily).toBeDefined();
      expect(config.theme.fontFamily?.["heading-1"]).toBe("Inter");
      expect(config.theme.fontFamily?.["body-base"]).toBe("Inter");
    });

    it("should export font sizes with line height as tuple", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.fontSize).toBeDefined();
      expect(config.theme.fontSize?.["heading-1"]).toEqual(["48px", "1.2"]);
      expect(config.theme.fontSize?.["body-base"]).toEqual(["16px", "1.5"]);
    });

    it("should export spacing scale", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.spacing).toBeDefined();
      expect(config.theme.spacing?.["1"]).toBe("4px");
      expect(config.theme.spacing?.["2"]).toBe("8px");
      expect(config.theme.spacing?.["4"]).toBe("16px");
    });

    it("should remove spacing- prefix from spacing keys", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.spacing?.["spacing-1"]).toBeUndefined();
      expect(config.theme.spacing?.["1"]).toBeDefined();
    });

    it("should export border radius", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.borderRadius).toBeDefined();
      expect(config.theme.borderRadius?.["sm"]).toBe("4px");
      expect(config.theme.borderRadius?.["md"]).toBe("8px");
      expect(config.theme.borderRadius?.["lg"]).toBe("16px");
    });

    it("should remove radius- prefix from border radius keys", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.borderRadius?.["radius-sm"]).toBeUndefined();
      expect(config.theme.borderRadius?.["sm"]).toBeDefined();
    });

    it("should export box shadows from effect tokens", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.boxShadow).toBeDefined();
      // sm has spread: 0, which is omitted
      expect(config.theme.boxShadow?.sm).toBe(
        "0px 1px 2px rgba(0, 0, 0, 0.05)"
      );
      expect(config.theme.boxShadow?.md).toContain(
        "0px 4px 6px -1px rgba(0, 0, 0, 0.1)"
      );
    });

    it("should handle single shadow effects", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.boxShadow?.sm).toBeDefined();
      // sm has spread: 0, which is omitted
      expect(config.theme.boxShadow?.sm).toBe(
        "0px 1px 2px rgba(0, 0, 0, 0.05)"
      );
    });

    it("should handle multiple shadow effects (comma-separated)", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      expect(config.theme.boxShadow?.md).toBeDefined();
      expect(config.theme.boxShadow?.md).toContain(", ");
    });

    it("should filter out non-DROP_SHADOW effects", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        effects: {
          shadows: {
            "mixed-shadow": {
              name: "mixed-shadow",
              value: [
                {
                  type: "DROP_SHADOW",
                  x: 0,
                  y: 2,
                  blur: 4,
                  color: "rgba(0,0,0,0.1)",
                },
                {
                  type: "LAYER_BLUR",
                  blur: 10,
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

      const config = toTailwindV3(tokens);

      // Only DROP_SHADOW should be included
      expect(config.theme.boxShadow?.["mixed-shadow"]).toBe(
        "0px 2px 4px rgba(0,0,0,0.1)"
      );
    });

    it("should use custom name transformer when provided", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens, {
        transformName: (name) => name.toUpperCase(),
      });

      // PRIMARY has both semantic and family, so it's an object with DEFAULT
      expect(config.theme.colors?.PRIMARY).toMatchObject({
        DEFAULT: "#3b82f6",
      });
      // SECONDARY has no family, so it's a string
      expect(config.theme.colors?.SECONDARY).toBe("#8b5cf6");
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

      const config = toTailwindV3(emptyTokens);

      expect(config).toBeDefined();
      expect(config.theme).toBeDefined();
    });

    it("should handle tokens with no line height", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        typography: {
          styles: {
            "text-no-lineheight": {
              name: "text-no-lineheight",
              value: {
                fontFamily: "Inter",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "",
              },
              category: "typography",
            },
          },
          families: ["Inter"],
        },
      };

      const config = toTailwindV3(tokens);

      expect(config.theme.fontSize?.["text-no-lineheight"]).toBeDefined();
      // When line height is empty, should just be the font size string
      const fontSize = config.theme.fontSize?.["text-no-lineheight"];
      expect(fontSize).toBe("14px");
    });

    it("should convert camelCase to kebab-case for utility names", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        typography: {
          styles: {
            headingOne: {
              name: "headingOne",
              value: {
                fontFamily: "Inter",
                fontSize: "32px",
                fontWeight: 700,
                lineHeight: "1.2",
              },
              category: "typography",
            },
          },
          families: ["Inter"],
        },
      };

      const config = toTailwindV3(tokens);

      expect(config.theme.fontSize?.["heading-one"]).toBeDefined();
      expect(config.theme.fontSize?.["headingOne"]).toBeUndefined();
    });

    it("should handle font family with multiple fallbacks", () => {
      const tokens: DesignTokens = {
        ...createMockTokens(),
        typography: {
          styles: {
            "text-system": {
              name: "text-system",
              value: {
                fontFamily:
                  '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: "1.5",
              },
              category: "typography",
            },
          },
          families: ["SF Pro Display"],
        },
      };

      const config = toTailwindV3(tokens);

      // Should extract first font family name
      expect(config.theme.fontFamily?.["text-system"]).toBe("SF Pro Display");
    });
  });

  describe("TailwindV3Options", () => {
    it("should respect default options", () => {
      const tokens = createMockTokens();
      const config = toTailwindV3(tokens);

      // Default: nestColorFamilies = true
      expect(typeof config.theme.colors?.primary).toBe("object");
    });

    it("should allow overriding individual options", () => {
      const tokens = createMockTokens();
      const config1 = toTailwindV3(tokens, { nestColorFamilies: false });
      const config2 = toTailwindV3(tokens, { nestColorFamilies: true });

      expect(config1.theme.colors?.["primary-500"]).toBeDefined();
      expect(typeof config2.theme.colors?.primary).toBe("object");
    });
  });
});
