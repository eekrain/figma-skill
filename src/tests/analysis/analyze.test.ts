/**
 * Tests for core component analysis
 */
import { describe, expect, it } from "@jest/globals";

import { analyzeIndividualComponents } from "@/analysis/analyze";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("Core Component Analysis", () => {
  const createMockCompressedDesign = (): CompressedDesign => ({
    name: "Mock Design",
    components: new Map([
      [
        "button-primary",
        {
          id: "comp-button-primary",
          name: "Button Primary",
          description: "Primary button variant",
          slots: [
            {
              nodePath: "children[0].text",
              valueType: "text",
              variations: new Map([
                ["text1", "Click me"],
                ["text2", "Submit"],
              ]),
              semanticName: "button-text",
            } as never,
            {
              nodePath: "fills",
              valueType: "fills",
              variations: new Map([
                ["fill1", "#007AFF"],
                ["fill2", "#5AC8FA"],
              ]),
              semanticName: "background-color",
            } as never,
            {
              nodePath: "visible",
              valueType: "visibility",
              variations: new Map([
                ["true", true],
                ["false", false],
              ]),
              semanticName: "icon",
            } as never,
          ],
          properties: {
            size: {
              type: "VARIANT",
              variantOptions: ["sm", "md", "lg"],
              defaultValue: "md",
            },
          },
        } as never,
      ],
      [
        "card",
        {
          id: "comp-card",
          name: "Card",
          description: "Content card",
          slots: [
            {
              nodePath: "children[0].text",
              valueType: "text",
              variations: new Map([["text1", "Card Title"]]),
              semanticName: "title",
            } as never,
          ],
          properties: {},
        } as never,
      ],
    ]),
    instances: [
      {
        id: "inst-button-1",
        componentId: "comp-button-primary",
        name: "Primary Button",
        overrides: {},
      } as never,
      {
        id: "inst-button-2",
        componentId: "comp-button-primary",
        name: "Large Button",
        overrides: {},
      } as never,
    ],
    nodes: [],
    globalVars: { styles: {} },
  });

  const createMockNodes = (): SimplifiedNode[] => [
    {
      id: "comp-button-primary",
      name: "Button Primary",
      type: "COMPONENT",
      children: [
        {
          id: "child-1",
          name: "Text",
          type: "TEXT",
          text: "Click me",
          children: [],
        },
      ],
    },
    {
      id: "inst-button-1",
      name: "Button Instance",
      type: "INSTANCE",
      componentId: "comp-button-primary",
      children: [],
    },
    {
      id: "comp-card",
      name: "Card",
      type: "COMPONENT",
      children: [],
    },
  ];

  describe("analyzeIndividualComponents", () => {
    it("should analyze components from compressed design", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      expect(components).toBeDefined();
      expect(Object.keys(components).length).toBeGreaterThan(0);
    });

    it("should infer props from compression slots", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary).toBeDefined();
      expect(buttonPrimary.props.length).toBeGreaterThan(0);

      // Check text slot prop
      const textProp = buttonPrimary.props.find((p) => p.name === "buttonText");
      expect(textProp).toBeDefined();
      expect(textProp?.type).toBe("ReactNode");

      // Check color slot prop
      const colorProp = buttonPrimary.props.find(
        (p) => p.name === "backgroundColor"
      );
      expect(colorProp).toBeDefined();
      expect(colorProp?.type).toBe("enum");

      // Check visibility slot prop
      const visibilityProp = buttonPrimary.props.find(
        (p) => p.name === "showIcon"
      );
      expect(visibilityProp).toBeDefined();
      expect(visibilityProp?.type).toBe("boolean");
    });

    it("should include Figma component properties", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      const sizeProp = buttonPrimary.props.find((p) => p.name === "size");
      expect(sizeProp).toBeDefined();
      expect(sizeProp?.type).toBe("enum");
      expect(sizeProp?.enumValues).toEqual(["sm", "md", "lg"]);
    });

    it("should classify atomic levels correctly", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      // Button should be classified as atom (simple structure)
      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary.atomicLevel).toMatch(/atoms|molecules/);

      // Card should be classified based on its structure
      const card = components["card"];
      expect(card.atomicLevel).toMatch(/atoms|molecules|organisms/);
    });

    it("should generate tags based on component name and props", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary.tags).toBeDefined();
      expect(buttonPrimary.tags.length).toBeGreaterThan(0);
    });

    it("should generate code hints when requested", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(
        compressed,
        nodes,
        true, // includeCodeHints
        ["react"]
      );

      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary.codeHints).toBeDefined();
      expect(buttonPrimary.codeHints.react).toBeDefined();
      expect(buttonPrimary.codeHints.react?.componentName).toBeDefined();
    });

    it("should not generate code hints when disabled", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(
        compressed,
        nodes,
        false, // includeCodeHints = false
        ["react"]
      );

      const buttonPrimary = components["button-primary"];
      expect(Object.keys(buttonPrimary.codeHints).length).toBe(0);
    });

    it("should handle empty compressed design", () => {
      const compressed: CompressedDesign = {
        name: "Empty Design",
        components: new Map(),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [];
      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      expect(components).toEqual({});
    });

    it("should handle components with no slots", () => {
      const compressed: CompressedDesign = {
        name: "Simple Box Design",
        components: new Map([
          [
            "simple-box",
            {
              id: "comp-simple-box",
              name: "Simple Box",
              description: "A simple box",
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
          id: "comp-simple-box",
          name: "Simple Box",
          type: "COMPONENT",
          children: [],
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const simpleBox = components["simple-box"];
      expect(simpleBox).toBeDefined();
      expect(simpleBox.slots).toEqual([]);
    });
  });

  describe("Variant Analysis", () => {
    it("should detect variants from compression instances", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary.variants).toBeDefined();
      expect(buttonPrimary.variants.length).toBeGreaterThan(0);
    });

    it("should count instances per variant", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      const variantWithCount = buttonPrimary.variants.find(
        (v) => v.instanceCount
      );

      expect(variantWithCount).toBeDefined();
      expect(variantWithCount?.instanceCount).toBeGreaterThan(0);
    });
  });

  describe("Prop Inference", () => {
    it("should infer prop type from slot valueType", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];

      // Text slot -> ReactNode
      const textProp = buttonPrimary.props.find((p) => p.type === "ReactNode");
      expect(textProp).toBeDefined();

      // Color slot -> enum or string
      const colorProp = buttonPrimary.props.find((p) =>
        ["enum", "string"].includes(p.type)
      );
      expect(colorProp).toBeDefined();

      // Visibility slot -> boolean
      const boolProp = buttonPrimary.props.find((p) => p.type === "boolean");
      expect(boolProp).toBeDefined();
    });

    it("should infer enum values when variations are limited", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      const colorProp = buttonPrimary.props.find(
        (p) => p.name === "backgroundColor"
      );

      expect(colorProp?.type).toBe("enum");
      expect(colorProp?.enumValues).toBeDefined();
    });

    it("should skip slots with no variations", () => {
      const compressed: CompressedDesign = {
        name: "Static Component Design",
        components: new Map([
          [
            "static-component",
            {
              id: "comp-static",
              name: "Static Component",
              slots: [
                {
                  nodePath: "static-prop",
                  valueType: "text",
                  variations: new Map([["only-value", "Same"]]), // Only one value
                  semanticName: "static",
                } as never,
              ],
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
          id: "comp-static",
          name: "Static Component",
          type: "COMPONENT",
          children: [],
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const staticComponent = components["static-component"];
      // Should not have props from slots with no variations
      const staticProp = staticComponent.props.find((p) => p.name === "static");
      expect(staticProp).toBeUndefined();
    });
  });

  describe("Atomic Level Classification", () => {
    it("should classify simple components as atoms", () => {
      const compressed: CompressedDesign = {
        name: "Icon Design",
        components: new Map([
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
          id: "comp-icon",
          name: "Icon",
          type: "COMPONENT",
          children: [], // No children = atom
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      expect(components["icon"].atomicLevel).toBe("atoms");
    });

    it("should classify complex components as organisms or templates", () => {
      const children: SimplifiedNode[] = [];
      for (let i = 0; i < 25; i++) {
        children.push({
          id: `child-${i}`,
          name: `Child ${i}`,
          type: "FRAME",
          children: [],
        });
      }

      const compressed: CompressedDesign = {
        name: "Complex Component Design",
        components: new Map([
          [
            "complex",
            {
              id: "comp-complex",
              name: "Complex Component",
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
          id: "comp-complex",
          name: "Complex Component",
          type: "COMPONENT",
          children,
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      // Many children = template or organism
      expect(["organisms", "templates"]).toContain(
        components["complex"].atomicLevel
      );
    });
  });

  describe("Tag Generation", () => {
    it("should add atomic level as a tag", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      const buttonPrimary = components["button-primary"];
      expect(buttonPrimary.tags).toContain(buttonPrimary.atomicLevel);
    });

    it("should detect button components and add interactive tag", () => {
      const compressed: CompressedDesign = {
        name: "Button Design",
        components: new Map([
          [
            "button",
            {
              id: "comp-button",
              name: "My Button",
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
          id: "comp-button",
          name: "My Button",
          type: "COMPONENT",
          children: [],
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      expect(components["button"].tags).toContain("button");
      expect(components["button"].tags).toContain("interactive");
    });

    it("should detect link components from props", () => {
      const compressed: CompressedDesign = {
        name: "Link Design",
        components: new Map([
          [
            "link",
            {
              id: "comp-link",
              name: "Link",
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
          id: "comp-link",
          name: "Link",
          type: "COMPONENT",
          children: [],
        },
      ];

      const components = analyzeIndividualComponents(compressed, nodes, true, [
        "react",
      ]);

      // Need to add href prop manually since we're not inferring it
      components["link"].props.push({
        name: "href",
        type: "string",
        required: true,
      });

      expect(components["link"].tags).toContain("link");
      expect(components["link"].tags).toContain("navigation");
    });
  });
});
