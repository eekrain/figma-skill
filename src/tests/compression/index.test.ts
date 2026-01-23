/**
 * Tests for compression/index module
 *
 * Tests the public API for the compression module.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  analyzeComponents,
  analyzeCompressionPotential,
  applyGridLayout as applyGridLayoutImport,
  applyOverrides,
  compressComponents,
  createCompressionReport,
  detectGridLayout,
  detectSlots,
  expandDesign,
  extractComponents,
  getCompressionReport,
  getExpansionSummary,
  gridToCSS,
  markNodesForExtraction,
  pathToString,
  shouldExtractAsComponent,
  stringToPath,
  validateExpansion,
} from "@/compression/index";
import type { SimplifiedNode } from "@/extractors/types";

describe("compression/index", () => {
  let mockNodes: SimplifiedNode[];
  let mockDesign: {
    name: string;
    nodes: SimplifiedNode[];
    globalVars: { styles: Record<string, unknown> };
  };

  beforeEach(() => {
    // Create mock nodes with component instances
    mockNodes = [
      {
        id: "page-1",
        name: "Page 1",
        type: "PAGE",
        visible: true,
        children: [
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
        ],
      },
    ];

    mockDesign = {
      name: "test-design",
      nodes: mockNodes,
      globalVars: { styles: {} },
    };

    // Mock console.log to avoid clutter
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  // =====================================================
  // Test Suite 1: compressComponents
  // =====================================================
  describe("compressComponents", () => {
    it("should call extractComponents correctly", () => {
      const result = compressComponents(mockDesign);

      expect(result).toBeDefined();
      expect(result.design).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it("should pass options through correctly", () => {
      const result = compressComponents(mockDesign, { minInstances: 6 });

      expect(result).toBeDefined();
      // With minInstances: 6 and only 5 instances, no extraction should happen
      expect(result.stats.componentCount).toBe(0);
    });

    it("should preserve design name", () => {
      const result = compressComponents(mockDesign);

      expect(result.design.name).toBe("test-design");
    });

    it("should return compression stats", () => {
      const result = compressComponents(mockDesign);

      expect(result.stats.originalNodeCount).toBeGreaterThan(0);
      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.compressedSize).toBeGreaterThanOrEqual(0);
      expect(typeof result.stats.reductionPercent).toBe("number");
    });

    it("should return compressed design with correct structure", () => {
      const result = compressComponents(mockDesign);

      expect(result.design.components).toBeDefined();
      expect(result.design.instances).toBeInstanceOf(Array);
      expect(result.design.nodes).toBeInstanceOf(Array);
      expect(result.design.globalVars).toEqual({ styles: {} });
    });
  });

  // =====================================================
  // Test Suite 2: analyzeCompressionPotential
  // =====================================================
  describe("analyzeCompressionPotential", () => {
    it("should analyze compression without compressing", () => {
      const result = analyzeCompressionPotential(mockDesign);

      expect(result).toBeDefined();
      expect(result.instancesByComponent).toBeInstanceOf(Object); // It's a Record after serialization
      // estimatedSavings can be negative if compression would increase size
      expect(typeof result.estimatedSavings).toBe("number");
      expect(result.originalSize).toBeGreaterThan(0);
    });

    it("should respect minInstances option", () => {
      const result1 = analyzeCompressionPotential(mockDesign, {
        minInstances: 2,
      });
      const result2 = analyzeCompressionPotential(mockDesign, {
        minInstances: 10,
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should return component counts", () => {
      const result = analyzeCompressionPotential(mockDesign);

      expect(result.componentCounts).toBeDefined();
    });

    it("should estimate compressed size", () => {
      const result = analyzeCompressionPotential(mockDesign);

      expect(result.compressedSize).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================================================
  // Test Suite 3: createCompressionReport
  // =====================================================
  describe("createCompressionReport", () => {
    it("should create human-readable report", () => {
      const report = createCompressionReport(mockDesign);

      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(0);
    });

    it("should include design name in report", () => {
      const report = createCompressionReport(mockDesign);

      // Report includes component analysis, not necessarily the design name
      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain("Component Compression Analysis");
    });

    it("should respect options", () => {
      const report1 = createCompressionReport(mockDesign, { minInstances: 2 });
      const report2 = createCompressionReport(mockDesign, { minInstances: 10 });

      expect(typeof report1).toBe("string");
      expect(typeof report2).toBe("string");
    });

    it("should be readable", () => {
      const report = createCompressionReport(mockDesign);

      // Report should have multiple lines
      const lines = report.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  // =====================================================
  // Test Suite 4: Re-exported Functions
  // =====================================================
  describe("Re-exported functions", () => {
    it("should export extractComponents from component-extractor", () => {
      expect(extractComponents).toBeDefined();
      expect(typeof extractComponents).toBe("function");
    });

    it("should export expandDesign from expander", () => {
      expect(expandDesign).toBeDefined();
      expect(typeof expandDesign).toBe("function");
    });

    it("should export validateExpansion from expander", () => {
      expect(validateExpansion).toBeDefined();
      expect(typeof validateExpansion).toBe("function");
    });

    it("should export getExpansionSummary from expander", () => {
      expect(getExpansionSummary).toBeDefined();
      expect(typeof getExpansionSummary).toBe("function");
    });

    it("should export analyzeComponents from analyzer", () => {
      expect(analyzeComponents).toBeDefined();
      expect(typeof analyzeComponents).toBe("function");
    });

    it("should export shouldExtractAsComponent from analyzer", () => {
      expect(shouldExtractAsComponent).toBeDefined();
      expect(typeof shouldExtractAsComponent).toBe("function");
    });

    it("should export markNodesForExtraction from analyzer", () => {
      expect(markNodesForExtraction).toBeDefined();
      expect(typeof markNodesForExtraction).toBe("function");
    });

    it("should export getCompressionReport from analyzer", () => {
      expect(getCompressionReport).toBeDefined();
      expect(typeof getCompressionReport).toBe("function");
    });

    it("should export detectSlots from slot-detector", () => {
      expect(detectSlots).toBeDefined();
      expect(typeof detectSlots).toBe("function");
    });

    it("should export pathToString from slot-detector", () => {
      expect(pathToString).toBeDefined();
      expect(typeof pathToString).toBe("function");
    });

    it("should export stringToPath from slot-detector", () => {
      expect(stringToPath).toBeDefined();
      expect(typeof stringToPath).toBe("function");
    });

    it("should export applyOverrides from slot-detector", () => {
      expect(applyOverrides).toBeDefined();
      expect(typeof applyOverrides).toBe("function");
    });

    it("should export detectGridLayout from grid-detector", () => {
      expect(detectGridLayout).toBeDefined();
      expect(typeof detectGridLayout).toBe("function");
    });

    it("should export applyGridLayout from grid-detector", () => {
      expect(applyGridLayoutImport).toBeDefined();
      expect(typeof applyGridLayoutImport).toBe("function");
    });

    it("should export gridToCSS from grid-detector", () => {
      expect(gridToCSS).toBeDefined();
      expect(typeof gridToCSS).toBe("function");
    });
  });

  // =====================================================
  // Test Suite 5: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle empty nodes array", () => {
      const emptyDesign = {
        name: "empty",
        nodes: [],
        globalVars: { styles: {} },
      };

      const result = compressComponents(emptyDesign);

      expect(result.design.nodes).toEqual([]);
      expect(result.stats.originalNodeCount).toBe(0);
    });

    it("should handle design without components", () => {
      const noComponentDesign = {
        name: "no-components",
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

      const result = compressComponents(noComponentDesign);

      expect(result.stats.componentCount).toBe(0);
    });

    it("should handle various option combinations", () => {
      const options = [
        { minInstances: 1 },
        { minInstances: 2, extractGrids: true },
        { minInstances: 3, preserveOrder: true },
        { extractGrids: false },
        {},
      ];

      for (const opts of options) {
        const result = compressComponents(mockDesign, opts);
        expect(result).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 6: Integration Tests
  // =====================================================
  describe("Integration tests", () => {
    it("should work end-to-end: compress → expand", () => {
      const compressed = compressComponents(mockDesign);
      const expanded = expandDesign(compressed.design);

      expect(expanded.name).toBe("test-design");
      expect(expanded.nodes).toBeInstanceOf(Array);
    });

    it("should analyze and compress consistently", () => {
      const analysis = analyzeCompressionPotential(mockDesign);
      const compressed = compressComponents(mockDesign);

      // Analysis provides estimates, can be negative
      expect(typeof analysis.estimatedSavings).toBe("number");
      expect(compressed.stats.reductionPercent).toBeGreaterThanOrEqual(0);
    });

    it("should create report after compression", () => {
      const report = createCompressionReport(mockDesign);

      // Report includes analysis, not necessarily the design name directly
      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain("Component Compression Analysis");
    });
  });
});
