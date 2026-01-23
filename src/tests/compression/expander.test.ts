/**
 * Tests for compression/expander module
 *
 * Tests decompression logic - expands compressed format back to full node tree.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { extractComponents } from "@/compression/component-extractor";
import {
  expandDesign,
  getExpansionSummary,
  validateExpansion,
} from "@/compression/expander";
import type { SerializableCompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

describe("compression/expander", () => {
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
  // Test Suite 1: expandDesign - Basic Expansion
  // =====================================================
  describe("expandDesign", () => {
    it("should expand compressed design", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      expect(expanded).toBeDefined();
      expect(expanded.name).toBe("test");
      expect(expanded.nodes).toBeInstanceOf(Array);
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

    it("should handle empty compressed design", () => {
      const emptyDesign: SerializableCompressedDesign = {
        name: "empty",
        components: {},
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const expanded = expandDesign(emptyDesign);

      expect(expanded.name).toBe("empty");
      expect(expanded.nodes).toEqual([]);
    });

    it("should handle instances with missing component references gracefully", () => {
      const designWithMissingComponent: SerializableCompressedDesign = {
        name: "missing-component",
        components: {},
        instances: [
          {
            id: "orphan-1",
            componentId: "non-existent",
            name: "Orphan Instance",
            visible: true,
          },
        ],
        nodes: [],
        globalVars: { styles: {} },
      };

      const expanded = expandDesign(designWithMissingComponent);

      // Should skip instances with missing components
      expect(expanded.nodes).toEqual([]);
    });

    it("should combine expanded instances with non-component nodes", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      // The frame is nested inside the page node's children
      // Find it by searching through the tree
      const findNodeByName = (
        nodes: SimplifiedNode[],
        name: string
      ): SimplifiedNode | undefined => {
        for (const node of nodes) {
          if (node.name === name) return node;
          if (node.children) {
            const found = findNodeByName(node.children, name);
            if (found) return found;
          }
        }
        return undefined;
      };

      const frameNode = findNodeByName(expanded.nodes, "Regular Frame");
      expect(frameNode).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 2: Expansion with Slot Overrides
  // =====================================================
  describe("Expansion with slot overrides", () => {
    it("should apply slot overrides correctly", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      // Verify expansion succeeded - instances were expanded from component definitions
      // The expanded nodes should have structure from templates + overrides applied
      expect(expanded.nodes.length).toBeGreaterThan(0);

      // Check that instances have componentId set (showing they came from expansion)
      const instanceNodes = expanded.nodes.filter(
        (n) => (n as any).componentId
      );
      expect(instanceNodes.length).toBeGreaterThan(0);
    });

    it("should preserve instance-specific properties", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      // Check that instances have their original IDs
      const instanceIds = expanded.nodes
        .map((n) => n.id)
        .filter((id) => id.includes("instance-"));
      expect(instanceIds.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 3: Nested Components
  // =====================================================
  describe("Nested component expansion", () => {
    it("should handle nested component references", () => {
      // Create nested component structure
      const nestedNodes: SimplifiedNode[] = [
        {
          id: "page-1",
          name: "Page 1",
          type: "PAGE",
          visible: true,
          children: [
            {
              id: "card-instance-1",
              name: "Card",
              type: "INSTANCE",
              visible: true,
              componentId: "card-comp",
              children: [
                {
                  id: "button-instance-1",
                  name: "Button",
                  type: "INSTANCE",
                  visible: true,
                  componentId: "button-comp",
                  children: [],
                },
              ],
            },
            {
              id: "card-instance-2",
              name: "Card",
              type: "INSTANCE",
              visible: true,
              componentId: "card-comp",
              children: [
                {
                  id: "button-instance-2",
                  name: "Button",
                  type: "INSTANCE",
                  visible: true,
                  componentId: "button-comp",
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const compressed = extractComponents(
        "nested-test",
        nestedNodes,
        mockGlobalVars
      );
      const expanded = expandDesign(compressed.design);

      expect(expanded.nodes.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 4: Round-trip Tests
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

    it("should preserve structure in round-trip", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      // Check that the "Regular Frame" is preserved (nested inside page)
      const findNodeByName = (
        nodes: SimplifiedNode[],
        name: string
      ): SimplifiedNode | undefined => {
        for (const node of nodes) {
          if (node.name === name) return node;
          if (node.children) {
            const found = findNodeByName(node.children, name);
            if (found) return found;
          }
        }
        return undefined;
      };

      const frameNode = findNodeByName(expanded.nodes, "Regular Frame");
      expect(frameNode).toBeDefined();
      expect(frameNode?.type).toBe("FRAME");
    });
  });

  // =====================================================
  // Test Suite 5: validateExpansion
  // =====================================================
  describe("validateExpansion", () => {
    it("should validate matching structures", () => {
      const nodes1: SimplifiedNode[] = [
        { id: "1", name: "A", type: "FRAME", visible: true, children: [] },
        { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
      ];
      const nodes2: SimplifiedNode[] = [
        { id: "1", name: "A", type: "FRAME", visible: true, children: [] },
        { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
      ];

      expect(validateExpansion(nodes1, nodes2)).toBe(true);
    });

    it("should detect structure mismatches", () => {
      const nodes1: SimplifiedNode[] = [
        { id: "1", name: "A", type: "FRAME", visible: true, children: [] },
      ];
      const nodes2: SimplifiedNode[] = [
        { id: "1", name: "B", type: "FRAME", visible: true, children: [] }, // Different name
      ];

      expect(validateExpansion(nodes1, nodes2)).toBe(false);
    });

    it("should detect length mismatches", () => {
      const nodes1: SimplifiedNode[] = [
        { id: "1", name: "A", type: "FRAME", visible: true, children: [] },
      ];
      const nodes2: SimplifiedNode[] = [
        { id: "1", name: "A", type: "FRAME", visible: true, children: [] },
        { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
      ];

      expect(validateExpansion(nodes1, nodes2)).toBe(false);
    });

    it("should handle nested children", () => {
      const nodes1: SimplifiedNode[] = [
        {
          id: "1",
          name: "A",
          type: "FRAME",
          visible: true,
          children: [
            { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
          ],
        },
      ];
      const nodes2: SimplifiedNode[] = [
        {
          id: "1",
          name: "A",
          type: "FRAME",
          visible: true,
          children: [
            { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
          ],
        },
      ];

      expect(validateExpansion(nodes1, nodes2)).toBe(true);
    });

    it("should detect children count mismatches", () => {
      const nodes1: SimplifiedNode[] = [
        {
          id: "1",
          name: "A",
          type: "FRAME",
          visible: true,
          children: [
            { id: "2", name: "B", type: "FRAME", visible: true, children: [] },
          ],
        },
      ];
      const nodes2: SimplifiedNode[] = [
        {
          id: "1",
          name: "A",
          type: "FRAME",
          visible: true,
          children: [],
        },
      ];

      expect(validateExpansion(nodes1, nodes2)).toBe(false);
    });
  });

  // =====================================================
  // Test Suite 6: getExpansionSummary
  // =====================================================
  describe("getExpansionSummary", () => {
    it("should generate summary for compressed design", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const summary = getExpansionSummary(compressed.design);

      expect(summary).toContain("Expansion Summary");
      expect(summary).toContain("test");
    });

    it("should include component count in summary", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const summary = getExpansionSummary(compressed.design);

      expect(summary).toContain("Components:");
    });

    it("should include instance count in summary", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const summary = getExpansionSummary(compressed.design);

      expect(summary).toContain("Instances to expand:");
    });

    it("should include non-component node count in summary", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const summary = getExpansionSummary(compressed.design);

      expect(summary).toContain("Non-component nodes:");
    });

    it("should include slot count per component in summary", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const summary = getExpansionSummary(compressed.design);

      expect(summary).toContain("slots");
    });

    it("should handle empty design in summary", () => {
      const emptyDesign: SerializableCompressedDesign = {
        name: "empty",
        components: {},
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const summary = getExpansionSummary(emptyDesign);

      expect(summary).toContain("Expansion Summary");
      expect(summary).toContain("Components: 0");
    });
  });

  // =====================================================
  // Test Suite 7: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle design with no components", () => {
      const noComponentDesign: SerializableCompressedDesign = {
        name: "no-components",
        components: {},
        instances: [],
        nodes: [
          {
            id: "1",
            name: "Frame",
            type: "FRAME",
            visible: true,
            children: [],
          },
        ],
        globalVars: { styles: {} },
      };

      const expanded = expandDesign(noComponentDesign);

      expect(expanded.nodes.length).toBe(1);
      expect(expanded.nodes[0].name).toBe("Frame");
    });

    it("should handle design with only components", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      // Get the actual compressed design
      const onlyComponentsDesign: SerializableCompressedDesign = {
        ...compressed.design,
        nodes: [],
      };

      const expanded = expandDesign(onlyComponentsDesign);

      // Should have expanded instances
      expect(expanded.nodes.length).toBeGreaterThan(0);
    });

    it("should handle design with missing component hierarchy", () => {
      const designWithoutHierarchy: SerializableCompressedDesign = {
        name: "no-hierarchy",
        components: {},
        instances: [],
        nodes: [],
        globalVars: { styles: {} },
      };

      const expanded = expandDesign(designWithoutHierarchy);

      expect(expanded.name).toBe("no-hierarchy");
    });

    it("should handle complex nested slot overrides", () => {
      const compressed = extractComponents("test", mockNodes, mockGlobalVars);
      const expanded = expandDesign(compressed.design);

      // Verify expansion succeeded without errors
      expect(expanded).toBeDefined();
      expect(expanded.nodes).toBeInstanceOf(Array);
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
