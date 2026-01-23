/**
 * Tests for component readiness assessment
 */
import { describe, expect, it } from "@jest/globals";

import {
  assessComponentReadiness,
  assessImplementationReadiness,
  generateAnalysisSummary,
} from "@/analysis/readiness";
import type {
  ComponentAnalysis,
  ComponentVariant,
  InferredProp,
} from "@/analysis/types";
import type { SlotDefinition } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("Component Readiness Assessment", () => {
  const createMockProps = (): InferredProp[] => [
    {
      name: "variant",
      type: "enum",
      enumValues: ["primary", "secondary"],
      defaultValue: "primary",
      required: false,
    },
    {
      name: "children",
      type: "ReactNode",
      required: true,
    },
  ];

  const createMockVariants = (): ComponentVariant[] => [
    {
      name: "primary",
      property: "variant",
      value: "primary",
      componentId: "comp-1",
    },
    {
      name: "secondary",
      property: "variant",
      value: "secondary",
      componentId: "comp-2",
    },
  ];

  const createMockSlots = (): SlotDefinition[] => [
    {
      nodePath: "children[0].text",
      valueType: "text",
      variations: new Map([
        ["text1", "Card One"],
        ["text2", "Card Two"],
      ]),
    } as SlotDefinition,
  ];

  describe("assessComponentReadiness", () => {
    it("should give high score for well-specified components", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Button",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        createMockProps(),
        createMockVariants(),
        createMockSlots()
      );

      expect(readiness.score).toBeGreaterThan(70);
      expect(readiness.ready).toBe(true);
      expect(readiness.missing).toHaveLength(0);
    });

    it("should warn when no props are inferred", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Box",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(mockNode, [], [], []);

      expect(readiness.warnings).toContain(
        "No props inferred - component may not be configurable"
      );
      expect(readiness.score).toBeLessThan(100);
    });

    it("should suggest adding variants when none exist", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Button",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        createMockProps(),
        [],
        []
      );

      expect(readiness.suggestions).toContain(
        "Consider adding component variants for different states/sizes"
      );
    });

    it("should warn about missing accessibility props", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Button",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        createMockProps(),
        createMockVariants(),
        createMockSlots()
      );

      // Check if any warning contains "accessibility"
      const hasAccessibilityWarning = readiness.warnings.some((w) =>
        w.toLowerCase().includes("accessibility")
      );
      expect(hasAccessibilityWarning).toBe(true);

      // Check if any suggestion contains "ARIA"
      const hasAriaSuggestion = readiness.suggestions.some((s) =>
        s.includes("ARIA")
      );
      expect(hasAriaSuggestion).toBe(true);
    });

    it("should suggest adding states for interactive components", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Button",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        createMockProps(),
        [], // No state variants
        []
      );

      // Check if any suggestion contains "hover/active/disabled"
      const hasStateSuggestion = readiness.suggestions.some((s) =>
        s.includes("hover/active/disabled")
      );
      expect(hasStateSuggestion).toBe(true);
    });

    it("should warn about slots without props", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Card",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        [], // No props
        [],
        createMockSlots() // Has slots
      );

      // Check if any warning contains "slots"
      const hasSlotsWarning = readiness.warnings.some((w) =>
        w.toLowerCase().includes("slots")
      );
      expect(hasSlotsWarning).toBe(true);
    });

    it("should handle undefined node gracefully", () => {
      const readiness = assessComponentReadiness(
        undefined,
        createMockProps(),
        createMockVariants(),
        createMockSlots()
      );

      expect(readiness.score).toBeDefined();
      expect(readiness.ready).toBeDefined();
    });

    it("should calculate score based on issues", () => {
      const mockNode: SimplifiedNode = {
        id: "node-1",
        name: "Box",
        type: "INSTANCE",
        componentId: "comp-1",
      };

      const readiness = assessComponentReadiness(
        mockNode,
        [], // No props (warning)
        [], // No variants (suggestion)
        []
      );

      // Should deduct for warning and suggestion
      expect(readiness.score).toBeLessThan(90);
      expect(readiness.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("assessImplementationReadiness", () => {
    const createMockComponents = (): Record<string, ComponentAnalysis> => ({
      "button-ready": {
        key: "button-ready",
        id: "comp-1",
        name: "Button Ready",
        atomicLevel: "atoms",
        tags: ["atoms", "interactive"],
        variants: createMockVariants(),
        props: createMockProps(),
        slots: [],
        readiness: {
          score: 85,
          ready: true,
          missing: [],
          warnings: [],
          suggestions: [],
        },
        codeHints: {},
      },
      "card-needs-spec": {
        key: "card-needs-spec",
        id: "comp-2",
        name: "Card Needs Spec",
        atomicLevel: "molecules",
        tags: ["molecules"],
        variants: [],
        props: [],
        slots: [],
        readiness: {
          score: 50,
          ready: false,
          missing: [],
          warnings: ["No props inferred"],
          suggestions: ["Add variants"],
        },
        codeHints: {},
      },
      "input-has-issues": {
        key: "input-has-issues",
        id: "comp-3",
        name: "Input Has Issues",
        atomicLevel: "atoms",
        tags: ["atoms"],
        variants: [],
        props: [],
        slots: [],
        readiness: {
          score: 30,
          ready: false,
          missing: ["Missing required functionality"],
          warnings: ["No accessibility"],
          suggestions: [],
        },
        codeHints: {},
      },
      "header-organism": {
        key: "header-organism",
        id: "comp-4",
        name: "Header Organism",
        atomicLevel: "organisms",
        tags: ["organisms"],
        variants: [],
        props: [],
        slots: [],
        readiness: {
          score: 60,
          ready: false,
          missing: [],
          warnings: [],
          suggestions: ["Add more variants"],
        },
        codeHints: {},
      },
    });

    it("should categorize components by readiness", () => {
      const readiness = assessImplementationReadiness(createMockComponents());

      expect(readiness.readyToImplement).toContain("button-ready");
      expect(readiness.needsSpecification).toContain("card-needs-spec");
      expect(readiness.needsSpecification).toContain("header-organism");
      expect(readiness.hasIssues).toContain("input-has-issues");
    });

    it("should provide overall suggestions", () => {
      const readiness = assessImplementationReadiness(createMockComponents());

      expect(readiness.suggestions).toBeDefined();
      expect(readiness.suggestions.length).toBeGreaterThan(0);
      // Check if any suggestion contains "variant"
      const hasVariantSuggestion = readiness.suggestions.some((s) =>
        s.toLowerCase().includes("variant")
      );
      expect(hasVariantSuggestion).toBe(true);
    });

    it("should suggest breaking down complex organisms", () => {
      const readiness = assessImplementationReadiness(createMockComponents());

      // Check if any suggestion contains "organisms"
      const hasOrganismSuggestion = readiness.suggestions.some((s) =>
        s.toLowerCase().includes("organisms")
      );
      expect(hasOrganismSuggestion).toBe(true);
    });

    it("should handle empty components", () => {
      const readiness = assessImplementationReadiness({});

      expect(readiness.readyToImplement).toHaveLength(0);
      expect(readiness.needsSpecification).toHaveLength(0);
      expect(readiness.hasIssues).toHaveLength(0);
      // Empty components result in empty suggestions (no components to analyze)
      expect(readiness.suggestions).toBeDefined();
    });
  });

  describe("generateAnalysisSummary", () => {
    const createMockComponents = (): Record<string, ComponentAnalysis> => ({
      button: {
        key: "button",
        id: "comp-1",
        name: "Button",
        atomicLevel: "atoms",
        tags: ["atoms"],
        variants: [],
        props: [],
        slots: [],
        readiness: {
          score: 80,
          ready: true,
          missing: [],
          warnings: [],
          suggestions: [],
        },
        codeHints: {},
      },
      card: {
        key: "card",
        id: "comp-2",
        name: "Card",
        atomicLevel: "molecules",
        tags: ["molecules"],
        variants: [],
        props: [],
        slots: [],
        readiness: {
          score: 60,
          ready: false,
          missing: [],
          warnings: [],
          suggestions: [],
        },
        codeHints: {},
      },
    });

    it("should calculate component counts by category", () => {
      const summary = generateAnalysisSummary(createMockComponents(), [], {
        readyToImplement: [],
        needsSpecification: [],
        hasIssues: [],
        suggestions: [],
      });

      expect(summary.totalComponents).toBe(2);
      expect(summary.byCategory.atoms).toBe(1);
      expect(summary.byCategory.molecules).toBe(1);
    });

    it("should calculate complexity score", () => {
      const summary = generateAnalysisSummary(
        createMockComponents(),
        [
          {
            name: "Pattern",
            components: [],
            description: "",
            usage: "",
            implementation: "",
          },
        ],
        {
          readyToImplement: [],
          needsSpecification: [],
          hasIssues: [],
          suggestions: [],
        }
      );

      expect(summary.complexityScore).toBeGreaterThan(0);
      expect(summary.complexityScore).toBeLessThanOrEqual(100);
    });

    it("should calculate consistency score", () => {
      const components = createMockComponents();
      const summary = generateAnalysisSummary(components, [], {
        readyToImplement: ["button"],
        needsSpecification: ["card"],
        hasIssues: [],
        suggestions: [],
      });

      expect(summary.consistencyScore).toBeGreaterThan(0);
      expect(summary.consistencyScore).toBeLessThanOrEqual(100);
    });

    it("should determine implementation effort based on component count", () => {
      const summarySmall = generateAnalysisSummary(createMockComponents(), [], {
        readyToImplement: [],
        needsSpecification: [],
        hasIssues: [],
        suggestions: [],
      });

      expect(summarySmall.implementationEffort).toMatch(/low|medium|high/);

      // Test with many components
      const manyComponents: Record<string, ComponentAnalysis> = {};
      for (let i = 0; i < 35; i++) {
        manyComponents[`comp-${i}`] = {
          key: `comp-${i}`,
          id: `comp-${i}`,
          name: `Component ${i}`,
          atomicLevel: "atoms",
          tags: ["atoms"],
          variants: [],
          props: [],
          slots: [],
          readiness: {
            score: 80,
            ready: true,
            missing: [],
            warnings: [],
            suggestions: [],
          },
          codeHints: {},
        };
      }

      const summaryLarge = generateAnalysisSummary(manyComponents, [], {
        readyToImplement: [],
        needsSpecification: [],
        hasIssues: [],
        suggestions: [],
      });

      expect(summaryLarge.implementationEffort).toBe("high");
    });

    it("should generate key recommendations", () => {
      const summary = generateAnalysisSummary(createMockComponents(), [], {
        readyToImplement: ["button"],
        needsSpecification: ["card"],
        hasIssues: [],
        suggestions: ["Add variants"],
      });

      expect(summary.keyRecommendations).toBeDefined();
      expect(summary.keyRecommendations.length).toBeGreaterThan(0);
      // Check if any recommendation contains something about component count or multiple components
      const hasComponentCountRecommendation = summary.keyRecommendations.some(
        (r) => r.includes("components") || r.match(/\d+\s+component/)
      );
      expect(hasComponentCountRecommendation).toBe(true);
    });

    it("should recommend standardizing when consistency is low", () => {
      const summary = generateAnalysisSummary(createMockComponents(), [], {
        readyToImplement: [],
        needsSpecification: ["button", "card"],
        hasIssues: [],
        suggestions: [],
      });

      // Check if any recommendation contains "standardizing"
      const hasStandardizingRecommendation = summary.keyRecommendations.some(
        (r) => r.toLowerCase().includes("standardizing")
      );
      expect(hasStandardizingRecommendation).toBe(true);
    });
  });
});
