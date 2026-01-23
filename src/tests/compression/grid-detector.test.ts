/**
 * Tests for compression/grid-detector module
 *
 * Tests layout grid detection for positioning optimization.
 */
import { describe, expect, it } from "@jest/globals";

import {
  type GridDetectionResult,
  applyGridLayout,
  detectGridLayout,
  gridToCSS,
} from "@/compression/grid-detector";
import type { CompressedInstance } from "@/compression/types";

describe("compression/grid-detector", () => {
  // Helper to create instances with layout data
  function createInstance(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): CompressedInstance {
    return {
      id,
      componentId: "comp-1",
      name: `Instance ${id}`,
      visible: true,
      layoutData: { x, y, width, height },
    };
  }

  // =====================================================
  // Test Suite 1: detectGridLayout - Basic Detection
  // =====================================================
  describe("detectGridLayout", () => {
    it("should return null for empty array", () => {
      const result = detectGridLayout([]);

      expect(result.grid).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("should return null for single instance", () => {
      const instances = [createInstance("1", 0, 0, 100, 50)];

      const result = detectGridLayout(instances);

      expect(result.grid).toBeNull();
    });

    it("should return null for instances without layout data", () => {
      const instances: CompressedInstance[] = [
        {
          id: "1",
          componentId: "comp-1",
          name: "Instance 1",
          visible: true,
        },
        {
          id: "2",
          componentId: "comp-1",
          name: "Instance 2",
          visible: true,
        },
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).toBeNull();
    });

    it("should return null for fewer than minInstances", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
      ];

      const result = detectGridLayout(instances, { minInstances: 4 });

      expect(result.grid).toBeNull();
    });
  });

  // =====================================================
  // Test Suite 2: Row Layout Detection
  // =====================================================
  describe("Row layout detection", () => {
    it("should detect horizontal row layout", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
        createInstance("4", 330, 0, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.columns).toBe(4);
      expect(result.grid?.rows).toBe(1);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect row with consistent spacing", () => {
      const instances = [
        createInstance("1", 0, 10, 100, 50),
        createInstance("2", 120, 10, 100, 50),
        createInstance("3", 240, 10, 100, 50),
        createInstance("4", 360, 10, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.gapX).toBe(20);
      expect(result.grid?.gapY).toBe(0);
    });

    it("should calculate grid dimensions correctly", () => {
      const instances = [
        createInstance("1", 0, 0, 120, 40),
        createInstance("2", 130, 0, 120, 40),
        createInstance("3", 260, 0, 120, 40),
      ];

      const result = detectGridLayout(instances, { minInstances: 3 });

      expect(result.grid).not.toBeNull();
      expect(result.grid?.columnWidth).toBe(120);
      expect(result.grid?.rowHeight).toBe(40);
    });

    it("should assign positions to instances", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
      ];

      const result = detectGridLayout(instances, { minInstances: 3 });

      expect(result.grid?.positions["1"]).toEqual({ column: 0, row: 0 });
      expect(result.grid?.positions["2"]).toEqual({ column: 1, row: 0 });
      expect(result.grid?.positions["3"]).toEqual({ column: 2, row: 0 });
    });
  });

  // =====================================================
  // Test Suite 3: Column Layout Detection
  // =====================================================
  describe("Column layout detection", () => {
    it("should detect vertical column layout", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 0, 60, 100, 50),
        createInstance("3", 0, 120, 100, 50),
        createInstance("4", 0, 180, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.columns).toBe(1);
      expect(result.grid?.rows).toBe(4);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect column with consistent spacing", () => {
      const instances = [
        createInstance("1", 10, 0, 100, 50),
        createInstance("2", 10, 70, 100, 50),
        createInstance("3", 10, 140, 100, 50),
        createInstance("4", 10, 210, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.gapX).toBe(0);
      expect(result.grid?.gapY).toBe(20);
    });

    it("should assign positions correctly for column", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 0, 60, 100, 50),
        createInstance("3", 0, 120, 100, 50),
      ];

      const result = detectGridLayout(instances, { minInstances: 3 });

      expect(result.grid?.positions["1"]).toEqual({ column: 0, row: 0 });
      expect(result.grid?.positions["2"]).toEqual({ column: 0, row: 1 });
      expect(result.grid?.positions["3"]).toEqual({ column: 0, row: 2 });
    });
  });

  // =====================================================
  // Test Suite 4: Matrix Grid Detection
  // =====================================================
  describe("Matrix grid detection", () => {
    it("should detect 2x2 grid layout", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 0, 60, 100, 50),
        createInstance("4", 110, 60, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.columns).toBe(2);
      expect(result.grid?.rows).toBe(2);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect 3x3 grid layout", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
        createInstance("4", 0, 60, 100, 50),
        createInstance("5", 110, 60, 100, 50),
        createInstance("6", 220, 60, 100, 50),
        createInstance("7", 0, 120, 100, 50),
        createInstance("8", 110, 120, 100, 50),
        createInstance("9", 220, 120, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).not.toBeNull();
      expect(result.grid?.columns).toBe(3);
      expect(result.grid?.rows).toBe(3);
    });

    it("should assign positions for matrix grid", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 0, 60, 100, 50),
        createInstance("4", 110, 60, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid?.positions["1"]).toEqual({ column: 0, row: 0 });
      expect(result.grid?.positions["2"]).toEqual({ column: 1, row: 0 });
      expect(result.grid?.positions["3"]).toEqual({ column: 0, row: 1 });
      expect(result.grid?.positions["4"]).toEqual({ column: 1, row: 1 });
    });

    it("should calculate gapX and gapY for matrix", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 120, 0, 100, 50),
        createInstance("3", 0, 70, 100, 50),
        createInstance("4", 120, 70, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid?.gapX).toBe(20);
      expect(result.grid?.gapY).toBe(20);
    });
  });

  // =====================================================
  // Test Suite 5: Non-Grid Layouts
  // =====================================================
  describe("Non-grid layouts", () => {
    it("should reject random positions", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 250, 150, 100, 50),
        createInstance("3", 500, 300, 100, 50),
        createInstance("4", 100, 200, 100, 50),
      ];

      const result = detectGridLayout(instances);

      expect(result.grid).toBeNull();
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("should reject inconsistent spacing", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 200, 0, 100, 50), // 100px gap
        createInstance("3", 260, 0, 100, 50), // 60px gap
        createInstance("4", 500, 0, 100, 50), // 140px gap
      ];

      const result = detectGridLayout(instances);

      // With inconsistent spacing, confidence should be low
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("should reject misaligned row", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 5, 100, 50), // Slightly offset in Y
        createInstance("3", 220, 0, 100, 50),
        createInstance("4", 330, -5, 100, 50), // Slightly offset in Y
      ];

      const result = detectGridLayout(instances, { tolerance: 3 });

      // With tight tolerance, misaligned row should fail
      expect(result.confidence).toBeLessThan(1);
    });
  });

  // =====================================================
  // Test Suite 6: Configuration Options
  // =====================================================
  describe("Configuration options", () => {
    it("should respect tolerance setting", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 3, 100, 50), // 3px Y offset
        createInstance("3", 220, 0, 100, 50),
        createInstance("4", 330, 0, 100, 50),
      ];

      const strictResult = detectGridLayout(instances, { tolerance: 2 });
      const looseResult = detectGridLayout(instances, { tolerance: 10 });

      // Strict tolerance should have lower confidence
      expect(looseResult.confidence).toBeGreaterThanOrEqual(
        strictResult.confidence
      );
    });

    it("should respect minInstances setting", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
      ];

      const result = detectGridLayout(instances, { minInstances: 2 });

      // Should attempt detection with exactly 2 instances
      expect(result).toBeDefined();
    });

    it("should respect minConfidence setting", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
        createInstance("4", 350, 0, 100, 50), // Extra gap
      ];

      const result = detectGridLayout(instances, { minConfidence: 0.99 });

      // With high minConfidence, inconsistent spacing should fail
      expect(result.grid).toBeNull();
    });
  });

  // =====================================================
  // Test Suite 7: applyGridLayout
  // =====================================================
  describe("applyGridLayout", () => {
    it("should apply grid layout reference to instances", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
        createInstance("3", 220, 0, 100, 50),
      ];

      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 3,
        rows: 1,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 0,
        positions: {
          "1": { column: 0, row: 0 },
          "2": { column: 1, row: 0 },
          "3": { column: 2, row: 0 },
        },
      };

      const result = applyGridLayout(instances, grid);

      expect(result[0].layout).toBe("test-grid");
      expect(result[1].layout).toBe("test-grid");
      expect(result[2].layout).toBe("test-grid");
    });

    it("should not modify instances without positions", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
      ];

      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 3,
        rows: 1,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 0,
        positions: {
          "1": { column: 0, row: 0 },
          // No position for instance "2"
        },
      };

      const result = applyGridLayout(instances, grid);

      expect(result[0].layout).toBe("test-grid");
      expect(result[1].layout).toBeUndefined();
    });

    it("should preserve other instance properties", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 110, 0, 100, 50),
      ];

      // Add custom properties
      (instances[0] as any).customProp = "value1";
      (instances[1] as any).overrides = { text: "custom" };

      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 2,
        rows: 1,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 0,
        positions: {
          "1": { column: 0, row: 0 },
          "2": { column: 1, row: 0 },
        },
      };

      const result = applyGridLayout(instances, grid);

      expect((result[0] as any).customProp).toBe("value1");
      expect((result[1] as any).overrides).toEqual({ text: "custom" });
    });
  });

  // =====================================================
  // Test Suite 8: gridToCSS
  // =====================================================
  describe("gridToCSS", () => {
    it("should generate CSS for row layout", () => {
      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 4,
        rows: 1,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 0,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain("display: grid;");
      expect(css).toContain("grid-template-columns: repeat(4, 100px);");
      expect(css).toContain("grid-template-rows: repeat(1, 50px);");
      expect(css).toContain("column-gap: 10px;");
    });

    it("should generate CSS for column layout", () => {
      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 1,
        rows: 4,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 0,
        gapY: 10,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain("display: grid;");
      expect(css).toContain("grid-template-columns: repeat(1, 100px);");
      expect(css).toContain("grid-template-rows: repeat(4, 50px);");
      expect(css).toContain("row-gap: 10px;");
    });

    it("should generate CSS for matrix layout with both gaps", () => {
      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 3,
        rows: 3,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 15,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain("gap: 15px 10px;");
    });

    it("should handle grids without columnWidth", () => {
      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 3,
        rows: 2,
        columnWidth: undefined,
        rowHeight: 50,
        gapX: 10,
        gapY: 15,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain("grid-template-columns: repeat(3, 1fr);");
    });

    it("should handle grids without rowHeight", () => {
      const grid = {
        id: "test-grid",
        name: "Test Grid",
        columns: 3,
        rows: 2,
        columnWidth: 100,
        rowHeight: undefined,
        gapX: 10,
        gapY: 15,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain("grid-template-rows: repeat(2, auto);");
    });

    it("should sanitize grid ID in CSS class name", () => {
      const grid = {
        id: "grid-with-123-!",
        name: "Test Grid",
        columns: 2,
        rows: 1,
        columnWidth: 100,
        rowHeight: 50,
        gapX: 10,
        gapY: 0,
        positions: {},
      };

      const css = gridToCSS(grid);

      expect(css).toContain(".grid_with_123__ {");
    });
  });

  // =====================================================
  // Test Suite 9: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle zero-sized instances", () => {
      const instances = [
        createInstance("1", 0, 0, 0, 0),
        createInstance("2", 10, 0, 0, 0),
        createInstance("3", 20, 0, 0, 0),
        createInstance("4", 30, 0, 0, 0),
      ];

      const result = detectGridLayout(instances);

      // Should still detect row pattern
      expect(result.grid).not.toBeNull();
    });

    it("should handle negative positions", () => {
      const instances = [
        createInstance("1", -100, -50, 100, 50),
        createInstance("2", 10, -50, 100, 50),
        createInstance("3", 120, -50, 100, 50),
        createInstance("4", 230, -50, 100, 50),
      ];

      const result = detectGridLayout(instances);

      // Should detect row pattern despite negative positions
      expect(result.grid).not.toBeNull();
    });

    it("should handle instances with same positions", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 0, 0, 100, 50), // Same position
        createInstance("3", 0, 0, 100, 50), // Same position
        createInstance("4", 0, 0, 100, 50), // Same position
      ];

      const result = detectGridLayout(instances);

      // Should still detect as column (all same X)
      expect(result.grid).not.toBeNull();
    });

    it("should handle very large gaps", () => {
      const instances = [
        createInstance("1", 0, 0, 100, 50),
        createInstance("2", 1000, 0, 100, 50), // Large gap
        createInstance("3", 2000, 0, 100, 50), // Large gap
        createInstance("4", 3000, 0, 100, 50), // Large gap
      ];

      const result = detectGridLayout(instances);

      // Should detect row pattern with large gap
      expect(result.grid).not.toBeNull();
      expect(result.grid?.gapX).toBe(900);
    });
  });
});
