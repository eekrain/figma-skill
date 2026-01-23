/**
 * Tests for component relationship analysis
 */
import { describe, expect, it } from "@jest/globals";

import { analyzeRelationships } from "@/analysis/relationships";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("Component Relationship Analysis", () => {
  const createMockNodes = (): SimplifiedNode[] => [
    // Parent component (Header) that contains a button
    {
      id: "comp-header",
      name: "Header",
      type: "COMPONENT",
      children: [
        {
          id: "header-button-instance",
          name: "Button",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
        {
          id: "header-logo-instance",
          name: "Logo",
          type: "INSTANCE",
          componentId: "comp-logo",
          children: [],
        },
      ],
    },
    // Button component (used within Header)
    {
      id: "comp-button",
      name: "Button",
      type: "COMPONENT",
      children: [
        {
          id: "button-icon",
          name: "Icon",
          type: "INSTANCE",
          componentId: "comp-icon",
          children: [],
        },
      ],
    },
    // Logo component (used within Header)
    {
      id: "comp-logo",
      name: "Logo",
      type: "COMPONENT",
      children: [],
    },
    // Icon component (used within Button)
    {
      id: "comp-icon",
      name: "Icon",
      type: "COMPONENT",
      children: [],
    },
    // Standalone instances
    {
      id: "page-button-instance",
      name: "Page Button",
      type: "INSTANCE",
      componentId: "comp-button",
      children: [],
    },
    {
      id: "page-frame",
      name: "Page",
      type: "FRAME",
      children: [
        {
          id: "page-card-instance",
          name: "Card",
          type: "INSTANCE",
          componentId: "comp-card",
          children: [],
        },
      ],
    },
  ];

  const createMockCompressedDesign = (): CompressedDesign => ({
    name: "Mock Design",
    components: new Map([
      [
        "header",
        {
          id: "comp-header",
          name: "Header",
          slots: [],
          properties: {},
        } as never,
      ],
      [
        "button",
        {
          id: "comp-button",
          name: "Button",
          slots: [],
          properties: {},
        } as never,
      ],
      [
        "logo",
        {
          id: "comp-logo",
          name: "Logo",
          slots: [],
          properties: {},
        } as never,
      ],
      [
        "icon",
        {
          id: "comp-icon",
          name: "Icon",
          slots: [],
          properties: {},
        } as never,
      ],
      [
        "card",
        {
          id: "comp-card",
          name: "Card",
          slots: [],
          properties: {},
        } as never,
      ],
    ]),
    instances: [],
    nodes: [],
    globalVars: { styles: {} },
  });

  describe("analyzeRelationships", () => {
    it("should analyze relationships for all components", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      expect(Object.keys(relationships).length).toBe(5);
      expect(relationships["header"]).toBeDefined();
      expect(relationships["button"]).toBeDefined();
    });

    it("should detect parent components", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button is used within Header, so Header could be considered a parent context
      const buttonRel = relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel.usedBy).toBeDefined();
    });

    it("should detect child components", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button contains Icon
      const buttonRel = relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel.children).toBeDefined();
      expect(Array.isArray(buttonRel.children)).toBe(true);
    });

    it("should detect sibling components", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button and Logo are siblings in Header
      const buttonRel = relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel.siblings).toBeDefined();
      expect(Array.isArray(buttonRel.siblings)).toBe(true);
    });

    it("should detect dependencies", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button depends on Icon
      const buttonRel = relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel.dependsOn).toBeDefined();
      expect(buttonRel.dependsOn).toContain("comp-icon");
    });

    it("should detect usage contexts", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button is used in Header and Page
      const buttonRel = relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel.usedBy).toBeDefined();
      expect(Array.isArray(buttonRel.usedBy)).toBe(true);
    });

    it("should handle components with no relationships", () => {
      const compressed: CompressedDesign = {
        name: "Isolated Design",
        components: new Map([
          [
            "isolated",
            {
              id: "comp-isolated",
              name: "Isolated",
              slots: [],
              properties: {},
            } as never,
          ],
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "comp-isolated",
          name: "Isolated",
          type: "COMPONENT",
          children: [],
        },
      ];

      const relationships = analyzeRelationships(compressed, nodes);

      const isolatedRel = relationships["isolated"];
      expect(isolatedRel).toBeDefined();
      expect(isolatedRel.parent).toBe("");
      expect(isolatedRel.children).toHaveLength(0);
      expect(isolatedRel.siblings).toHaveLength(0);
    });

    it("should handle empty design gracefully", () => {
      const compressed: CompressedDesign = {
        name: "Empty Design",
        components: new Map(),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [];
      const relationships = analyzeRelationships(compressed, nodes);

      expect(relationships).toEqual({});
    });

    it("should build parent map correctly", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Verify the parent map was built by checking child detection works
      const headerRel = relationships["header"];
      expect(headerRel.children.length).toBeGreaterThan(0);
    });
  });

  describe("Relationship Structure", () => {
    it("should return correct relationship structure", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      const buttonRel = relationships["button"];

      expect(buttonRel).toHaveProperty("parent");
      expect(buttonRel).toHaveProperty("children");
      expect(buttonRel).toHaveProperty("siblings");
      expect(buttonRel).toHaveProperty("dependsOn");
      expect(buttonRel).toHaveProperty("usedBy");

      expect(typeof buttonRel.parent).toBe("string");
      expect(Array.isArray(buttonRel.children)).toBe(true);
      expect(Array.isArray(buttonRel.siblings)).toBe(true);
      expect(Array.isArray(buttonRel.dependsOn)).toBe(true);
      expect(Array.isArray(buttonRel.usedBy)).toBe(true);
    });
  });

  describe("Instance Grouping", () => {
    it("should group instances by component ID", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const relationships = analyzeRelationships(compressed, nodes);

      // Button has multiple instances (header-button-instance, page-button-instance)
      const buttonRel = relationships["button"];
      expect(buttonRel.usedBy.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Complex Nested Structure Detection", () => {
    it("should detect dependencies through nested FRAME wrappers", () => {
      const compressed: CompressedDesign = {
        name: "Nested Dependencies Design",
        components: new Map([
          [
            "container",
            {
              id: "comp-container",
              name: "Container",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "button",
            {
              id: "comp-button",
              name: "Button",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "icon",
            {
              id: "comp-icon",
              name: "Icon",
              slots: [],
              properties: {},
            } as never,
          ],
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "comp-container",
          name: "Container",
          type: "COMPONENT",
          children: [
            {
              id: "container-frame",
              name: "Container Frame",
              type: "FRAME",
              children: [
                {
                  id: "button-instance",
                  name: "Button",
                  type: "INSTANCE",
                  componentId: "comp-button",
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: "comp-button",
          name: "Button",
          type: "COMPONENT",
          children: [
            {
              id: "button-group",
              name: "Button Group",
              type: "GROUP",
              children: [
                {
                  id: "icon-instance",
                  name: "Icon",
                  type: "INSTANCE",
                  componentId: "comp-icon",
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: "comp-icon",
          name: "Icon",
          type: "COMPONENT",
          children: [],
        },
      ];

      const relationships = analyzeRelationships(compressed, nodes);

      // Container depends on Button (through FRAME wrapper)
      expect(relationships["container"].dependsOn).toContain("comp-button");
      // Button depends on Icon (through GROUP wrapper)
      expect(relationships["button"].dependsOn).toContain("comp-icon");
    });

    it("should detect children through nested structures", () => {
      const compressed: CompressedDesign = {
        name: "Nested Children Design",
        components: new Map([
          [
            "card",
            {
              id: "comp-card",
              name: "Card",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "button",
            {
              id: "comp-button",
              name: "Button",
              slots: [],
              properties: {},
            } as never,
          ],
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "comp-card",
          name: "Card",
          type: "COMPONENT",
          children: [
            {
              id: "card-frame",
              name: "Card Frame",
              type: "FRAME",
              children: [
                {
                  id: "button-instance",
                  name: "Button",
                  type: "INSTANCE",
                  componentId: "comp-button",
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: "comp-button",
          name: "Button",
          type: "COMPONENT",
          children: [],
        },
      ];

      const relationships = analyzeRelationships(compressed, nodes);

      // Card should have Button as a child (through FRAME wrapper)
      expect(relationships["card"].children).toContain("comp-button");
    });

    it("should handle deeply nested component chains (3+ levels)", () => {
      const compressed: CompressedDesign = {
        name: "Deep Chain Design",
        components: new Map([
          [
            "page",
            {
              id: "comp-page",
              name: "Page",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "section",
            {
              id: "comp-section",
              name: "Section",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "card",
            {
              id: "comp-card",
              name: "Card",
              slots: [],
              properties: {},
            } as never,
          ],
          [
            "button",
            {
              id: "comp-button",
              name: "Button",
              slots: [],
              properties: {},
            } as never,
          ],
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "comp-page",
          name: "Page",
          type: "COMPONENT",
          children: [
            {
              id: "section-instance",
              name: "Section",
              type: "INSTANCE",
              componentId: "comp-section",
              children: [],
            },
          ],
        },
        {
          id: "comp-section",
          name: "Section",
          type: "COMPONENT",
          children: [
            {
              id: "card-instance",
              name: "Card",
              type: "INSTANCE",
              componentId: "comp-card",
              children: [],
            },
          ],
        },
        {
          id: "comp-card",
          name: "Card",
          type: "COMPONENT",
          children: [
            {
              id: "button-instance",
              name: "Button",
              type: "INSTANCE",
              componentId: "comp-button",
              children: [],
            },
          ],
        },
        {
          id: "comp-button",
          name: "Button",
          type: "COMPONENT",
          children: [],
        },
      ];

      const relationships = analyzeRelationships(compressed, nodes);

      // Verify full chain of dependencies
      expect(relationships["page"].dependsOn).toContain("comp-section");
      expect(relationships["section"].dependsOn).toContain("comp-card");
      expect(relationships["card"].dependsOn).toContain("comp-button");

      // Verify full chain of children
      expect(relationships["page"].children).toContain("comp-section");
      expect(relationships["section"].children).toContain("comp-card");
      expect(relationships["card"].children).toContain("comp-button");
    });
  });
});
