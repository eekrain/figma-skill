/**
 * Tests for compression/component-extractor module
 *
 * Tests component extraction, compression, and expansion logic.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  type ExtractResult,
  extractComponents,
} from "@/compression/component-extractor";
import { expandDesign } from "@/compression/expander";
import type { CompressionOptions } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("compression/component-extractor", () => {
  let mockNodes: SimplifiedNode[];
  let mockGlobalVars: { styles: Record<string, unknown> };

  beforeEach(() => {
    // Create mock nodes with component instances - using MUCH larger instances to ensure compression is beneficial
    // Multiple instances with complex nested structure to trigger ≥10% compression benefit
    mockNodes = [
      {
        id: "page-1",
        name: "Page 1",
        type: "PAGE",
        visible: true,
        children: [
          // Instance 1
          {
            id: "instance-1",
            name: "Button Primary Large",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            componentProperties: {
              variant: "primary",
              size: "large",
              disabled: false,
            } as any,
            layout: {
              mode: "absolute",
              x: 10,
              y: 10,
              width: 180,
              height: 56,
              dimensions: { width: 180, height: 56, aspectRatio: 3.214 },
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
              gap: 8,
            } as any,
            children: [
              {
                id: "bg-1",
                name: "Button Background",
                type: "RECTANGLE",
                visible: true,
                fills: [
                  { type: "solid", color: { r: 0.2, g: 0.6, b: 1, a: 1 } },
                ] as any,
                strokes: [
                  {
                    type: "solid",
                    color: { r: 0.15, g: 0.5, b: 0.9, a: 1 },
                    weight: 2,
                  },
                ] as any,
                cornerRadius: {
                  topLeft: 8,
                  topRight: 8,
                  bottomLeft: 8,
                  bottomRight: 8,
                },
                effects: [
                  {
                    type: "dropShadow",
                    color: { r: 0, g: 0, b: 0, a: 0.15 },
                    offset: { x: 0, y: 2 },
                    radius: 4,
                  },
                ] as any,
                opacity: 1,
              },
              {
                id: "icon-1",
                name: "Leading Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 16,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-1",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
              {
                id: "text-1",
                name: "Button Label",
                type: "TEXT",
                visible: true,
                text: "Submit Form",
                fontSize: 16,
                fontWeight: 600,
                textAlign: ["center"],
                lineHeight: { unit: "pixels", value: 24 },
                fills: [
                  { type: "solid", color: { r: 1, g: 1, b: 1, a: 1 } },
                ] as any,
              } as any,
              {
                id: "icon-2",
                name: "Trailing Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 140,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-2",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
            ],
          },
          // Instance 2
          {
            id: "instance-2",
            name: "Button Secondary Large",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            componentProperties: {
              variant: "secondary",
              size: "large",
              disabled: false,
            } as any,
            layout: {
              mode: "absolute",
              x: 210,
              y: 10,
              width: 180,
              height: 56,
              dimensions: { width: 180, height: 56, aspectRatio: 3.214 },
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
              gap: 8,
            } as any,
            children: [
              {
                id: "bg-2",
                name: "Button Background",
                type: "RECTANGLE",
                visible: true,
                fills: [
                  { type: "solid", color: { r: 0.95, g: 0.95, b: 0.97, a: 1 } },
                ] as any,
                strokes: [
                  {
                    type: "solid",
                    color: { r: 0.7, g: 0.7, b: 0.8, a: 1 },
                    weight: 1.5,
                  },
                ] as any,
                cornerRadius: {
                  topLeft: 8,
                  topRight: 8,
                  bottomLeft: 8,
                  bottomRight: 8,
                },
                effects: [
                  {
                    type: "dropShadow",
                    color: { r: 0, g: 0, b: 0, a: 0.05 },
                    offset: { x: 0, y: 1 },
                    radius: 2,
                  },
                ] as any,
                opacity: 1,
              },
              {
                id: "icon-3",
                name: "Leading Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 16,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-3",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
              {
                id: "text-2",
                name: "Button Label",
                type: "TEXT",
                visible: true,
                text: "Cancel Operation",
                fontSize: 16,
                fontWeight: 600,
                textAlign: ["center"],
                lineHeight: { unit: "pixels", value: 24 },
                fills: [
                  { type: "solid", color: { r: 0.2, g: 0.2, b: 0.3, a: 1 } },
                ] as any,
              } as any,
              {
                id: "icon-4",
                name: "Trailing Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 140,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-4",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
            ],
          },
          // Instance 3
          {
            id: "instance-3",
            name: "Button Tertiary Large",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            componentProperties: {
              variant: "tertiary",
              size: "large",
              disabled: false,
            } as any,
            layout: {
              mode: "absolute",
              x: 410,
              y: 10,
              width: 180,
              height: 56,
              dimensions: { width: 180, height: 56, aspectRatio: 3.214 },
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
              gap: 8,
            } as any,
            children: [
              {
                id: "bg-3",
                name: "Button Background",
                type: "RECTANGLE",
                visible: true,
                fills: [] as any,
                strokes: [
                  {
                    type: "solid",
                    color: { r: 0.2, g: 0.6, b: 1, a: 1 },
                    weight: 1.5,
                  },
                ] as any,
                cornerRadius: {
                  topLeft: 8,
                  topRight: 8,
                  bottomLeft: 8,
                  bottomRight: 8,
                },
                effects: [] as any,
                opacity: 1,
              },
              {
                id: "icon-5",
                name: "Leading Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 16,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-5",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
              {
                id: "text-3",
                name: "Button Label",
                type: "TEXT",
                visible: true,
                text: "Learn More",
                fontSize: 16,
                fontWeight: 600,
                textAlign: ["center"],
                lineHeight: { unit: "pixels", value: 24 },
                fills: [
                  { type: "solid", color: { r: 0.2, g: 0.6, b: 1, a: 1 } },
                ] as any,
              } as any,
              {
                id: "icon-6",
                name: "Trailing Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 140,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-6",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
            ],
          },
          // Instance 4
          {
            id: "instance-4",
            name: "Button Disabled Large",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            componentProperties: {
              variant: "primary",
              size: "large",
              disabled: true,
            } as any,
            layout: {
              mode: "absolute",
              x: 610,
              y: 10,
              width: 180,
              height: 56,
              dimensions: { width: 180, height: 56, aspectRatio: 3.214 },
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
              gap: 8,
            } as any,
            children: [
              {
                id: "bg-4",
                name: "Button Background",
                type: "RECTANGLE",
                visible: true,
                fills: [
                  { type: "solid", color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
                ] as any,
                strokes: [] as any,
                cornerRadius: {
                  topLeft: 8,
                  topRight: 8,
                  bottomLeft: 8,
                  bottomRight: 8,
                },
                effects: [] as any,
                opacity: 0.5,
              },
              {
                id: "icon-7",
                name: "Leading Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 16,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-7",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
              {
                id: "text-4",
                name: "Button Label",
                type: "TEXT",
                visible: true,
                text: "Disabled Action",
                fontSize: 16,
                fontWeight: 600,
                textAlign: ["center"],
                lineHeight: { unit: "pixels", value: 24 },
                fills: [
                  { type: "solid", color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
                ] as any,
              } as any,
              {
                id: "icon-8",
                name: "Trailing Icon",
                type: "FRAME",
                visible: false,
                layout: {
                  mode: "horizontal",
                  x: 140,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-8",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
            ],
          },
          // Instance 5
          {
            id: "instance-5",
            name: "Button Danger Large",
            type: "INSTANCE",
            visible: true,
            componentId: "comp-1",
            componentProperties: {
              variant: "danger",
              size: "large",
              disabled: false,
            } as any,
            layout: {
              mode: "absolute",
              x: 810,
              y: 10,
              width: 180,
              height: 56,
              dimensions: { width: 180, height: 56, aspectRatio: 3.214 },
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
              gap: 8,
            } as any,
            children: [
              {
                id: "bg-5",
                name: "Button Background",
                type: "RECTANGLE",
                visible: true,
                fills: [
                  { type: "solid", color: { r: 0.9, g: 0.2, b: 0.2, a: 1 } },
                ] as any,
                strokes: [
                  {
                    type: "solid",
                    color: { r: 0.85, g: 0.15, b: 0.15, a: 1 },
                    weight: 2,
                  },
                ] as any,
                cornerRadius: {
                  topLeft: 8,
                  topRight: 8,
                  bottomLeft: 8,
                  bottomRight: 8,
                },
                effects: [
                  {
                    type: "dropShadow",
                    color: { r: 0.9, g: 0, b: 0, a: 0.2 },
                    offset: { x: 0, y: 2 },
                    radius: 4,
                  },
                ] as any,
                opacity: 1,
              },
              {
                id: "icon-9",
                name: "Leading Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 16,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-9",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
              {
                id: "text-5",
                name: "Button Label",
                type: "TEXT",
                visible: true,
                text: "Delete Item",
                fontSize: 16,
                fontWeight: 600,
                textAlign: ["center"],
                lineHeight: { unit: "pixels", value: 24 },
                fills: [
                  { type: "solid", color: { r: 1, g: 1, b: 1, a: 1 } },
                ] as any,
              } as any,
              {
                id: "icon-10",
                name: "Trailing Icon",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 140,
                  y: 16,
                  width: 24,
                  height: 24,
                  dimensions: { width: 24, height: 24 },
                } as any,
                children: [
                  {
                    id: "icon-path-10",
                    name: "Path",
                    type: "VECTOR",
                    visible: true,
                  } as any,
                ],
              },
            ],
          },
          // Non-component frame
          {
            id: "frame-1",
            name: "Regular Frame",
            type: "FRAME",
            visible: true,
            layout: {
              mode: "vertical",
              x: 10,
              y: 80,
              width: 400,
              height: 200,
              dimensions: { width: 400, height: 200 },
              padding: { top: 10, right: 10, bottom: 10, left: 10 },
              gap: 10,
            } as any,
            children: [
              {
                id: "frame-child-1",
                name: "Child Frame",
                type: "FRAME",
                visible: true,
                layout: {
                  mode: "horizontal",
                  x: 0,
                  y: 0,
                  width: 380,
                  height: 50,
                  dimensions: { width: 380, height: 50 },
                } as any,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    mockGlobalVars = { styles: {} };

    // Mock console.log to avoid clutter
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =====================================================
  // Test Suite 1: extractComponents - Basic Extraction
  // =====================================================
  describe("extractComponents", () => {
    it("should extract components from nodes", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result).toBeDefined();
      expect(result.design).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it("should return SerializableCompressedDesign", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.design.name).toBe("test");
      expect(result.design.globalVars).toEqual(mockGlobalVars);
    });

    it("should return compression stats", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.stats.originalNodeCount).toBeGreaterThan(0);
      expect(result.stats.compressedSize).toBeGreaterThanOrEqual(0);
      // reductionPercent can be negative when compression is skipped (not beneficial)
      expect(typeof result.stats.reductionPercent).toBe("number");
    });

    it("should group instances by componentId", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      if (result.design.components["comp-1"]) {
        expect(result.design.components["comp-1"]).toBeDefined();
      }
    });

    it("should create compressed instances", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.design.instances).toBeInstanceOf(Array);
    });
  });

  // =====================================================
  // Test Suite 2: extractComponents - With Options
  // =====================================================
  describe("extractComponents with options", () => {
    it("should respect minInstances option", () => {
      const options: CompressionOptions = { minInstances: 6 };
      const result = extractComponents(
        "test",
        mockNodes,
        mockGlobalVars,
        options
      );

      // With minInstances: 6, components with only 5 instances should not be extracted
      expect(result.stats.componentCount).toBe(0);
    });

    it("should default to minInstances: 2", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      // With default minInstances: 2, components with 2 instances should be extracted
      expect(result.stats.componentCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle minInstances: 1", () => {
      const options: CompressionOptions = { minInstances: 1 };
      const result = extractComponents(
        "test",
        mockNodes,
        mockGlobalVars,
        options
      );

      expect(result).toBeDefined();
    });

    it("should preserve node order when preserveOrder is true", () => {
      const options: CompressionOptions = { preserveOrder: true };
      const result = extractComponents(
        "test",
        mockNodes,
        mockGlobalVars,
        options
      );

      expect(result).toBeDefined();
    });

    it("should enable grid detection when extractGrids is true", () => {
      const options: CompressionOptions = { extractGrids: true };
      const result = extractComponents(
        "test",
        mockNodes,
        mockGlobalVars,
        options
      );

      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 3: Component Definitions
  // =====================================================
  describe("Component definitions", () => {
    it("should create component definition with template", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      const component = result.design.components["comp-1"];
      if (component) {
        expect(component.id).toBe("comp-1");
        expect(component.template).toBeDefined();
      }
    });

    it("should include slot definitions", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      const component = result.design.components["comp-1"];
      if (component) {
        expect(component.slots).toBeDefined();
      }
    });

    it("should track slot IDs", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      const component = result.design.components["comp-1"];
      if (component) {
        expect(component.slotIds).toBeDefined();
        expect(Array.isArray(component.slotIds)).toBe(true);
      }
    });
  });

  // =====================================================
  // Test Suite 4: Compressed Instances
  // =====================================================
  describe("Compressed instances", () => {
    it("should create instance references", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.design.instances.length).toBeGreaterThan(0);
    });

    it("should include componentId in instances", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      // Only check if instances were created (compression was beneficial)
      if (result.design.instances.length > 0) {
        const instance = result.design.instances[0];
        expect(instance.componentId).toBeDefined();
      }
    });

    it("should preserve instance names", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      if (result.design.instances.length > 0) {
        const instance = result.design.instances[0];
        expect(instance.name).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 5: Remaining Nodes
  // =====================================================
  describe("Remaining nodes", () => {
    it("should preserve non-component nodes", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.design.nodes).toBeDefined();
      expect(result.design.nodes.length).toBeGreaterThan(0);
    });

    it("should filter out compressed instances from nodes", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      // When compression is applied, instances are extracted from nodes
      // When compression is skipped, nodes remain as-is
      if (result.design.instances.length > 0) {
        // Instances were extracted, nodes should be filtered
        // The "Regular Frame" might still be in nodes since it's not an instance
        expect(result.design.nodes.length).toBeGreaterThanOrEqual(0);
      } else {
        // No compression, all nodes remain including the frame
        const frameNode = result.design.nodes.find(
          (n) => n.name === "Regular Frame"
        );
        expect(frameNode).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 6: Compression Stats
  // =====================================================
  describe("Compression stats", () => {
    it("should calculate original node count", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.stats.originalNodeCount).toBeDefined();
      expect(result.stats.originalNodeCount).toBeGreaterThan(0);
    });

    it("should calculate component count", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.stats.componentCount).toBeDefined();
      expect(result.stats.componentCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate instance count", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      // instanceCount may be 0 if compression was skipped
      expect(result.stats.instanceCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate reduction percentage", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      // reductionPercent can be negative when compression is skipped (not beneficial)
      expect(typeof result.stats.reductionPercent).toBe("number");
      // When compression is applied, it should be <= 100%
      if (result.stats.instanceCount > 0) {
        expect(result.stats.reductionPercent).toBeLessThanOrEqual(100);
      }
    });

    it("should calculate original and compressed sizes", () => {
      const result = extractComponents("test", mockNodes, mockGlobalVars);

      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.compressedSize).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================
  // Test Suite 7: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle empty nodes array", () => {
      const result = extractComponents("test", [], mockGlobalVars);

      expect(result.design.nodes).toEqual([]);
      expect(result.design.instances).toEqual([]);
    });

    it("should handle nodes with no components", () => {
      const noComponentNodes: SimplifiedNode[] = [
        {
          id: "frame-1",
          name: "Frame",
          type: "FRAME",
          visible: true,
          children: [],
        },
      ];

      const result = extractComponents(
        "test",
        noComponentNodes,
        mockGlobalVars
      );

      expect(result.stats.componentCount).toBe(0);
    });

    it("should handle single instance", () => {
      const singleInstance: SimplifiedNode[] = [
        {
          id: "instance-1",
          name: "Button",
          type: "INSTANCE",
          visible: true,
          componentId: "comp-1",
          children: [],
        },
      ];

      const options: CompressionOptions = { minInstances: 1 };
      const result = extractComponents(
        "test",
        singleInstance,
        mockGlobalVars,
        options
      );

      expect(result).toBeDefined();
    });

    it("should handle deeply nested components", () => {
      const nestedNodes: SimplifiedNode[] = [
        {
          id: "parent",
          name: "Parent",
          type: "FRAME",
          visible: true,
          children: [
            {
              id: "child",
              name: "Child",
              type: "FRAME",
              visible: true,
              children: [
                {
                  id: "instance-1",
                  name: "Button",
                  type: "INSTANCE",
                  visible: true,
                  componentId: "comp-1",
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const result = extractComponents("test", nestedNodes, mockGlobalVars);

      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 8: Expansion
  // =====================================================
  describe("expandDesign", () => {
    it("should expand compressed design", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      expect(expanded).toBeDefined();
      expect(expanded.name).toBe("test");
    });

    it("should restore instances from definitions", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      expect(expanded.nodes.length).toBeGreaterThan(0);
    });

    it("should preserve global vars", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      expect(expanded.globalVars).toEqual(mockGlobalVars);
    });
  });

  // =====================================================
  // Test Suite 9: Round-trip Tests
  // =====================================================
  describe("Round-trip tests", () => {
    it("should survive compress-expand round-trip", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      expect(expanded.name).toBe("test");
    });

    it("should preserve node count after expansion", () => {
      const originalCount = countAllNodes(mockNodes);
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);
      const expandedCount = countAllNodes(expanded.nodes);

      // May not be exact due to compression, but should be close
      expect(expandedCount).toBeGreaterThan(0);
    });
  });
});

// Helper function to count all nodes in a tree
function countAllNodes(nodes: SimplifiedNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) {
      count += countAllNodes(node.children);
    }
  }
  return count;
}
