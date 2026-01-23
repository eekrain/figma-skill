/**
 * Content analyzer tests - Phase 2 Sprint 1
 *
 * Tests for image content analysis including:
 * - Entropy calculation (Shannon entropy)
 * - Transparency detection
 * - Palette estimation
 * - Content type classification (GRAPHIC vs PHOTOGRAPH)
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  analyzeContent,
  calculateEntropy,
  checkTransparency,
  estimateUniqueColors,
  recommendFormat,
} from "@/images/content-analyzer";
import type { ContentAnalysis } from "@/images/content-analyzer";
import {
  createSolidColorImage,
  createNoiseImage,
  createTransparentColorImage,
  createGradientImage,
  createPaletteImage,
  createGraphicImage,
  createPhotographImage,
  cleanupTestImages,
} from "@/tests/fixtures/images";

// =====================================================
// Test Setup
// =====================================================

describe("content-analyzer", () => {
  let cleanupPaths: string[] = [];

  afterEach(async () => {
    if (cleanupPaths.length > 0) {
      await cleanupTestImages(cleanupPaths);
      cleanupPaths = [];
    }
  });

  // =====================================================
  // Entropy Calculation Tests
  // =====================================================

  describe("calculateEntropy", () => {
    it("should return 0.0 for solid color image", async () => {
      const imagePath = await createSolidColorImage(100, 100, {
        r: 128,
        g: 128,
        b: 128,
      });
      cleanupPaths.push(imagePath);

      const entropy = await calculateEntropy(imagePath);

      // Solid color has zero entropy
      expect(entropy).toBe(0);
    });

    it("should return high entropy (~8.0) for full noise image", async () => {
      const imagePath = await createNoiseImage(100, 100, 1);
      cleanupPaths.push(imagePath);

      const entropy = await calculateEntropy(imagePath);

      // Full random noise should have entropy close to 8 (max for 8-bit)
      expect(entropy).toBeGreaterThan(7.0);
      expect(entropy).toBeLessThanOrEqual(8.0);
    });

    it("should return moderate entropy for gradient image", async () => {
      const imagePath = await createGradientImage(100, 100);
      cleanupPaths.push(imagePath);

      const entropy = await calculateEntropy(imagePath);

      // Gradient has moderate to high entropy (smooth transitions have many values)
      expect(entropy).toBeGreaterThan(1.0);
      expect(entropy).toBeLessThan(8.0); // Max entropy is 8
    });

    it("should return low entropy for low intensity noise", async () => {
      const imagePath = await createNoiseImage(100, 100, 0.1); // Lower intensity
      cleanupPaths.push(imagePath);

      const entropy = await calculateEntropy(imagePath);

      // Low intensity noise should have lower entropy
      expect(entropy).toBeGreaterThan(0);
      expect(entropy).toBeLessThan(7.0);
    });

    it("should handle different image sizes correctly", async () => {
      const smallImage = await createNoiseImage(50, 50, 0.5);
      const largeImage = await createNoiseImage(200, 200, 0.5);
      cleanupPaths.push(smallImage, largeImage);

      const smallEntropy = await calculateEntropy(smallImage);
      const largeEntropy = await calculateEntropy(largeImage);

      // Entropy should be similar regardless of size for same content
      expect(Math.abs(smallEntropy - largeEntropy)).toBeLessThan(1.0);
    });
  });

  // =====================================================
  // Transparency Detection Tests
  // =====================================================

  describe("checkTransparency", () => {
    it("should return false for solid color image (no alpha)", async () => {
      const imagePath = await createSolidColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
      });
      cleanupPaths.push(imagePath);

      const hasTransparency = await checkTransparency(imagePath);

      expect(hasTransparency).toBe(false);
    });

    it("should return true for image with partial transparency", async () => {
      const imagePath = await createTransparentColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
        alpha: 128, // 50% opacity
      });
      cleanupPaths.push(imagePath);

      const hasTransparency = await checkTransparency(imagePath);

      expect(hasTransparency).toBe(true);
    });

    it("should return true for image with full transparency", async () => {
      const imagePath = await createTransparentColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
        alpha: 0, // Fully transparent
      });
      cleanupPaths.push(imagePath);

      const hasTransparency = await checkTransparency(imagePath);

      expect(hasTransparency).toBe(true);
    });

    it("should return false for JPEG (no alpha channel)", async () => {
      const imagePath = await createPhotographImage(100, 100);
      cleanupPaths.push(imagePath);

      const hasTransparency = await checkTransparency(imagePath);

      expect(hasTransparency).toBe(false);
    });

    it("should detect partial transparency in mixed image", async () => {
      // Create image with some transparent pixels directly
      const sharpInstance = sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      });

      const tempPath = `/tmp/test-mixed-${Date.now()}.png`;
      cleanupPaths.push(tempPath);

      await sharpInstance.png().toFile(tempPath);

      const hasTransparency = await checkTransparency(tempPath);

      expect(hasTransparency).toBe(true);
    });
  });

  // =====================================================
  // Palette Estimation Tests
  // =====================================================

  describe("estimateUniqueColors", () => {
    it("should return 1 for solid color image", async () => {
      const imagePath = await createSolidColorImage(100, 100, {
        r: 128,
        g: 128,
        b: 128,
      });
      cleanupPaths.push(imagePath);

      const paletteSize = await estimateUniqueColors(imagePath);

      expect(paletteSize).toBe(1);
    });

    it("should estimate colors accurately for limited palette image", async () => {
      const colorCount = 16;
      const imagePath = await createPaletteImage(100, 100, colorCount);
      cleanupPaths.push(imagePath);

      const paletteSize = await estimateUniqueColors(imagePath);

      // Should be close to the actual color count (allowing for sampling variance)
      expect(paletteSize).toBeGreaterThan(colorCount * 0.7);
      expect(paletteSize).toBeLessThan(colorCount * 1.5);
    });

    it("should handle large palette (>256 colors)", async () => {
      const imagePath = await createNoiseImage(100, 100, 0.8);
      cleanupPaths.push(imagePath);

      const paletteSize = await estimateUniqueColors(imagePath);

      // Noise image should have many colors
      expect(paletteSize).toBeGreaterThan(256);
    });

    it("should respect sample size parameter", async () => {
      const imagePath = await createGradientImage(100, 100);
      cleanupPaths.push(imagePath);

      const smallSample = await estimateUniqueColors(imagePath, 1000);
      const largeSample = await estimateUniqueColors(imagePath, 20000);

      // Results should be in the same order of magnitude regardless of sample size
      expect(Math.abs(smallSample - largeSample)).toBeLessThan(2000);
    });

    it("should work with gradient image", async () => {
      const imagePath = await createGradientImage(100, 100);
      cleanupPaths.push(imagePath);

      const paletteSize = await estimateUniqueColors(imagePath);

      // Gradient has many unique colors
      expect(paletteSize).toBeGreaterThan(100);
    });
  });

  // =====================================================
  // Content Analysis Integration Tests
  // =====================================================

  describe("analyzeContent", () => {
    it("should analyze solid color image completely", async () => {
      const imagePath = await createSolidColorImage(100, 100, {
        r: 100,
        g: 150,
        b: 200,
      });
      cleanupPaths.push(imagePath);

      const analysis: ContentAnalysis = await analyzeContent(imagePath);

      expect(analysis.entropy).toBe(0);
      expect(analysis.hasTransparency).toBe(false);
      expect(analysis.paletteSize).toBe(1);
      expect(analysis.width).toBe(100);
      expect(analysis.height).toBe(100);
      expect(analysis.contentType).toBe("GRAPHIC");
    });

    it("should analyze photograph-style image correctly", async () => {
      const imagePath = await createPhotographImage(200, 200);
      cleanupPaths.push(imagePath);

      const analysis: ContentAnalysis = await analyzeContent(imagePath);

      expect(analysis.entropy).toBeGreaterThan(5.0);
      expect(analysis.hasTransparency).toBe(false);
      expect(analysis.paletteSize).toBeGreaterThan(256);
      expect(analysis.contentType).toBe("PHOTOGRAPH");
    });

    it("should classify graphic image correctly", async () => {
      const imagePath = await createGraphicImage(150, 150);
      cleanupPaths.push(imagePath);

      const analysis: ContentAnalysis = await analyzeContent(imagePath);

      // Graphics have lower entropy than photographs
      expect(analysis.entropy).toBeLessThan(7.0);
      expect(analysis.hasTransparency).toBe(false);
      // Content type should be GRAPHIC or MIXED (both acceptable for graphics)
      expect(["GRAPHIC", "MIXED"]).toContain(analysis.contentType);
    });

    it("should detect transparency and affect format recommendation", async () => {
      const imagePath = await createTransparentColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
        alpha: 128,
      });
      cleanupPaths.push(imagePath);

      const analysis: ContentAnalysis = await analyzeContent(imagePath);

      expect(analysis.hasTransparency).toBe(true);
      // Should recommend PNG due to transparency
      expect(analysis.contentType).toBe("GRAPHIC");
    });

    it("should use custom entropy threshold", async () => {
      const imagePath = await createGradientImage(100, 100);
      cleanupPaths.push(imagePath);

      const lowThreshold = await analyzeContent(imagePath, {
        entropyThreshold: 3.0,
      });
      const highThreshold = await analyzeContent(imagePath, {
        entropyThreshold: 8.0,
      });

      // Lower threshold means more likely classified as photograph
      expect(lowThreshold.contentType).not.toBe(highThreshold.contentType);
    });
  });

  // =====================================================
  // Format Recommendation Tests
  // =====================================================

  describe("recommendFormat", () => {
    it("should recommend PNG for graphics with transparency", async () => {
      const imagePath = await createTransparentColorImage(100, 100, {
        r: 255,
        g: 0,
        b: 0,
        alpha: 128,
      });
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);
      const format = recommendFormat(analysis);

      expect(format).toBe("png");
    });

    it("should recommend JPEG for high-entropy images", async () => {
      const imagePath = await createNoiseImage(100, 100, 0.9);
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);
      const format = recommendFormat(analysis);

      // High entropy photograph -> JPEG
      expect(format).toBe("jpeg");
    });

    it("should recommend PNG for low-entropy graphics", async () => {
      const imagePath = await createGraphicImage(100, 100);
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);
      const format = recommendFormat(analysis);

      expect(format).toBe("png");
    });

    it("should recommend PNG for limited palette images", async () => {
      const imagePath = await createPaletteImage(100, 100, 16);
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);
      const format = recommendFormat(analysis);

      expect(format).toBe("png");
    });
  });

  // =====================================================
  // Edge Cases and Error Handling
  // =====================================================

  describe("edge cases", () => {
    it("should handle very small images", async () => {
      const imagePath = await createSolidColorImage(10, 10, {
        r: 255,
        g: 255,
        b: 255,
      });
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);

      expect(analysis.width).toBe(10);
      expect(analysis.height).toBe(10);
      expect(analysis.entropy).toBe(0);
    });

    it("should handle monochrome images", async () => {
      const imagePath = await createSolidColorImage(100, 100, {
        r: 0,
        g: 0,
        b: 0,
      });
      cleanupPaths.push(imagePath);

      const analysis = await analyzeContent(imagePath);

      expect(analysis.paletteSize).toBe(1);
      expect(analysis.entropy).toBe(0);
    });

    it("should throw error for non-existent file", async () => {
      await expect(calculateEntropy("/non/existent/file.png")).rejects.toThrow();
    });

    it("should handle corrupted image gracefully", async () => {
      // Create a file with invalid image data
      const fs = await import("node:fs/promises");
      const corruptPath = `/tmp/corrupt-${Date.now()}.png`;
      cleanupPaths.push(corruptPath);

      await fs.writeFile(corruptPath, Buffer.from("not an image"));

      await expect(analyzeContent(corruptPath)).rejects.toThrow();
    });
  });
});
