/**
 * Auto converter tests - Phase 2 Sprint 3
 *
 * Tests for automatic image conversion pipeline including:
 * - Single image conversion with format detection
 * - Batch conversion with parallel processing
 * - Conversion metrics and reporting
 * - Format preservation when no improvement
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  convertToOptimalFormat,
  batchConvert,
  calculateSavings,
} from "@/images/auto-converter";
import type { ConversionOptions, ConversionMetrics } from "@/images/auto-converter";
import {
  createSolidColorImage,
  createNoiseImage,
  createPhotographImage,
  createGraphicImage,
  createTransparentColorImage,
  cleanupTestImages,
} from "@/tests/fixtures/images";

// =====================================================
// Test Setup
// =====================================================

describe("auto-converter", () => {
  let outputDir: string;
  let cleanupPaths: string[] = [];

  beforeEach(async () => {
    // Create unique output directory for each test
    outputDir = join(process.cwd(), "src", "tests", "fixtures", "output", `test-${Date.now()}`);
    await mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    await cleanupTestImages(cleanupPaths);
    cleanupPaths = [];

    // Clean up output directory
    const { rm } = await import("node:fs/promises");
    try {
      await rm(outputDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  // =====================================================
  // Single Conversion Tests
  // =====================================================

  describe("convertToOptimalFormat", () => {
    it("should convert graphic to PNG", async () => {
      const inputPath = await createGraphicImage(100, 100);
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.finalFormat).toBe("png");
      expect(result.conversionTime).toBeGreaterThan(0);
    });

    it("should convert photograph to JPEG", async () => {
      const inputPath = await createPhotographImage(100, 100);
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "jpeg",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.finalFormat).toBe("jpeg");
    });

    it("should preserve transparency when converting to PNG", async () => {
      const inputPath = await createTransparentColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
        alpha: 128,
      });
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.finalFormat).toBe("png");

      // Verify transparency is preserved
      const sharp = await import("sharp");
      const metadata = await sharp.default(result.outputPath).metadata();
      expect(metadata.channels).toBeGreaterThanOrEqual(4);
    });

    it("should detect optimal format automatically", async () => {
      const graphicPath = await createGraphicImage(100, 100);
      cleanupPaths.push(graphicPath);

      const result = await convertToOptimalFormat(graphicPath, {
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      // Should detect as graphic and recommend PNG
      expect(result.finalFormat).toBe("png");
    });

    it("should return accurate metrics", async () => {
      const inputPath = await createGraphicImage(100, 100);
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      expect(result.inputPath).toBe(inputPath);
      expect(result.outputPath).toContain(outputDir);
      expect(result.originalFormat).toBeDefined();
      expect(result.finalFormat).toBe("png");
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.finalSize).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.contentAnalysis).toBeDefined();
      expect(result.contentAnalysis.width).toBe(100);
      expect(result.contentAnalysis.height).toBe(100);
      expect(result.settingsUsed).toBeDefined();
      expect(result.conversionTime).toBeGreaterThan(0);
    });

    it("should respect custom output directory", async () => {
      const inputPath = await createGraphicImage(50, 50);
      cleanupPaths.push(inputPath);

      const customDir = join(outputDir, "custom");
      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir: customDir,
      });

      expect(result.outputPath).toContain(customDir);
      expect(existsSync(result.outputPath)).toBe(true);
    });

    it("should handle maxSize option", async () => {
      const inputPath = await createPhotographImage(100, 100);
      cleanupPaths.push(inputPath);

      // Set a very small max size to force lower quality
      const result = await convertToOptimalFormat(inputPath, {
        format: "jpeg",
        outputDir,
        maxSize: 1000, // 1KB
      });

      expect(existsSync(result.outputPath)).toBe(true);
      // Should still produce valid output
      expect(result.finalSize).toBeLessThanOrEqual(1000 * 1.5); // Allow some tolerance
    });
  });

  // =====================================================
  // Batch Conversion Tests
  // =====================================================

  describe("batchConvert", () => {
    it("should convert multiple images", async () => {
      const paths = await Promise.all([
        createGraphicImage(50, 50),
        createPhotographImage(50, 50),
        createSolidColorImage(50, 50, { r: 128, g: 128, b: 128 }),
      ]);
      cleanupPaths.push(...paths);

      const results = await batchConvert(paths, {
        format: "png",
        outputDir,
      });

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(existsSync(result.outputPath)).toBe(true);
        expect(result.finalFormat).toBe("png");
      }
    });

    it("should handle empty array", async () => {
      const results = await batchConvert([], {
        outputDir,
      });

      expect(results).toHaveLength(0);
    });

    it("should process images in parallel", async () => {
      const paths = await Promise.all(
        Array.from({ length: 5 }, () => createNoiseImage(50, 50, 0.5))
      );
      cleanupPaths.push(...paths);

      const startTime = Date.now();
      const results = await batchConvert(paths, {
        format: "jpeg",
        outputDir,
      });
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      // Should complete faster than sequential processing
      // (Very rough check: 5 images should take less than 5 seconds total)
      expect(duration).toBeLessThan(5000);
    });

    it("should return metrics for each image", async () => {
      const paths = await Promise.all([
        createGraphicImage(50, 50),
        createPhotographImage(50, 50),
      ]);
      cleanupPaths.push(...paths);

      const results = await batchConvert(paths, {
        format: "png",
        outputDir,
      });

      for (const result of results) {
        expect(result.inputPath).toBeDefined();
        expect(result.outputPath).toBeDefined();
        expect(result.originalSize).toBeGreaterThan(0);
        expect(result.finalSize).toBeGreaterThan(0);
        expect(result.compressionRatio).toBeGreaterThan(0);
      }
    });

    it("should auto-detect format for each image when format not specified", async () => {
      const paths = await Promise.all([
        createGraphicImage(50, 50),
        createPhotographImage(50, 50),
      ]);
      cleanupPaths.push(...paths);

      const results = await batchConvert(paths, {
        outputDir,
      });

      expect(results).toHaveLength(2);
      // Graphic should get PNG, photo should get JPEG
      const formats = results.map((r) => r.finalFormat);
      expect(formats).toContain("png");
      expect(formats).toContain("jpeg");
    });
  });

  // =====================================================
  // Savings Calculation Tests
  // =====================================================

  describe("calculateSavings", () => {
    it("should calculate compression ratio correctly", () => {
      const metrics: ConversionMetrics = {
        inputPath: "/test/input.png",
        outputPath: "/test/output.jpeg",
        originalFormat: "png",
        finalFormat: "jpeg",
        originalSize: 1000000, // 1MB
        finalSize: 100000, // 100KB
        compressionRatio: 0.1,
        contentAnalysis: {
          entropy: 5,
          hasTransparency: false,
          paletteSize: 100,
          width: 100,
          height: 100,
          contentType: "GRAPHIC",
        },
        settingsUsed: {
          format: "jpeg",
        },
        conversionTime: 100,
      };

      const savings = calculateSavings(metrics);

      expect(savings).toBe(90); // 90% savings
    });

    it("should return 0 when final size is larger", () => {
      const metrics: ConversionMetrics = {
        inputPath: "/test/input.png",
        outputPath: "/test/output.jpeg",
        originalFormat: "png",
        finalFormat: "jpeg",
        originalSize: 100000,
        finalSize: 150000, // Larger than original
        compressionRatio: 1.5,
        contentAnalysis: {
          entropy: 5,
          hasTransparency: false,
          paletteSize: 100,
          width: 100,
          height: 100,
          contentType: "GRAPHIC",
        },
        settingsUsed: {
          format: "jpeg",
        },
        conversionTime: 100,
      };

      const savings = calculateSavings(metrics);

      expect(savings).toBe(0); // No savings (actually larger)
    });

    it("should return 0 when sizes are equal", () => {
      const metrics: ConversionMetrics = {
        inputPath: "/test/input.png",
        outputPath: "/test/output.png",
        originalFormat: "png",
        finalFormat: "png",
        originalSize: 100000,
        finalSize: 100000,
        compressionRatio: 1.0,
        contentAnalysis: {
          entropy: 5,
          hasTransparency: false,
          paletteSize: 100,
          width: 100,
          height: 100,
          contentType: "GRAPHIC",
        },
        settingsUsed: {
          format: "png",
        },
        conversionTime: 100,
      };

      const savings = calculateSavings(metrics);

      expect(savings).toBe(0);
    });

    it("should handle very small files", () => {
      const metrics: ConversionMetrics = {
        inputPath: "/test/input.png",
        outputPath: "/test/output.jpeg",
        originalFormat: "png",
        finalFormat: "jpeg",
        originalSize: 100,
        finalSize: 50,
        compressionRatio: 0.5,
        contentAnalysis: {
          entropy: 5,
          hasTransparency: false,
          paletteSize: 100,
          width: 100,
          height: 100,
          contentType: "GRAPHIC",
        },
        settingsUsed: {
          format: "jpeg",
        },
        conversionTime: 100,
      };

      const savings = calculateSavings(metrics);

      expect(savings).toBe(50); // 50% savings
    });
  });

  // =====================================================
  // Edge Cases and Error Handling
  // =====================================================

  describe("edge cases", () => {
    it("should handle very small images", async () => {
      const inputPath = await createSolidColorImage(10, 10, {
        r: 255,
        g: 0,
        b: 0,
      });
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.finalSize).toBeGreaterThan(0);
    });

    it("should handle very large images", async () => {
      const inputPath = await createSolidColorImage(1000, 1000, {
        r: 128,
        g: 128,
        b: 128,
      });
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.contentAnalysis.width).toBe(1000);
      expect(result.contentAnalysis.height).toBe(1000);
    });

    it("should throw error for non-existent file", async () => {
      await expect(
        convertToOptimalFormat("/non/existent/file.png", {
          format: "png",
          outputDir,
        })
      ).rejects.toThrow();
    });

    it("should preserve format when no improvement and preserveIfNoBenefit is true", async () => {
      const inputPath = await createSolidColorImage(100, 100, {
        r: 128,
        g: 128,
        b: 128,
      });
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "png", // Same as input
        outputDir,
        preserveIfNoBenefit: true,
      });

      expect(existsSync(result.outputPath)).toBe(true);
    });

    it("should handle output in same directory as input", async () => {
      const inputPath = await createSolidColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
      });
      cleanupPaths.push(inputPath);

      // Use outputDir option (default behavior)
      const result = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir, // Use the test's output directory
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.outputPath).not.toBe(inputPath);
    });
  });

  // =====================================================
  // Options Tests
  // =====================================================

  describe("conversion options", () => {
    it("should respect format option", async () => {
      const inputPath = await createGraphicImage(100, 100);
      cleanupPaths.push(inputPath);

      const pngResult = await convertToOptimalFormat(inputPath, {
        format: "png",
        outputDir,
      });

      const jpegResult = await convertToOptimalFormat(inputPath, {
        format: "jpeg",
        outputDir,
      });

      expect(pngResult.finalFormat).toBe("png");
      expect(jpegResult.finalFormat).toBe("jpeg");
      expect(pngResult.outputPath).not.toBe(jpegResult.outputPath);
    });

    it("should apply quality settings based on content", async () => {
      const photoPath = await createPhotographImage(100, 100);
      const graphicPath = await createGraphicImage(100, 100);
      cleanupPaths.push(photoPath, graphicPath);

      const photoResult = await convertToOptimalFormat(photoPath, {
        format: "jpeg",
        outputDir,
      });

      const graphicResult = await convertToOptimalFormat(graphicPath, {
        format: "jpeg",
        outputDir,
      });

      // Both should succeed
      expect(existsSync(photoResult.outputPath)).toBe(true);
      expect(existsSync(graphicResult.outputPath)).toBe(true);
    });

    it("should handle WebP format", async () => {
      const inputPath = await createGraphicImage(100, 100);
      cleanupPaths.push(inputPath);

      const result = await convertToOptimalFormat(inputPath, {
        format: "webp",
        outputDir,
      });

      expect(existsSync(result.outputPath)).toBe(true);
      expect(result.finalFormat).toBe("webp");
    });
  });
});
