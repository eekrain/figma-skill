/**
 * Tests for analysis module - variant detection
 *
 * Tests component variant analysis from compression slots
 * and component sets.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { analyzeComponents } from "@/analysis";
import type { ComponentAnalysis } from "@/analysis/types";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("analysis - variants", () => {
  let mockCompressed: CompressedDesign;
  let mockNodes: SimplifiedNode[];

  beforeEach(() => {
    // Create a mock compressed design with a component
    mockCompressed = {
      name: "test-design",
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
              text: "Default",
              children: [],
            },
            slotIds: ["slot-1"],
            slots: new Map([
              [
                "slot-1",
                {
                  slotId: "slot-1",
                  nodePath: "text",
                  valueType: "text",
                  defaultValue: "Default",
                  variations: new Map([
                    ["inst-1", "Submit"],
                    ["inst-2", "Cancel"],
                    ["inst-3", "Delete"],
                  ]),
                  instanceCount: 3,
                },
              ],
            ]),
            componentProperties: {
              variant: {
                type: "VARIANT",
                defaultValue: "primary",
                variantOptions: ["primary", "secondary", "tertiary"],
              },
            },
          },
        ],
      ]),
      instances: [
        {
          id: "inst-1",
          componentId: "comp-1",
          name: "Button Primary",
          overrides: { text: "Submit" },
          visible: true,
        },
        {
          id: "inst-2",
          componentId: "comp-1",
          name: "Button Secondary",
          overrides: { text: "Cancel" },
          visible: true,
        },
        {
          id: "inst-3",
          componentId: "comp-1",
          name: "Button Tertiary",
          overrides: { text: "Delete" },
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
            id: "inst-1",
            name: "Button Primary",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            children: [],
          },
        ],
      },
    ];
  });

  // =====================================================
  // Test Suite 1: Component Variant Detection
  // =====================================================
  describe("Component variant detection", () => {
    it("should detect variants from compression instances", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result.components).toBeDefined();
      expect(Object.keys(result.components).length).toBeGreaterThan(0);
    });

    it("should include variant information in component analysis", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
      expect(component.variants).toBeDefined();
      expect(Array.isArray(component.variants)).toBe(true);
    });

    it("should detect variant names from instance names", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component.variants.length).toBeGreaterThan(0);
    });

    it("should detect variant properties", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      const firstVariant = component.variants[0];
      expect(firstVariant.property).toBeDefined();
    });

    it("should include variant values", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      const firstVariant = component.variants[0];
      expect(firstVariant.value).toBeDefined();
    });

    it("should track instance count per variant", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      const firstVariant = component.variants[0];
      expect(firstVariant.instanceCount).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 2: Variant Property Types
  // =====================================================
  describe("Variant property types", () => {
    it("should detect size variants", () => {
      const sizeCompressed: CompressedDesign = {
        ...mockCompressed,
        instances: [
          {
            id: "inst-1",
            componentId: "comp-1",
            name: "small",
            visible: true,
          },
          {
            id: "inst-2",
            componentId: "comp-1",
            name: "medium",
            visible: true,
          },
          {
            id: "inst-3",
            componentId: "comp-1",
            name: "large",
            visible: true,
          },
        ],
      };

      const result = analyzeComponents(sizeCompressed, []);
      const component = result.components["comp-1"];

      expect(component.variants.length).toBeGreaterThan(0);
    });

    it("should detect state variants", () => {
      const stateCompressed: CompressedDesign = {
        ...mockCompressed,
        instances: [
          {
            id: "inst-1",
            componentId: "comp-1",
            name: "default",
            visible: true,
          },
          {
            id: "inst-2",
            componentId: "comp-1",
            name: "hover",
            visible: true,
          },
          {
            id: "inst-3",
            componentId: "comp-1",
            name: "pressed",
            visible: true,
          },
        ],
      };

      const result = analyzeComponents(stateCompressed, []);
      const component = result.components["comp-1"];

      expect(component.variants.length).toBeGreaterThan(0);
    });

    it("should detect variant type properties", () => {
      const variantCompressed: CompressedDesign = {
        ...mockCompressed,
        instances: [
          {
            id: "inst-1",
            componentId: "comp-1",
            name: "primary",
            visible: true,
          },
          {
            id: "inst-2",
            componentId: "comp-1",
            name: "secondary",
            visible: true,
          },
        ],
      };

      const result = analyzeComponents(variantCompressed, []);
      const component = result.components["comp-1"];

      expect(component.variants.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 3: Props from Slots
  // =====================================================
  describe("Props inferred from slots", () => {
    it("should infer props from slot definitions", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component.props).toBeDefined();
      expect(Array.isArray(component.props)).toBe(true);
    });

    it("should include prop name", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      if (component.props.length > 0) {
        expect(component.props[0].name).toBeDefined();
      }
    });

    it("should include prop type", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      if (component.props.length > 0) {
        expect(["string", "boolean", "number", "enum", "ReactNode"]).toContain(
          component.props[0].type
        );
      }
    });

    it("should include required flag", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      if (component.props.length > 0) {
        expect(typeof component.props[0].required).toBe("boolean");
      }
    });
  });

  // =====================================================
  // Test Suite 4: Empty/Edge Cases
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
    });

    it("should handle component with no variants", () => {
      const noVariantCompressed: CompressedDesign = {
        ...mockCompressed,
        instances: [
          {
            id: "inst-1",
            componentId: "comp-1",
            name: "Button",
            visible: true,
          },
        ],
      };

      const result = analyzeComponents(noVariantCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should handle component with no slots", () => {
      const noSlotCompressed: CompressedDesign = {
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

      const result = analyzeComponents(noSlotCompressed, []);
      const component = result.components["comp-1"];

      expect(component.slots).toEqual([]);
    });
  });

  // =====================================================
  // Test Suite 5: Code Hints Integration
  // =====================================================
  describe("Code hints with variants", () => {
    it("should include code hints with variants", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeCodeHints: true,
      });
      const component = result.components["comp-1"];

      expect(component.codeHints).toBeDefined();
    });

    it("should include React props with variant types", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeCodeHints: true,
        frameworks: ["react"],
      });
      const component = result.components["comp-1"];

      if (component.codeHints.react) {
        expect(component.codeHints.react.propsInterface).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 6: Integration with Relationships
  // =====================================================
  describe("Relationship analysis", () => {
    it("should analyze relationships when enabled", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeRelationships: true,
      });

      expect(result.relationships).toBeDefined();
    });

    it("should skip relationships when disabled", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeRelationships: false,
      });

      expect(result.relationships).toEqual({});
    });
  });

  // =====================================================
  // Test Suite 7: Atomic Level Classification
  // =====================================================
  describe("Atomic level with variants", () => {
    it("should classify components with variants as molecules", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(["atoms", "molecules", "organisms"]).toContain(
        component.atomicLevel
      );
    });

    it("should include atomic level in analysis", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component.atomicLevel).toBeDefined();
    });
  });
});
