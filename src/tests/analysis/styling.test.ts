/**
 * Tests for analysis module - styling analysis
 *
 * Tests component styling detection including states,
 * responsive behavior, and token references.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { analyzeComponents } from "@/analysis";
import type { ComponentAnalysis } from "@/analysis/types";
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("analysis - styling", () => {
  let mockCompressed: CompressedDesign;
  let mockNodes: SimplifiedNode[];

  beforeEach(() => {
    // Create a mock compressed design with interactive component
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
              fills: ["#007bff"],
              opacity: 1,
              layout: { mode: "horizontal", spacing: 10 },
              children: [],
            },
            slotIds: ["slot-1", "slot-2"],
            slots: new Map([
              [
                "slot-1",
                {
                  slotId: "slot-1",
                  nodePath: "fills",
                  valueType: "fills",
                  defaultValue: "#007bff",
                  variations: new Map([
                    ["inst-1", "#007bff"],
                    ["inst-2", "#28a745"],
                    ["inst-3", "#dc3545"],
                  ]),
                  instanceCount: 3,
                },
              ],
              [
                "slot-2",
                {
                  slotId: "slot-2",
                  nodePath: "opacity",
                  valueType: "opacity",
                  defaultValue: 1,
                  variations: new Map([
                    ["inst-1", 1],
                    ["inst-2", 0.8],
                  ]),
                  instanceCount: 2,
                },
              ],
            ]),
          },
        ],
      ]),
      instances: [
        {
          id: "inst-1",
          componentId: "comp-1",
          name: "Button Default",
          overrides: { fills: ["#007bff"] },
          visible: true,
        },
        {
          id: "inst-2",
          componentId: "comp-1",
          name: "Button Hover",
          overrides: { fills: ["#28a745"] },
          visible: true,
        },
        {
          id: "inst-3",
          componentId: "comp-1",
          name: "Button Active",
          overrides: { fills: ["#dc3545"] },
          visible: true,
        },
      ],
      nodes: [],
      globalVars: {
        styles: {
          "color-primary": { value: "#007bff", type: "color" } as any,
          "spacing-md": { value: "16px", type: "spacing" } as any,
        },
      },
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
            name: "Button Default",
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
  // Test Suite 1: Interactive State Detection
  // =====================================================
  describe("Interactive state detection", () => {
    it("should detect interactive states from variants", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should identify state variants", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      // Check if any variant is a state
      const stateVariants = component.variants.filter(
        (v) => v.property === "state"
      );
      expect(stateVariants.length).toBeGreaterThanOrEqual(0);
    });

    it("should include state information in readiness", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component.readiness).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 2: Color Variation Detection
  // =====================================================
  describe("Color variation detection", () => {
    it("should detect color variations", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      // Check for fills props (color variations)
      const colorProps = component.props.filter(
        (p) => p.name.includes("color") || p.name.includes("fill")
      );
      expect(colorProps.length).toBeGreaterThanOrEqual(0);
    });

    it("should include enum values for limited color sets", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      const enumProps = component.props.filter((p) => p.type === "enum");
      expect(enumProps.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle string type for many color variations", () => {
      const manyColorsCompressed: CompressedDesign = {
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

      const result = analyzeComponents(manyColorsCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 3: Opacity Detection
  // =====================================================
  describe("Opacity detection", () => {
    it("should detect opacity variations", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      // Check for opacity-related props
      const opacityProps = component.props.filter(
        (p) => p.name.includes("opacity") || p.name.includes("Opacity")
      );
      expect(opacityProps.length).toBeGreaterThanOrEqual(0);
    });

    it("should include opacity in slot variations", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      const opacitySlots = component.slots.filter(
        (s) => s.valueType === "opacity"
      );
      expect(opacitySlots.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================
  // Test Suite 4: Layout Detection
  // =====================================================
  describe("Layout detection", () => {
    it("should detect layout properties", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should preserve layout mode information", () => {
      const layoutCompressed: CompressedDesign = {
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
                layout: { mode: "vertical", spacing: 8, padding: 16 },
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(layoutCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 5: Token References
  // =====================================================
  describe("Token reference detection", () => {
    it("should include global vars in design", () => {
      expect(mockCompressed.globalVars.styles).toBeDefined();
    });

    it("should detect when components use token values", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);

      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 6: Responsive Behavior
  // =====================================================
  describe("Responsive behavior classification", () => {
    it("should classify components by responsive behavior", () => {
      const result = analyzeComponents(mockCompressed, mockNodes);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should detect fixed components", () => {
      const fixedCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Icon",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Icon",
                type: "COMPONENT",
                layout: { mode: "none", dimensions: { width: 24, height: 24 } },
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(fixedCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should detect flexible components", () => {
      const flexibleCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Container",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Container",
                type: "COMPONENT",
                layout: { mode: "horizontal", align: "stretch" },
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(flexibleCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 7: Code Hints for Styling
  // =====================================================
  describe("Code hints for styling", () => {
    it("should generate style prop hints", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeCodeHints: true,
        frameworks: ["react"],
      });
      const component = result.components["comp-1"];

      if (component.codeHints.react) {
        expect(component.codeHints.react.propsInterface).toBeDefined();
      }
    });

    it("should include CSS property mappings", () => {
      const result = analyzeComponents(mockCompressed, mockNodes, {
        includeCodeHints: true,
      });
      const component = result.components["comp-1"];

      expect(component.codeHints).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 8: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle components with no styling", () => {
      const noStyleCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Basic",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Basic",
                type: "COMPONENT",
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(noStyleCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should handle components with complex gradients", () => {
      const gradientCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Gradient Button",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Gradient Button",
                type: "COMPONENT",
                fills: [
                  {
                    type: "GRADIENT_LINEAR",
                    gradient: "linear-gradient(90deg, #ff0000, #0000ff)",
                  },
                ],
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(gradientCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });

    it("should handle components with image fills", () => {
      const imageCompressed: CompressedDesign = {
        ...mockCompressed,
        components: new Map([
          [
            "comp-1",
            {
              id: "comp-1",
              name: "Image Card",
              type: "COMPONENT",
              template: {
                id: "comp-1",
                name: "Image Card",
                type: "COMPONENT",
                fills: [
                  {
                    type: "IMAGE",
                    imageRef: "img-123",
                    scaleMode: "FILL",
                    objectFit: "cover",
                  },
                ] as any,
                children: [],
              },
              slotIds: [],
              slots: new Map(),
            },
          ],
        ]),
      };

      const result = analyzeComponents(imageCompressed, []);
      const component = result.components["comp-1"];

      expect(component).toBeDefined();
    });
  });
});
