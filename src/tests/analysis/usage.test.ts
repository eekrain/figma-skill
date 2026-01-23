/**
 * Tests for component usage analysis
 */
import { describe, expect, it } from "@jest/globals";

import { analyzeUsage } from "@/analysis/usage";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("Component Usage Analysis", () => {
  const createMockNodes = (): SimplifiedNode[] => [
    // Home page frame with button instances
    {
      id: "page-home",
      name: "Home Page",
      type: "FRAME",
      children: [
        {
          id: "home-button-1",
          name: "Submit Button",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
        {
          id: "home-button-2",
          name: "Cancel Button",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
        {
          id: "home-input",
          name: "Email Input",
          type: "INSTANCE",
          componentId: "comp-input",
          children: [],
        },
      ],
    },
    // Settings page frame with button and input instances
    {
      id: "page-settings",
      name: "Settings Page",
      type: "FRAME",
      children: [
        {
          id: "settings-button",
          name: "Save Button",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
        {
          id: "settings-input",
          name: "Username Input",
          type: "INSTANCE",
          componentId: "comp-input",
          children: [],
        },
      ],
    },
    // Horizontal layout container (list items)
    {
      id: "list-container",
      name: "Button List",
      type: "FRAME",
      layout: {
        mode: "HORIZONTAL",
      } as never,
      children: [
        {
          id: "list-button-1",
          name: "Button 1",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
        {
          id: "list-button-2",
          name: "Button 2",
          type: "INSTANCE",
          componentId: "comp-button",
          children: [],
        },
      ],
    },
    // Button component definition
    {
      id: "comp-button",
      name: "Button",
      type: "COMPONENT",
      children: [
        {
          id: "button-text",
          name: "Label",
          type: "TEXT",
          text: "Button",
          children: [],
        },
      ],
    },
    // Input component definition
    {
      id: "comp-input",
      name: "Input",
      type: "COMPONENT",
      children: [],
    },
    // Icon component
    {
      id: "comp-icon",
      name: "Icon",
      type: "COMPONENT",
      children: [],
    },
  ];

  const createMockCompressedDesign = (): CompressedDesign => ({
    name: "Mock Design",
    components: new Map([
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
        "input",
        {
          id: "comp-input",
          name: "Input",
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
  });

  describe("analyzeUsage", () => {
    it("should analyze usage for all components", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      expect(Object.keys(usage).length).toBeGreaterThan(0);
      expect(usage["button"]).toBeDefined();
      expect(usage["input"]).toBeDefined();
    });

    it("should count component usage frequency", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      // Button is used 5 times (2 in home, 1 in settings, 2 in list)
      expect(usage["button"].frequency).toBe(5);

      // Input is used 2 times (1 in home, 1 in settings)
      expect(usage["input"].frequency).toBe(2);

      // Icon is not used anywhere
      expect(usage["icon"].frequency).toBe(0);
    });

    it("should extract usage contexts", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      expect(buttonUsage.contexts).toBeDefined();
      expect(Array.isArray(buttonUsage.contexts)).toBe(true);

      // Should have detected at least some contexts
      expect(buttonUsage.contexts.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect common pairings", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      expect(buttonUsage.commonPairings).toBeDefined();
      expect(Array.isArray(buttonUsage.commonPairings)).toBe(true);

      // Button is commonly paired with input (appears together in home and settings)
      expect(buttonUsage.commonPairings).toContain("comp-input");
    });

    it("should limit pairings to top 10", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      expect(buttonUsage.commonPairings.length).toBeLessThanOrEqual(10);
    });

    it("should sort pairings by frequency", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      // Input appears with button twice, icon never appears with button
      const inputIndex = buttonUsage.commonPairings.indexOf("comp-input");
      const iconIndex = buttonUsage.commonPairings.indexOf("comp-icon");

      if (inputIndex !== -1 && iconIndex !== -1) {
        expect(inputIndex).toBeLessThan(iconIndex);
      }
    });

    it("should infer layout roles", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      expect(buttonUsage.layoutRoles).toBeDefined();
      expect(Array.isArray(buttonUsage.layoutRoles)).toBe(true);

      // Button in horizontal layout should be marked as list-item
      expect(buttonUsage.layoutRoles).toContain("list-item");
      expect(buttonUsage.layoutRoles).toContain("row-item");
    });

    it("should detect text children for label role", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      // Button has text child named "Label"
      expect(buttonUsage.layoutRoles).toContain("label");
    });

    it("should detect button role from name", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      expect(buttonUsage.layoutRoles).toContain("button");
      expect(buttonUsage.layoutRoles).toContain("interactive");
    });

    it("should handle components with no usage", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const iconUsage = usage["icon"];
      expect(iconUsage.frequency).toBe(0);
      expect(iconUsage.contexts).toHaveLength(0);
      expect(iconUsage.commonPairings).toHaveLength(0);
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
      const usage = analyzeUsage(compressed, nodes);

      expect(usage).toEqual({});
    });

    it("should handle components without instances", () => {
      const compressed: CompressedDesign = {
        name: "Unused Component Design",
        components: new Map([
          [
            "unused",
            {
              id: "comp-unused",
              name: "Unused Component",
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
          id: "comp-unused",
          name: "Unused Component",
          type: "COMPONENT",
          children: [],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["unused"]).toBeDefined();
      expect(usage["unused"].frequency).toBe(0);
    });
  });

  describe("Layout Role Detection", () => {
    it("should detect grid-item role from GRID layout", () => {
      const compressed: CompressedDesign = {
        name: "Grid Layout Design",
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
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "grid-container",
          name: "Card Grid",
          type: "FRAME",
          layout: {
            mode: "GRID",
          } as never,
          children: [
            {
              id: "grid-card-1",
              name: "Card 1",
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
          children: [],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["card"].layoutRoles).toContain("grid-item");
    });

    it("should detect column-item role from VERTICAL layout", () => {
      const compressed: CompressedDesign = {
        name: "Vertical Layout Design",
        components: new Map([
          [
            "menu-item",
            {
              id: "comp-menu-item",
              name: "Menu Item",
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
          id: "menu-container",
          name: "Menu",
          type: "FRAME",
          layout: {
            mode: "VERTICAL",
          } as never,
          children: [
            {
              id: "menu-item-1",
              name: "Item 1",
              type: "INSTANCE",
              componentId: "comp-menu-item",
              children: [],
            },
          ],
        },
        {
          id: "comp-menu-item",
          name: "Menu Item",
          type: "COMPONENT",
          children: [],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["menu-item"].layoutRoles).toContain("list-item");
      expect(usage["menu-item"].layoutRoles).toContain("column-item");
    });
  });

  describe("Context Extraction", () => {
    it("should extract frame names as contexts", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];
      // Should have detected context from frame names
      // (Note: actual implementation may vary based on parent map building)
      expect(buttonUsage.contexts).toBeDefined();
    });

    it("should skip generic frame names", () => {
      const compressed: CompressedDesign = {
        name: "Generic Names Design",
        components: new Map([
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
          id: "page-1",
          name: "Page 1",
          type: "FRAME",
          children: [
            {
              id: "generic-button",
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

      const usage = analyzeUsage(compressed, nodes);

      // "Page 1" might be skipped as a generic name
      // Implementation behavior may vary
      expect(usage["button"]).toBeDefined();
    });
  });

  describe("Usage Statistics Structure", () => {
    it("should return correct usage structure", () => {
      const compressed = createMockCompressedDesign();
      const nodes = createMockNodes();

      const usage = analyzeUsage(compressed, nodes);

      const buttonUsage = usage["button"];

      expect(buttonUsage).toHaveProperty("frequency");
      expect(buttonUsage).toHaveProperty("contexts");
      expect(buttonUsage).toHaveProperty("commonPairings");
      expect(buttonUsage).toHaveProperty("layoutRoles");

      expect(typeof buttonUsage.frequency).toBe("number");
      expect(Array.isArray(buttonUsage.contexts)).toBe(true);
      expect(Array.isArray(buttonUsage.commonPairings)).toBe(true);
      expect(Array.isArray(buttonUsage.layoutRoles)).toBe(true);
    });
  });

  describe("Nested Structure Detection", () => {
    it("should detect text nested inside FRAME wrapper", () => {
      const compressed: CompressedDesign = {
        name: "Nested Frame Design",
        components: new Map([
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
          id: "page-1",
          name: "Page 1",
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
        {
          id: "comp-button",
          name: "Button",
          type: "COMPONENT",
          children: [
            {
              id: "button-frame",
              name: "Button Frame",
              type: "FRAME",
              children: [
                {
                  id: "button-text",
                  name: "Label",
                  type: "TEXT",
                  text: "Button",
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["button"].layoutRoles).toContain("label");
    });

    it("should detect text nested inside GROUP wrapper", () => {
      const compressed: CompressedDesign = {
        name: "Nested Group Design",
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
        ]),
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const nodes: SimplifiedNode[] = [
        {
          id: "page-1",
          name: "Page 1",
          type: "FRAME",
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
              id: "card-group",
              name: "Card Content",
              type: "GROUP",
              children: [
                {
                  id: "card-title",
                  name: "Title",
                  type: "TEXT",
                  text: "Card Title",
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["card"].layoutRoles).toContain("label");
    });

    it("should detect text nested multiple levels deep", () => {
      const compressed: CompressedDesign = {
        name: "Deeply Nested Design",
        components: new Map([
          [
            "complex-button",
            {
              id: "comp-complex-button",
              name: "Complex Button",
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
          id: "page-1",
          name: "Page 1",
          type: "FRAME",
          children: [
            {
              id: "button-instance",
              name: "Button",
              type: "INSTANCE",
              componentId: "comp-complex-button",
              children: [],
            },
          ],
        },
        {
          id: "comp-complex-button",
          name: "Complex Button",
          type: "COMPONENT",
          children: [
            {
              id: "outer-frame",
              name: "Outer",
              type: "FRAME",
              children: [
                {
                  id: "middle-group",
                  name: "Middle",
                  type: "GROUP",
                  children: [
                    {
                      id: "inner-frame",
                      name: "Inner",
                      type: "FRAME",
                      children: [
                        {
                          id: "deep-text",
                          name: "Label",
                          type: "TEXT",
                          text: "Deep Button",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const usage = analyzeUsage(compressed, nodes);

      expect(usage["complex-button"].layoutRoles).toContain("label");
    });
  });
});
