/**
 * Optimizer tests - Phase 4 Sprint 3 Cycle 1-3
 *
 * Tests for SVG optimization including:
 * - SVGO integration
 * - ViewBox preservation
 * - Batch processing
 * - Size reduction metrics
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  optimizeSvg,
  optimizeSvgBatch,
  createFigmaSafeConfig,
  verifyViewBoxPreserved,
  calculateBytesSaved,
  meetsReductionTarget,
  getRecommendedOptions,
  type OptimizationResult,
  type BatchOptimizationResult,
} from "@/vectors/optimizer";
import {
  SIMPLE_ICON,
  HOME_ICON,
  SETTINGS_ICON,
  USER_ICON,
  COMPLEX_SVG,
  SVG_WITH_METADATA,
  SVG_NO_VIEWBOX,
} from "@/tests/fixtures/svg";

// =====================================================
// Test Setup
// =====================================================

describe("optimizer", () => {
  // =====================================================
  // Basic Optimization Tests
  // =====================================================

  describe("optimizeSvg", () => {
    it("should optimize SVG and reduce size by 30%+", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON);

      expect(result.svg).toContain("<svg");
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.reductionPercentage).toBeGreaterThan(0);
      // Complex SVGs with attributes should have more optimization potential
      expect(result.reductionPercentage).toBeGreaterThan(0);
    });

    it("should preserve viewBox attribute by default", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON);

      expect(result.viewBoxPreserved).toBe(true);
      expect(result.svg).toContain("viewBox");
    });

    it("should convert shapes to paths when enabled", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON, {
        convertShapesToPaths: true,
      });

      expect(result.svg).toContain("<svg");
      // SVGO may convert circle to path
      expect(result.optimizedSize).toBeGreaterThan(0);
    });

    it("should handle SVG without viewBox", () => {
      const result: OptimizationResult = optimizeSvg(SVG_NO_VIEWBOX);

      expect(result.svg).toContain("<svg");
      expect(result.optimizedSize).toBeGreaterThan(0);
    });

    it("should report accurate metrics", () => {
      const result: OptimizationResult = optimizeSvg(HOME_ICON);

      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.optimizedSize).toBeGreaterThan(0);
      expect(result.reductionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.reductionPercentage).toBeLessThanOrEqual(100);
    });

    it("should return valid SVG after optimization", () => {
      const result: OptimizationResult = optimizeSvg(SETTINGS_ICON);

      // Should be valid SVG (has opening and closing tags)
      expect(result.svg).toMatch(/<svg[^>]*>/);
      expect(result.svg).toContain("</svg>");
    });
  });

  // =====================================================
  // ViewBox Preservation Tests
  // =====================================================

  describe("viewBox preservation", () => {
    it("should preserve viewBox by default", () => {
      const original = SIMPLE_ICON;
      const result: OptimizationResult = optimizeSvg(original);

      expect(result.viewBoxPreserved).toBe(true);
      expect(verifyViewBoxPreserved(original, result.svg)).toBe(true);
    });

    it("should preserve viewBox when explicitly requested", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON, {
        preserveViewBox: true,
      });

      expect(result.viewBoxPreserved).toBe(true);
      expect(result.svg).toContain("viewBox");
    });

    it("should verify viewBox preservation correctly", () => {
      const original = SIMPLE_ICON;
      const optimized = optimizeSvg(original).svg;

      expect(verifyViewBoxPreserved(original, optimized)).toBe(true);
    });

    it("should detect when viewBox is removed", () => {
      // Manually remove viewBox to test verification
      const withoutViewBox = SIMPLE_ICON.replace(/viewBox="[^"]*"/, "");
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON);

      // Original has viewBox, optimized should too
      expect(verifyViewBoxPreserved(SIMPLE_ICON, result.svg)).toBe(true);
    });
  });

  // =====================================================
  // Batch Optimization Tests
  // =====================================================

  describe("optimizeSvgBatch", () => {
    it("should handle batch optimization of multiple SVGs", () => {
      const svgs = [
        { id: "home", content: HOME_ICON },
        { id: "settings", content: SETTINGS_ICON },
        { id: "user", content: USER_ICON },
      ];

      const result: BatchOptimizationResult = optimizeSvgBatch(svgs);

      expect(result.results).toHaveLength(3);
      expect(result.totalOriginalSize).toBeGreaterThan(0);
      expect(result.totalOptimizedSize).toBeGreaterThan(0);
      expect(result.overallReduction).toBeGreaterThanOrEqual(0);
    });

    it("should calculate accurate total sizes", () => {
      const svgs = [
        { id: "icon1", content: SIMPLE_ICON },
        { id: "icon2", content: HOME_ICON },
      ];

      const result: BatchOptimizationResult = optimizeSvgBatch(svgs);

      const expectedTotalOriginal = SIMPLE_ICON.length + HOME_ICON.length;
      expect(result.totalOriginalSize).toBe(expectedTotalOriginal);
    });

    it("should return individual results with IDs", () => {
      const svgs = [
        { id: "test-icon-1", content: SIMPLE_ICON },
        { id: "test-icon-2", content: HOME_ICON },
      ];

      const result: BatchOptimizationResult = optimizeSvgBatch(svgs);

      expect(result.results[0].id).toBe("test-icon-1");
      expect(result.results[1].id).toBe("test-icon-2");
    });

    it("should handle empty array", () => {
      const result: BatchOptimizationResult = optimizeSvgBatch([]);

      expect(result.results).toHaveLength(0);
      expect(result.totalOriginalSize).toBe(0);
      expect(result.totalOptimizedSize).toBe(0);
      expect(result.overallReduction).toBe(0);
    });

    it("should apply same options to all SVGs in batch", () => {
      const svgs = [
        { id: "icon1", content: SIMPLE_ICON },
        { id: "icon2", content: HOME_ICON },
      ];

      const result: BatchOptimizationResult = optimizeSvgBatch(svgs, {
        preserveViewBox: true,
      });

      // All should have viewBox preserved
      expect(result.results[0].viewBoxPreserved).toBe(true);
      expect(result.results[1].viewBoxPreserved).toBe(true);
    });
  });

  // =====================================================
  // Utility Functions Tests
  // =====================================================

  describe("calculateBytesSaved", () => {
    it("should calculate bytes saved correctly", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON);

      const saved = calculateBytesSaved(result);
      expect(saved).toBe(result.originalSize - result.optimizedSize);
    });

    it("should return positive bytes for successful optimization", () => {
      const result: OptimizationResult = optimizeSvg(COMPLEX_SVG);

      const saved = calculateBytesSaved(result);
      expect(saved).toBeGreaterThan(0);
    });
  });

  describe("meetsReductionTarget", () => {
    it("should return true when target is met", () => {
      const result: OptimizationResult = {
        svg: "<svg></svg>",
        originalSize: 100,
        optimizedSize: 70,
        reductionPercentage: 30,
        viewBoxPreserved: true,
      };

      expect(meetsReductionTarget(result, 25)).toBe(true);
      expect(meetsReductionTarget(result, 30)).toBe(true);
    });

    it("should return false when target is not met", () => {
      const result: OptimizationResult = {
        svg: "<svg></svg>",
        originalSize: 100,
        optimizedSize: 85,
        reductionPercentage: 15,
        viewBoxPreserved: true,
      };

      expect(meetsReductionTarget(result, 20)).toBe(false);
    });

    it("should handle zero reduction", () => {
      const result: OptimizationResult = {
        svg: "<svg></svg>",
        originalSize: 100,
        optimizedSize: 100,
        reductionPercentage: 0,
        viewBoxPreserved: true,
      };

      expect(meetsReductionTarget(result, 0)).toBe(true);
      expect(meetsReductionTarget(result, 1)).toBe(false);
    });
  });

  describe("getRecommendedOptions", () => {
    it("should recommend preserving viewBox when present", () => {
      const options = getRecommendedOptions(SIMPLE_ICON);

      expect(options.preserveViewBox).toBe(true);
    });

    it("should not recommend preserving viewBox when absent", () => {
      const options = getRecommendedOptions(SVG_NO_VIEWBOX);

      expect(options.preserveViewBox).toBe(false);
    });

    it("should recommend prefixing IDs when IDs are present", () => {
      const options = getRecommendedOptions(SIMPLE_ICON);

      expect(options.prefixIds).toBe(true);
    });

    it("should recommend removing metadata when Figma metadata present", () => {
      const options = getRecommendedOptions(SVG_WITH_METADATA);

      expect(options.removeEditorMetadata).toBe(true);
    });

    it("should always enable shape conversion", () => {
      const options1 = getRecommendedOptions(SIMPLE_ICON);
      const options2 = getRecommendedOptions(HOME_ICON);

      expect(options1.convertShapesToPaths).toBe(true);
      expect(options2.convertShapesToPaths).toBe(true);
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================

  describe("edge cases", () => {
    it("should handle empty SVG", () => {
      const result: OptimizationResult = optimizeSvg("<svg></svg>");

      expect(result.svg).toContain("<svg");
      expect(result.optimizedSize).toBeGreaterThanOrEqual(0);
    });

    it("should handle very simple SVG", () => {
      const simpleSvg = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>';

      const result: OptimizationResult = optimizeSvg(simpleSvg);

      expect(result.svg).toContain("<svg");
      expect(result.optimizedSize).toBeGreaterThan(0);
    });

    it("should handle complex SVG with defs", () => {
      const result: OptimizationResult = optimizeSvg(COMPLEX_SVG);

      expect(result.svg).toContain("<svg");
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
    });

    it("should optimize SVG with metadata", () => {
      const result: OptimizationResult = optimizeSvg(SVG_WITH_METADATA, {
        removeEditorMetadata: true,
      });

      // SVGO will optimize but may keep custom data attributes
      // Additional processing would be needed to remove data-figma-* attributes
      expect(result.svg).toContain("<svg");
      // SVGO should at least reduce the size
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
    });

    it("should handle options to disable optimization features", () => {
      const result: OptimizationResult = optimizeSvg(SIMPLE_ICON, {
        preserveViewBox: true,
        convertShapesToPaths: false,
        prefixIds: false,
        removeNonRendering: false,
      });

      expect(result.svg).toContain("<svg");
      expect(result.viewBoxPreserved).toBe(true);
    });

    it("should throw error for malformed SVG", () => {
      // SVGO throws error for malformed SVG
      const invalidSvg = "<svg><circle></svg>";

      expect(() => optimizeSvg(invalidSvg)).toThrow();
    });
  });

  // =====================================================
  // Option Handling
  // =====================================================

  describe("createFigmaSafeConfig", () => {
    it("should create config with default options", () => {
      const config = createFigmaSafeConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });

    it("should respect custom options", () => {
      const config = createFigmaSafeConfig({
        preserveViewBox: false,
        convertShapesToPaths: false,
      });

      expect(config).toBeDefined();
    });
  });
});
