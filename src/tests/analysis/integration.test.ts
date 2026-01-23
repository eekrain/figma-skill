/**
 * Integration tests for component analysis
 */
import { describe, expect, it } from "@jest/globals";

import { analyzeComponents } from "@/analysis";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("Component Analysis Integration", () => {
  const createCompleteMockDesign = (): {
    compressed: CompressedDesign;
    nodes: SimplifiedNode[];
  } => {
    const compressed: CompressedDesign = {
      name: "Complete Mock Design",
      components: new Map([
        [
          "button",
          {
            id: "comp-button",
            name: "Button",
            description: "Interactive button component",
            slots: [
              {
                nodePath: "children[0].text",
                valueType: "text",
                variations: new Map([
                  ["text1", "Click me"],
                  ["text2", "Submit"],
                  ["text3", "Cancel"],
                ]),
                semanticName: "label",
              } as never,
              {
                nodePath: "fills",
                valueType: "fills",
                variations: new Map([
                  ["primary", "#007AFF"],
                  ["secondary", "#5AC8FA"],
                  ["ghost", "transparent"],
                ]),
                semanticName: "background-color",
              } as never,
              {
                nodePath: "stroke",
                valueType: "strokes",
                variations: new Map([
                  ["default", "#000000"],
                  ["white", "#ffffff"],
                ]),
                semanticName: "border-color",
              } as never,
            ],
            properties: {
              size: {
                type: "VARIANT",
                variantOptions: ["sm", "md", "lg", "xl"],
                defaultValue: "md",
              },
              disabled: {
                type: "BOOLEAN",
                defaultValue: false,
              },
            },
          } as never,
        ],
        [
          "card",
          {
            id: "comp-card",
            name: "Card",
            description: "Content container card",
            slots: [
              {
                nodePath: "children[0].text",
                valueType: "text",
                variations: new Map([
                  ["title1", "Card Title 1"],
                  ["title2", "Card Title 2"],
                ]),
                semanticName: "title",
              } as never,
              {
                nodePath: "children[1].text",
                valueType: "text",
                variations: new Map([["desc1", "Description"]]),
                semanticName: "description",
              } as never,
            ],
            properties: {},
          } as never,
        ],
        [
          "input",
          {
            id: "comp-input",
            name: "Input",
            description: "Form input field",
            slots: [],
            properties: {},
          } as never,
        ],
      ]),
      instances: [
        {
          id: "inst-button-primary",
          componentId: "comp-button",
          name: "Primary Button",
          overrides: {},
        } as never,
        {
          id: "inst-button-secondary",
          componentId: "comp-button",
          name: "Secondary Button",
          overrides: {},
        } as never,
        {
          id: "inst-button-large",
          componentId: "comp-button",
          name: "Large Button",
          overrides: {},
        } as never,
        {
          id: "inst-card-1",
          componentId: "comp-card",
          name: "Card 1",
          overrides: {},
        } as never,
        {
          id: "inst-card-2",
          componentId: "comp-card",
          name: "Card 2",
          overrides: {},
        } as never,
      ],
      nodes: [],
      globalVars: { styles: {} },
    };

    const nodes: SimplifiedNode[] = [
      // Button component
      {
        id: "comp-button",
        name: "Button",
        type: "COMPONENT",
        children: [
          {
            id: "button-label",
            name: "Label",
            type: "TEXT",
            text: "Button",
            children: [],
          },
        ],
      },
      // Card component
      {
        id: "comp-card",
        name: "Card",
        type: "COMPONENT",
        children: [
          {
            id: "card-title",
            name: "Title",
            type: "TEXT",
            text: "Card Title",
            children: [],
          },
          {
            id: "card-desc",
            name: "Description",
            type: "TEXT",
            text: "Card Description",
            children: [],
          },
        ],
      },
      // Input component
      {
        id: "comp-input",
        name: "Input",
        type: "COMPONENT",
        children: [],
      },
      // Page with instances
      {
        id: "page-home",
        name: "Home Page",
        type: "FRAME",
        children: [
          {
            id: "page-button-1",
            name: "Submit Button",
            type: "INSTANCE",
            componentId: "comp-button",
            children: [],
          },
          {
            id: "page-card-1",
            name: "Feature Card",
            type: "INSTANCE",
            componentId: "comp-card",
            children: [],
          },
        ],
      },
      // Button instances
      {
        id: "inst-button-primary",
        name: "Primary Button",
        type: "INSTANCE",
        componentId: "comp-button",
        children: [],
      },
      {
        id: "inst-button-secondary",
        name: "Secondary Button",
        type: "INSTANCE",
        componentId: "comp-button",
        children: [],
      },
      {
        id: "inst-button-large",
        name: "Large Button",
        type: "INSTANCE",
        componentId: "comp-button",
        children: [],
      },
    ];

    return { compressed, nodes };
  };

  describe("analyzeComponents", () => {
    it("should perform complete analysis", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeCodeHints: true,
        frameworks: ["react", "vue"],
        includeRelationships: true,
        includeUsage: true,
      });

      expect(analysis).toBeDefined();
      expect(analysis.components).toBeDefined();
      expect(analysis.relationships).toBeDefined();
      expect(analysis.usage).toBeDefined();
      expect(analysis.patterns).toBeDefined();
      expect(analysis.atomicHierarchy).toBeDefined();
      expect(analysis.implementationReadiness).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    it("should analyze individual components", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      expect(Object.keys(analysis.components).length).toBe(3);

      const button = analysis.components["button"];
      expect(button).toBeDefined();
      expect(button.name).toBe("Button");
      expect(button.key).toBe("button");
      expect(button.id).toBe("comp-button");
      expect(button.description).toBe("Interactive button component");
    });

    it("should infer props from compression slots", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      const button = analysis.components["button"];
      expect(button.props.length).toBeGreaterThan(0);

      // Check for various prop types from slots
      const labelProp = button.props.find((p) => p.name === "label");
      expect(labelProp).toBeDefined();
      expect(labelProp?.type).toBe("ReactNode");

      const bgColorProp = button.props.find(
        (p) => p.name === "backgroundColor"
      );
      expect(bgColorProp).toBeDefined();
      expect(bgColorProp?.type).toBe("enum");
      expect(bgColorProp?.enumValues).toContain("#007AFF");
    });

    it("should include Figma component properties", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      const button = analysis.components["button"];
      const sizeProp = button.props.find((p) => p.name === "size");
      expect(sizeProp).toBeDefined();
      expect(sizeProp?.type).toBe("enum");
      expect(sizeProp?.enumValues).toEqual(["sm", "md", "lg", "xl"]);

      const disabledProp = button.props.find((p) => p.name === "disabled");
      expect(disabledProp).toBeDefined();
      expect(disabledProp?.type).toBe("boolean");
    });

    it("should generate code hints when requested", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeCodeHints: true,
        frameworks: ["react"],
      });

      const button = analysis.components["button"];
      expect(button.codeHints.react).toBeDefined();
      expect(button.codeHints.react?.componentName).toBe("Button");
      expect(button.codeHints.react?.propsInterface).toContain(
        "interface ButtonProps"
      );
    });

    it("should not generate code hints when disabled", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeCodeHints: false,
      });

      const button = analysis.components["button"];
      expect(Object.keys(button.codeHints).length).toBe(0);
    });

    it("should analyze relationships when requested", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeRelationships: true,
      });

      expect(analysis.relationships).toBeDefined();
      expect(Object.keys(analysis.relationships).length).toBeGreaterThan(0);

      const buttonRel = analysis.relationships["button"];
      expect(buttonRel).toBeDefined();
      expect(buttonRel).toHaveProperty("parent");
      expect(buttonRel).toHaveProperty("children");
      expect(buttonRel).toHaveProperty("siblings");
      expect(buttonRel).toHaveProperty("dependsOn");
      expect(buttonRel).toHaveProperty("usedBy");
    });

    it("should not analyze relationships when disabled", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeRelationships: false,
      });

      expect(analysis.relationships).toEqual({});
    });

    it("should analyze usage when requested", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeUsage: true,
      });

      expect(analysis.usage).toBeDefined();
      expect(Object.keys(analysis.usage).length).toBeGreaterThan(0);

      const buttonUsage = analysis.usage["button"];
      expect(buttonUsage).toBeDefined();
      expect(buttonUsage.frequency).toBeGreaterThanOrEqual(0);
    });

    it("should not analyze usage when disabled", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes, {
        includeUsage: false,
      });

      expect(analysis.usage).toEqual({});
    });

    it("should detect design patterns", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(analysis.patterns.length).toBeGreaterThan(0);

      // Should detect button pattern
      const buttonPattern = analysis.patterns.find((p) =>
        p.name.includes("Button")
      );
      expect(buttonPattern).toBeDefined();
    });

    it("should build atomic hierarchy", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      expect(analysis.atomicHierarchy).toBeDefined();
      expect(analysis.atomicHierarchy.atoms).toBeDefined();
      expect(analysis.atomicHierarchy.molecules).toBeDefined();
      expect(analysis.atomicHierarchy.organisms).toBeDefined();
      expect(analysis.atomicHierarchy.templates).toBeDefined();
      expect(analysis.atomicHierarchy.pages).toBeDefined();
    });

    it("should assess implementation readiness", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      expect(analysis.implementationReadiness).toBeDefined();
      expect(analysis.implementationReadiness).toHaveProperty(
        "readyToImplement"
      );
      expect(analysis.implementationReadiness).toHaveProperty(
        "needsSpecification"
      );
      expect(analysis.implementationReadiness).toHaveProperty("hasIssues");
      expect(analysis.implementationReadiness).toHaveProperty("suggestions");
    });

    it("should generate analysis summary", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.totalComponents).toBe(3);
      expect(analysis.summary.byCategory).toBeDefined();
      expect(analysis.summary.complexityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.complexityScore).toBeLessThanOrEqual(100);
      expect(analysis.summary.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.consistencyScore).toBeLessThanOrEqual(100);
      expect(analysis.summary.implementationEffort).toMatch(/low|medium|high/);
      expect(analysis.summary.keyRecommendations).toBeDefined();
    });

    it("should include slots in component analysis", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      const button = analysis.components["button"];
      expect(button.slots).toBeDefined();
      expect(Array.isArray(button.slots)).toBe(true);
      expect(button.slots.length).toBeGreaterThan(0);
    });

    it("should use default options when not provided", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      // Should enable by default
      expect(analysis.components).toBeDefined();
      // Should include code hints by default
      const button = analysis.components["button"];
      expect(button.codeHints.react).toBeDefined();
    });
  });

  describe("Component Analysis Structure", () => {
    it("should return complete component analysis", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);
      const button = analysis.components["button"];

      expect(button).toHaveProperty("key");
      expect(button).toHaveProperty("id");
      expect(button).toHaveProperty("name");
      expect(button).toHaveProperty("description");
      expect(button).toHaveProperty("atomicLevel");
      expect(button).toHaveProperty("tags");
      expect(button).toHaveProperty("variants");
      expect(button).toHaveProperty("props");
      expect(button).toHaveProperty("slots");
      expect(button).toHaveProperty("readiness");
      expect(button).toHaveProperty("codeHints");
    });

    it("should properly categorize components by atomic level", () => {
      const { compressed, nodes } = createCompleteMockDesign();

      const analysis = analyzeComponents(compressed, nodes);

      // All components should have a valid atomic level
      const validLevels = [
        "atoms",
        "molecules",
        "organisms",
        "templates",
        "pages",
      ];
      for (const [key, component] of Object.entries(analysis.components)) {
        expect(validLevels).toContain(component.atomicLevel);
      }
    });
  });
});
