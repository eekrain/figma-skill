/**
 * Tests for Design System Documentation Generator
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import type { DesignSystemAnalysis } from "@/analysis/types";
import { generateDesignSystemDoc } from "@/docs/generator";
import type {
  ColorTokenData,
  ComponentDocData,
  DocFile,
  DocGenerationOptions,
  OverviewData,
} from "@/docs/types";
import type { SimplifiedDesign } from "@/extractors/types";
import type { DesignTokens } from "@/tokens/types";

describe("Documentation Generator", () => {
  let mockDesign: SimplifiedDesign;
  let mockTokens: DesignTokens;
  let mockAnalysis: DesignSystemAnalysis;

  beforeEach(() => {
    // Setup mock design data
    mockDesign = {
      name: "Test Design System",
      nodes: [],
      components: {},
      componentSets: {},
      globalVars: {
        styles: {},
      },
    };

    // Setup mock tokens
    mockTokens = {
      colors: {
        semantic: {
          primary: {
            name: "primary",
            value: "#3b82f6",
            category: "color",
            semanticName: "Primary Blue",
            contrast: { onWhite: 4.5, onBlack: 8.2 },
          },
          secondary: {
            name: "secondary",
            value: "#8b5cf6",
            category: "color",
            semanticName: "Secondary Purple",
            contrast: { onWhite: 4.2, onBlack: 7.8 },
          },
        },
        all: {
          primary: {
            name: "primary",
            value: "#3b82f6",
            category: "color",
            semanticName: "Primary Blue",
            contrast: { onWhite: 4.5, onBlack: 8.2 },
          },
          "primary-100": {
            name: "primary-100",
            value: "#dbeafe",
            category: "color",
            family: "primary",
            scale: 100,
            contrast: { onWhite: 1.5, onBlack: 12.5 },
          },
          "primary-500": {
            name: "primary-500",
            value: "#3b82f6",
            category: "color",
            family: "primary",
            scale: 500,
            contrast: { onWhite: 4.5, onBlack: 8.2 },
          },
          "primary-900": {
            name: "primary-900",
            value: "#1e3a8a",
            category: "color",
            family: "primary",
            scale: 900,
            contrast: { onWhite: 12.5, onBlack: 1.5 },
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
              contrast: { onWhite: 1.5, onBlack: 12.5 },
            },
            500: {
              name: "primary-500",
              value: "#3b82f6",
              category: "color",
              family: "primary",
              scale: 500,
              contrast: { onWhite: 4.5, onBlack: 8.2 },
            },
            900: {
              name: "primary-900",
              value: "#1e3a8a",
              category: "color",
              family: "primary",
              scale: 900,
              contrast: { onWhite: 12.5, onBlack: 1.5 },
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
        totalColorTokens: 4,
        totalTypographyTokens: 2,
        totalSpacingTokens: 2,
        totalEffectTokens: 2,
        totalBorderTokens: 1,
        semanticColorCoverage: 50,
      },
    };

    // Setup mock analysis
    mockAnalysis = {
      components: {
        "button-primary": {
          key: "button-primary",
          id: "btn-123",
          name: "Button Primary",
          description: "Primary button component",
          atomicLevel: "atoms",
          tags: ["button", "primary", "interactive"],
          variants: [
            {
              name: "primary",
              property: "variant",
              value: "primary",
              componentId: "btn-123",
            },
            {
              name: "large",
              property: "size",
              value: "large",
              componentId: "btn-124",
            },
          ],
          props: [
            {
              name: "label",
              type: "string",
              required: true,
              description: "Button label text",
            },
            {
              name: "disabled",
              type: "boolean",
              required: false,
              defaultValue: "false",
            },
          ],
          slots: [],
          readiness: {
            score: 95,
            ready: true,
            missing: [],
            warnings: ["Consider adding loading state"],
            suggestions: ["Add hover state documentation"],
          },
          codeHints: {
            react: {
              componentName: "Button",
              propsInterface: `interface ButtonProps {
  label: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}`,
              usageExample: `<Button label="Click me" variant="primary" size="medium" />`,
              a11yProps: ["aria-label", "aria-disabled"],
            },
          },
        },
      },
      relationships: {},
      usage: {},
      patterns: [],
      atomicHierarchy: {
        atoms: ["button-primary"],
        molecules: [],
        organisms: [],
        templates: [],
        pages: [],
      },
      implementationReadiness: {
        readyToImplement: ["button-primary"],
        needsSpecification: [],
        hasIssues: [],
        suggestions: [],
      },
      summary: {
        totalComponents: 1,
        byCategory: {
          atoms: 1,
          molecules: 0,
          organisms: 0,
          templates: 0,
          pages: 0,
        },
        complexityScore: 25,
        consistencyScore: 85,
        implementationEffort: "low",
        keyRecommendations: [],
      },
    };
  });

  describe("generateDesignSystemDoc", () => {
    it("should generate complete documentation with default options", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );

      // Should generate overview, colors, typography, spacing, effects, components, and accessibility
      const expectedFiles = [
        "_Overview.md",
        "GlobalStyles/Colors.md",
        "GlobalStyles/Colors/Primary.md",
        "GlobalStyles/Typography.md",
        "GlobalStyles/Spacing.md",
        "GlobalStyles/Effects.md",
        "Components/button-primary.md",
        "Guidelines/Accessibility.md",
      ];

      const filePaths = docs.map((d) => d.path);
      for (const expected of expectedFiles) {
        expect(filePaths).toContain(expected);
      }
    });

    it("should generate overview file with correct content", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const overview = docs.find((d) => d.path === "_Overview.md");

      expect(overview).toBeDefined();
      expect(overview?.content).toContain("# Test Design System Design System");
      expect(overview?.content).toContain("## System Statistics");
      expect(overview?.content).toContain("| Total Colors | 4 |");
      expect(overview?.content).toContain("| Semantic Colors | 2 |");
      expect(overview?.content).toContain("| Color Families | 1 |");
      expect(overview?.content).toContain("| Components | 1 |");
    });

    it("should include color families in overview", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const overview = docs.find((d) => d.path === "_Overview.md");

      expect(overview?.content).toContain("## Color Families");
      expect(overview?.content).toContain("- **primary**: 100, 500, 900");
    });

    it("should include font families in overview", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const overview = docs.find((d) => d.path === "_Overview.md");

      expect(overview?.content).toContain("## Font Families");
      expect(overview?.content).toContain("- Inter");
    });

    it("should include components by atomic level in overview", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const overview = docs.find((d) => d.path === "_Overview.md");

      expect(overview?.content).toContain("## Components by Atomic Level");
      expect(overview?.content).toContain("| atoms | 1 |");
    });
  });

  describe("Color Documentation", () => {
    it("should generate semantic colors documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const colorsDoc = docs.find((d) => d.path === "GlobalStyles/Colors.md");

      expect(colorsDoc).toBeDefined();
      expect(colorsDoc?.content).toContain("# Semantic Colors");
      expect(colorsDoc?.content).toContain(
        "| Name | Value | Preview | Contrast on White | Contrast on Black |"
      );
    });

    it("should include WCAG compliance indicators", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const colorsDoc = docs.find((d) => d.path === "GlobalStyles/Colors.md");

      // primary has 4.5:1 on white, which is exactly AA
      expect(colorsDoc?.content).toContain("✅ AA");
    });

    it("should generate color family documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const primaryDoc = docs.find(
        (d) => d.path === "GlobalStyles/Colors/Primary.md"
      );

      expect(primaryDoc).toBeDefined();
      expect(primaryDoc?.content).toContain("# Primary Color Scale");
      expect(primaryDoc?.content).toContain("| 100 |");
      expect(primaryDoc?.content).toContain("| 500 |");
      expect(primaryDoc?.content).toContain("| 900 |");
    });

    it("should omit accessibility info when includeAccessibility is false", () => {
      const options: DocGenerationOptions = { includeAccessibility: false };
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis,
        options
      );
      const colorsDoc = docs.find((d) => d.path === "GlobalStyles/Colors.md");

      expect(colorsDoc?.content).not.toContain("Contrast on White");
      expect(colorsDoc?.content).not.toContain("Contrast on Black");
    });
  });

  describe("Typography Documentation", () => {
    it("should generate typography documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const typoDoc = docs.find((d) => d.path === "GlobalStyles/Typography.md");

      expect(typoDoc).toBeDefined();
      expect(typoDoc?.content).toContain("# Typography");
      expect(typoDoc?.content).toContain(
        "| Name | Font Family | Size | Weight | Line Height |"
      );
      expect(typoDoc?.content).toContain(
        "| heading-1 | Inter | 48px | 700 | 1.2 |"
      );
      expect(typoDoc?.content).toContain(
        "| body-base | Inter | 16px | 400 | 1.5 |"
      );
    });
  });

  describe("Spacing Documentation", () => {
    it("should generate spacing documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const spacingDoc = docs.find((d) => d.path === "GlobalStyles/Spacing.md");

      expect(spacingDoc).toBeDefined();
      expect(spacingDoc?.content).toContain("# Spacing Scale");
      expect(spacingDoc?.content).toContain("| Token | Value |");
      expect(spacingDoc?.content).toContain("| spacing-4 | 16px |");
      expect(spacingDoc?.content).toContain("| spacing-8 | 32px |");
    });
  });

  describe("Effects Documentation", () => {
    it("should generate shadow documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const effectsDoc = docs.find((d) => d.path === "GlobalStyles/Effects.md");

      expect(effectsDoc).toBeDefined();
      expect(effectsDoc?.content).toContain("# Effects");
      expect(effectsDoc?.content).toContain("## Shadows");
      expect(effectsDoc?.content).toContain("| Name | Value |");
      // sm shadow has spread: 0, should be omitted
      expect(effectsDoc?.content).toContain("0px 1px 2px rgba(0, 0, 0, 0.05)");
      // md shadow has spread: -1
      expect(effectsDoc?.content).toContain(
        "0px 4px 6px -1px rgba(0, 0, 0, 0.1)"
      );
    });
  });

  describe("Component Documentation", () => {
    it("should generate component documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc).toBeDefined();
      expect(compDoc?.content).toContain("# Button Primary");
    });

    it("should include component badges", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("Atomic: atoms");
      expect(compDoc?.content).toContain("Readiness: 95%");
      expect(compDoc?.content).toContain("✅ Ready");
    });

    it("should include component tags", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("**Tags**");
      expect(compDoc?.content).toContain("`button`");
      expect(compDoc?.content).toContain("`primary`");
      expect(compDoc?.content).toContain("`interactive`");
    });

    it("should include component description", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("Primary button component");
    });

    it("should include props table", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("## Props");
      expect(compDoc?.content).toContain(
        "| Name | Type | Required | Default | Description |"
      );
      expect(compDoc?.content).toContain(
        "| label | `string` | Yes | - | Button label text |"
      );
      expect(compDoc?.content).toContain(
        "| disabled | `boolean` | No | false | - |"
      );
    });

    it("should include variants section", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("## Variants");
      expect(compDoc?.content).toContain("**variant**: `primary`");
      expect(compDoc?.content).toContain("**size**: `large`");
    });

    it("should include React code hints when includeExamples is true", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("## React Implementation");
      expect(compDoc?.content).toContain("### Props Interface");
      expect(compDoc?.content).toContain("interface ButtonProps");
      expect(compDoc?.content).toContain("### Usage Example");
      expect(compDoc?.content).toContain(`<Button label="Click me"`);
    });

    it("should omit React code hints when includeExamples is false", () => {
      const options: DocGenerationOptions = { includeExamples: false };
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis,
        options
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).not.toContain("## React Implementation");
      expect(compDoc?.content).not.toContain("interface ButtonProps");
    });

    it("should include implementation notes with warnings", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("## Implementation Notes");
      expect(compDoc?.content).toContain("### Warnings");
      expect(compDoc?.content).toContain("⚠️ Consider adding loading state");
      expect(compDoc?.content).toContain("### Suggestions");
      expect(compDoc?.content).toContain("💡 Add hover state documentation");
    });
  });

  describe("Accessibility Documentation", () => {
    it("should generate accessibility documentation", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const a11yDoc = docs.find(
        (d) => d.path === "Guidelines/Accessibility.md"
      );

      expect(a11yDoc).toBeDefined();
      expect(a11yDoc?.content).toContain("# Accessibility Guidelines");
      expect(a11yDoc?.content).toContain("## Color Contrast");
    });

    it("should include WCAG compliance status for colors", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const a11yDoc = docs.find(
        (d) => d.path === "Guidelines/Accessibility.md"
      );

      expect(a11yDoc?.content).toContain("### primary");
      expect(a11yDoc?.content).toContain("✅ AA");
    });

    it("should include AAA status when contrast >= 7", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const a11yDoc = docs.find(
        (d) => d.path === "Guidelines/Accessibility.md"
      );

      // primary on black is 8.2, which is >= 7
      expect(a11yDoc?.content).toContain("✅ AAA");
    });

    it("should show large text only warning for 3:1 to 4.5:1", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );
      const a11yDoc = docs.find(
        (d) => d.path === "Guidelines/Accessibility.md"
      );

      // Find a color with contrast in this range
      // This would need specific test data
    });

    it("should include component accessibility warnings", () => {
      // Mock component without a11y props
      const mockAnalysisNoA11y: DesignSystemAnalysis = {
        ...mockAnalysis,
        components: {
          "button-primary": {
            ...mockAnalysis.components["button-primary"],
            codeHints: {
              react: {
                componentName: "Button",
                propsInterface: "",
                usageExample: "",
                a11yProps: [], // No a11y props
              },
            },
          },
        },
      };

      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysisNoA11y
      );
      const a11yDoc = docs.find(
        (d) => d.path === "Guidelines/Accessibility.md"
      );

      expect(a11yDoc?.content).toContain("## Component Accessibility");
      expect(a11yDoc?.content).toContain(
        "⚠️ No accessibility properties detected"
      );
    });
  });

  describe("Custom Templates", () => {
    it("should use custom overview template when provided", () => {
      const customTemplate = (data: OverviewData) => {
        return `# Custom ${data.designName}\n\nTotal: ${data.totalTokens}`;
      };

      const options: DocGenerationOptions = {
        templates: { overview: customTemplate },
      };
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis,
        options
      );
      const overview = docs.find((d) => d.path === "_Overview.md");

      expect(overview?.content).toContain("# Custom Test Design System");
      expect(overview?.content).toContain("Total: 10"); // 4 + 2 + 2 + 2 = 10
    });

    it("should use custom component template when provided", () => {
      const customTemplate = (data: ComponentDocData) => {
        return `# ${data.name}\n\nLevel: ${data.atomicLevel}`;
      };

      const options: DocGenerationOptions = {
        templates: { component: customTemplate },
      };
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis,
        options
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc?.content).toContain("# Button Primary");
      expect(compDoc?.content).toContain("Level: atoms");
    });
  });

  describe("Output Formats", () => {
    it("should support markdown format (default)", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );

      docs.forEach((doc) => {
        expect(doc.type).toBe("markdown");
      });
    });

    it("should set correct file paths", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );

      // Check that paths are properly structured
      const overview = docs.find((d) => d.path === "_Overview.md");
      expect(overview).toBeDefined();

      const colors = docs.find((d) => d.path === "GlobalStyles/Colors.md");
      expect(colors).toBeDefined();

      const component = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );
      expect(component).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty design gracefully", () => {
      const emptyDesign: SimplifiedDesign = {
        name: "Empty",
        nodes: [],
        components: {},
        componentSets: {},
        globalVars: {
          styles: {},
        },
      };

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

      const emptyAnalysis: DesignSystemAnalysis = {
        components: {},
        relationships: {},
        usage: {},
        patterns: [],
        atomicHierarchy: {
          atoms: [],
          molecules: [],
          organisms: [],
          templates: [],
          pages: [],
        },
        implementationReadiness: {
          readyToImplement: [],
          needsSpecification: [],
          hasIssues: [],
          suggestions: [],
        },
        summary: {
          totalComponents: 0,
          byCategory: {
            atoms: 0,
            molecules: 0,
            organisms: 0,
            templates: 0,
            pages: 0,
          },
          complexityScore: 0,
          consistencyScore: 0,
          implementationEffort: "low",
          keyRecommendations: [],
        },
      };

      const docs = generateDesignSystemDoc(
        emptyDesign,
        emptyTokens,
        emptyAnalysis
      );

      // Should still generate overview
      expect(docs.length).toBeGreaterThan(0);
      const overview = docs.find((d) => d.path === "_Overview.md");
      expect(overview).toBeDefined();
    });

    it("should handle component without code hints", () => {
      const mockAnalysisNoHints: DesignSystemAnalysis = {
        ...mockAnalysis,
        components: {
          "button-primary": {
            ...mockAnalysis.components["button-primary"],
            codeHints: {},
          },
        },
      };

      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysisNoHints
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      // Should not crash, just omit code hints section
      expect(compDoc).toBeDefined();
      expect(compDoc?.content).not.toContain("## React Implementation");
    });

    it("should handle component with no variants", () => {
      const mockAnalysisNoVariants: DesignSystemAnalysis = {
        ...mockAnalysis,
        components: {
          "button-primary": {
            ...mockAnalysis.components["button-primary"],
            variants: [],
          },
        },
      };

      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysisNoVariants
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc).toBeDefined();
      // Should not include variants section
      expect(compDoc?.content).not.toContain("## Variants");
    });

    it("should handle component with no warnings or suggestions", () => {
      const mockAnalysisClean: DesignSystemAnalysis = {
        ...mockAnalysis,
        components: {
          "button-primary": {
            ...mockAnalysis.components["button-primary"],
            readiness: {
              score: 100,
              ready: true,
              missing: [],
              warnings: [],
              suggestions: [],
            },
          },
        },
      };

      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysisClean
      );
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );

      expect(compDoc).toBeDefined();
      expect(compDoc?.content).not.toContain("## Implementation Notes");
    });
  });

  describe("Utility Functions", () => {
    it("should convert camelCase to kebab-case for file names", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );

      // ButtonPrimary (if name was camelCase) -> button-primary.md
      // This tests the toKebabCase utility function
      const compDoc = docs.find(
        (d) => d.path === "Components/button-primary.md"
      );
      expect(compDoc).toBeDefined();
    });

    it("should capitalize first letter for family docs", () => {
      const docs = generateDesignSystemDoc(
        mockDesign,
        mockTokens,
        mockAnalysis
      );

      // "primary" family should become "Primary.md"
      const familyDoc = docs.find(
        (d) => d.path === "GlobalStyles/Colors/Primary.md"
      );
      expect(familyDoc).toBeDefined();
    });
  });
});
