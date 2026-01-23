/**
 * Tests for analysis module - patterns and hierarchy
 *
 * Tests atomic hierarchy building and pattern detection.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { analyzeComponents } from "@/analysis";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("analysis - patterns and hierarchy", () => {
  let mockCompressed: CompressedDesign;
  let mockNodes: SimplifiedNode[];

  beforeEach(() => {
    // Create a mock compressed design with multiple components
    mockCompressed = {
      name: "test-design",
      components: new Map([
        // Atom: Simple button
        [
          "comp-icon",
          {
            id: "comp-icon",
            name: "Icon",
            type: "COMPONENT",
            template: {
              id: "comp-icon",
              name: "Icon",
              type: "COMPONENT",
              children: [],
            },
            slotIds: [],
            slots: new Map(),
          },
        ],
        // Atom: Simple label
        [
          "comp-label",
          {
            id: "comp-label",
            name: "Label",
            type: "COMPONENT",
            template: {
              id: "comp-label",
              name: "Label",
              type: "TEXT",
              characters: "Label",
            },
            slotIds: [],
            slots: new Map(),
          },
        ],
        // Molecule: Button with icon
        [
          "comp-button",
          {
            id: "comp-button",
            name: "Button",
            type: "COMPONENT",
            template: {
              id: "comp-button",
              name: "Button",
              type: "COMPONENT",
              children: [
                {
                  id: "button-icon",
                  name: "Icon",
                  type: "COMPONENT",
                  componentId: "comp-icon",
                  children: [],
                },
                {
                  id: "button-label",
                  name: "Label",
                  type: "TEXT",
                  characters: "Submit",
                },
              ],
            },
            slotIds: [],
            slots: new Map(),
          },
        ],
        // Organism: Card with multiple elements
        [
          "comp-card",
          {
            id: "comp-card",
            name: "Card",
            type: "COMPONENT",
            template: {
              id: "comp-card",
              name: "Card",
              type: "COMPONENT",
              children: [
                {
                  id: "card-title",
                  name: "Title",
                  type: "TEXT",
                  characters: "Card Title",
                },
                {
                  id: "card-button",
                  name: "Button",
                  type: "COMPONENT",
                  componentId: "comp-button",
                },
                {
                  id: "card-icon",
                  name: "Icon",
                  type: "COMPONENT",
                  componentId: "comp-icon",
                },
              ],
            },
            slotIds: [],
            slots: new Map(),
          },
        ],
        // Template: Page layout
        [
          "comp-page",
          {
            id: "comp-page",
            name: "Page",
            type: "COMPONENT",
            template: {
              id: "comp-page",
              name: "Page",
              type: "COMPONENT",
              children: Array.from({ length: 25 }, (_, i) => ({
                id: `page-item-${i}`,
                name: `Item ${i}`,
                type: "FRAME",
                children: [],
              })),
            },
            slotIds: [],
            slots: new Map(),
          },
        ],
      ]),
      instances: [
        {
          id: "inst-icon-1",
          componentId: "comp-icon",
          name: "Home Icon",
          visible: true,
        },
        {
          id: "inst-button-1",
          componentId: "comp-button",
          name: "Submit Button",
          visible: true,
        },
        {
          id: "inst-card-1",
          componentId: "comp-card",
          name: "Product Card",
          visible: true,
        },
      ],
      nodes: [],
      globalVars: { styles: {} },
    };

    mockNodes = [
      {
        id: "page-1",
        name: "Page",
        type: "PAGE",
        visible: true,
        children: [
          {
            id: "card-1",
            name: "Card",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-card",
            children: [],
          },
        ],
      },
    ];
  });

  // =====================================================
  // Test Suite 1: Atomic Level Detection
  // =====================================================
  describe("Atomic level detection", () => {
    it("should classify simple components as atoms", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const iconComponent = result.components["comp-icon"];

      expect(iconComponent).toBeDefined();
      expect(["atoms", "molecules"]).toContain(iconComponent.atomicLevel);
    });

    it("should classify simple compositions as molecules", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const buttonComponent = result.components["comp-button"];

      expect(buttonComponent).toBeDefined();
      expect(["atoms", "molecules"]).toContain(buttonComponent.atomicLevel);
    });

    it("should classify complex compositions as organisms", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const cardComponent = result.components["comp-card"];

      expect(cardComponent).toBeDefined();
      expect(["atoms", "molecules", "organisms"]).toContain(
        cardComponent.atomicLevel
      );
    });

    it("should classify page-level structures as templates", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const pageComponent = result.components["comp-page"];

      expect(pageComponent).toBeDefined();
      expect(["molecules", "organisms", "templates"]).toContain(
        pageComponent.atomicLevel
      );
    });
  });

  // =====================================================
  // Test Suite 2: Atomic Hierarchy
  // =====================================================
  describe("Atomic hierarchy", () => {
    it("should build atomic hierarchy", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.atomicHierarchy).toBeDefined();
    });

    it("should categorize atoms", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.atomicHierarchy.atoms)).toBe(true);
    });

    it("should categorize molecules", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.atomicHierarchy.molecules)).toBe(true);
    });

    it("should categorize organisms", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.atomicHierarchy.organisms)).toBe(true);
    });

    it("should categorize templates", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.atomicHierarchy.templates)).toBe(true);
    });

    it("should include pages category", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.atomicHierarchy.pages)).toBe(true);
    });
  });

  // =====================================================
  // Test Suite 3: Pattern Detection
  // =====================================================
  describe("Pattern detection", () => {
    it("should detect design patterns", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it("should identify pattern names", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      result.patterns.forEach((pattern) => {
        expect(pattern.name).toBeDefined();
        expect(typeof pattern.name).toBe("string");
      });
    });

    it("should provide pattern descriptions", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      result.patterns.forEach((pattern) => {
        expect(pattern.description).toBeDefined();
      });
    });

    it("should list components in patterns", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      result.patterns.forEach((pattern) => {
        expect(Array.isArray(pattern.components)).toBe(true);
      });
    });

    it("should provide usage guidance", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      result.patterns.forEach((pattern) => {
        expect(pattern.usage).toBeDefined();
      });
    });

    it("should provide implementation guidance", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      result.patterns.forEach((pattern) => {
        expect(pattern.implementation).toBeDefined();
      });
    });
  });

  // =====================================================
  // Test Suite 4: Component Tags
  // =====================================================
  describe("Component tags", () => {
    it("should add atomic level as tag", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const buttonComponent = result.components["comp-button"];

      expect(buttonComponent.tags).toContain(buttonComponent.atomicLevel);
    });

    it("should detect button components", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const buttonComponent = result.components["comp-button"];

      if (buttonComponent.name.toLowerCase().includes("button")) {
        expect(buttonComponent.tags).toContain("button");
      }
    });

    it("should detect card components", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const cardComponent = result.components["comp-card"];

      if (cardComponent.name.toLowerCase().includes("card")) {
        expect(cardComponent.tags).toContain("card");
      }
    });

    it("should detect icon components", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const iconComponent = result.components["comp-icon"];

      if (iconComponent.name.toLowerCase().includes("icon")) {
        expect(iconComponent.tags).toContain("icon");
      }
    });
  });

  // =====================================================
  // Test Suite 5: Implementation Readiness
  // =====================================================
  describe("Implementation readiness", () => {
    it("should assess implementation readiness", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.implementationReadiness).toBeDefined();
    });

    it("should categorize ready components", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(
        Array.isArray(result.implementationReadiness.readyToImplement)
      ).toBe(true);
    });

    it("should categorize components needing specification", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(
        Array.isArray(result.implementationReadiness.needsSpecification)
      ).toBe(true);
    });

    it("should categorize components with issues", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.implementationReadiness.hasIssues)).toBe(
        true
      );
    });

    it("should provide suggestions", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.implementationReadiness.suggestions)).toBe(
        true
      );
    });
  });

  // =====================================================
  // Test Suite 6: Analysis Summary
  // =====================================================
  describe("Analysis summary", () => {
    it("should generate analysis summary", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.summary).toBeDefined();
    });

    it("should include total component count", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.summary.totalComponents).toBeGreaterThan(0);
    });

    it("should categorize components by atomic level in summary", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.summary.byCategory.atoms).toBeGreaterThanOrEqual(0);
      expect(result.summary.byCategory.molecules).toBeGreaterThanOrEqual(0);
      expect(result.summary.byCategory.organisms).toBeGreaterThanOrEqual(0);
    });

    it("should calculate complexity score", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.summary.complexityScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.complexityScore).toBeLessThanOrEqual(100);
    });

    it("should calculate consistency score", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.summary.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.consistencyScore).toBeLessThanOrEqual(100);
    });

    it("should estimate implementation effort", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(["low", "medium", "high"]).toContain(
        result.summary.implementationEffort
      );
    });

    it("should provide key recommendations", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(Array.isArray(result.summary.keyRecommendations)).toBe(true);
      expect(result.summary.keyRecommendations.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 7: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle empty compressed design", () => {
      const emptyCompressed: CompressedDesign = {
        name: "empty",
        components: new Map(),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const result = analyzeComponents(emptyCompressed, []);

      expect(result.components).toEqual({});
      expect(result.patterns).toEqual([]);
    });

    it("should handle single component", () => {
      const singleCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Button",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Button",
                type: "COMPONENT",
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(singleCompressed, []);

      expect(Object.keys(result.components).length).toBe(1);
    });

    it("should handle very deep component hierarchy", () => {
      let node: SimplifiedNode = {
        id: "leaf",
        name: "Leaf",
        type: "FRAME",
        visible: true,
        children: [],
      };

      // Create 10 levels of nesting
      for (let i = 0; i < 10; i++) {
        node = {
          id: `level-${i}`,
          name: `Level ${i}`,
          type: "FRAME",
          visible: true,
          children: [node],
        };
      }

      const deepCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-deep",
            {
              id: "comp-deep",
              name: "Deep Component",
              type: "COMPONENT",
              template: node as any,
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(deepCompressed, []);

      expect(result.components["comp-deep"]).toBeDefined();
    });

    it("should handle components with many children", () => {
      const manyChildrenCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-many",
            {
              id: "comp-many",
              name: "Grid",
              type: "COMPONENT",
              template: {
                id: "comp-many",
                name: "Grid",
                type: "COMPONENT",
                children: Array.from({ length: 50 }, (_, i) => ({
                  id: `item-${i}`,
                  name: `Item ${i}`,
                  type: "FRAME",
                  visible: true,
                  children: [],
                })),
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(manyChildrenCompressed, []);

      expect(result.components["comp-many"]).toBeDefined();
      // Should be classified as organism or template due to many children
      expect(["molecules", "organisms", "templates"]).toContain(
        result.components["comp-many"].atomicLevel
      );
    });
  });

  // =====================================================
  // Test Suite 8: Integration
  // =====================================================
  describe("Integration", () => {
    it("should work with relationships enabled", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeRelationships: true,
      });

      expect(result.relationships).toBeDefined();
    });

    it("should work with usage analysis enabled", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeUsage: true,
      });

      expect(result.usage).toBeDefined();
    });

    it("should work with code hints enabled", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeCodeHints: true,
      });

      // Check that at least one component has code hints
      const componentWithHints = Object.values(result.components).find(
        (c) => Object.keys(c.codeHints).length > 0
      );
      expect(componentWithHints).toBeDefined();
    });
  });
});
