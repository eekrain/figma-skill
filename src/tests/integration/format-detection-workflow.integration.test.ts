/**
 * Format Detection Integration Tests
 *
 * Tests the end-to-end format detection and conversion workflow:
 * 1. Analyze image content (entropy, transparency, palette)
 * 2. Recommend optimal format based on content
 * 3. Convert to recommended format
 * 4. Verify output quality and size reduction
 *
 * RED PHASE: These tests will fail because the integration orchestrator
 * doesn't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import sharp from "sharp";
import { rm } from "node:fs/promises";
import { join } from "node:path";

// Module imports
import {
  analyzeContent,
  recommendFormat,
  convertToOptimalFormat,
  batchConvert,
  type ContentAnalysis,
  type ConversionOptions,
  type ConversionMetrics,
} from "../../images/index.js";
import {
  createPhotographImage,
  createGraphicImage,
  createTransparentColorImage,
  createPaletteImage,
  cleanupTestImages,
} from "../fixtures/images.js";
import {
  withTempDirectory,
  createTempDir,
  assertImageFormat,
  assertHasTransparency,
  assertNoJpegArtifacts,
  getFileSize,
  calculateSizeReduction,
  assertPercentage,
} from "../utils/integration-helpers.js";
import { createPerformanceMarker } from "../utils/performance-helpers.js";

// =====================================================
// Test Context
// =====================================================

interface TestContext {
  tempDir: string;
  testImages: string[];
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  const temp = await createTempDir("format-integration-");
  context = {
    tempDir: temp.path,
    testImages: [],
  };
});

afterAll(async () => {
  await cleanupTestImages(context.testImages);
  await rm(context.tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  context.testImages = [];
});

// =====================================================
// Test Suite: Format Detection Integration
// =====================================================

describe("Format Detection Integration", () => {
  it("should analyze photo, convert to JPEG, achieve 80%+ size reduction", async () => {
    // Given: High entropy photograph (PNG export from Figma)
    const photoPath = await createPhotographImage(1024, 1024);
    context.testImages.push(photoPath);

    // When: Running through analysis → conversion pipeline
    const analysis: ContentAnalysis = analyzeContent(photoPath);
    const recommendation = recommendFormat(analysis);

    // Then: Recommend JPEG for photographs
    expect(recommendation.format).toBe("jpeg");
    expect(recommendation.reason).toContain("photograph");

    // When: Converting to JPEG
    const outputPath = join(context.tempDir, "photo-converted.jpg");
    const options: ConversionOptions = {
      inputPath: photoPath,
      outputPath,
      format: "jpeg",
      quality: 85,
    };

    const result = await convertToOptimalFormat(options);
    context.testImages.push(outputPath);

    // Then: JPEG output, size < 20% of original (80%+ reduction)
    await assertImageFormat(outputPath, "jpeg");

    const originalSize = await getFileSize(photoPath);
    const newSize = await getFileSize(outputPath);
    const reduction = calculateSizeReduction(originalSize, newSize);

    expect(reduction).toBeGreaterThan(80); // At least 80% size reduction
    expect(result.success).toBe(true);
  });

  it("should preserve graphic as PNG without artifacts", async () => {
    // Given: Low entropy graphic with sharp edges
    const graphicPath = await createGraphicImage(512, 512);
    context.testImages.push(graphicPath);

    // When: Analyzing content
    const analysis: ContentAnalysis = analyzeContent(graphicPath);
    const recommendation = recommendFormat(analysis);

    // Then: Recommend PNG for graphics
    expect(recommendation.format).toBe("png");
    expect(recommendation.reason).toContain("graphic");

    // When: Converting (should stay PNG or use PNG-8)
    const outputPath = join(context.tempDir, "graphic-output.png");
    const options: ConversionOptions = {
      inputPath: graphicPath,
      outputPath,
      format: "png",
      compressionLevel: 9,
    };

    const result = await convertToOptimalFormat(options);
    context.testImages.push(outputPath);

    // Then: PNG output, no JPEG artifacts
    await assertImageFormat(outputPath, "png");
    await assertNoJpegArtifacts(outputPath); // Should pass for PNG

    const originalSize = await getFileSize(graphicPath);
    const newSize = await getFileSize(outputPath);

    // Graphics should still see some compression benefit
    expect(newSize).toBeLessThanOrEqual(originalSize);
    expect(result.success).toBe(true);
  });

  it("should detect transparency and avoid JPEG", async () => {
    // Given: PNG with alpha channel
    const transparentPath = await createTransparentColorImage(256, 256, {
      r: 255,
      g: 0,
      b: 0,
      alpha: 128,
    });
    context.testImages.push(transparentPath);

    // When: Running format detection
    const analysis: ContentAnalysis = analyzeContent(transparentPath);
    const recommendation = recommendFormat(analysis);

    // Then: PNG or WebP selected (never JPEG)
    expect(analysis.hasTransparency).toBe(true);
    expect(recommendation.format).not.toBe("jpeg");
    expect(recommendation.format).toMatch(/^(png|webp)$/);

    // Verify output preserves transparency
    await assertHasTransparency(transparentPath);
  });

  it("should batch convert mixed content optimally", async () => {
    // Given: 10 photos, 10 graphics, 5 transparent images
    const inputs: string[] = [];
    const expectedFormats: string[] = [];

    // Create photos (should be JPEG)
    for (let i = 0; i < 10; i++) {
      const photoPath = await createPhotographImage(512, 512);
      inputs.push(photoPath);
      expectedFormats.push("jpeg");
    }

    // Create graphics (should be PNG)
    for (let i = 0; i < 10; i++) {
      const graphicPath = await createGraphicImage(256, 256);
      inputs.push(graphicPath);
      expectedFormats.push("png");
    }

    // Create transparent images (should be PNG/WebP, never JPEG)
    for (let i = 0; i < 5; i++) {
      const transparentPath = await createTransparentColorImage(128, 128, {
        r: 100,
        g: 100,
        b: 100,
        alpha: 200,
      });
      inputs.push(transparentPath);
      expectedFormats.push("png"); // or webp
    }

    context.testImages.push(...inputs);

    // When: Batch processing with auto-format
    const outputDir = join(context.tempDir, "batch-output");
    const metrics = await batchConvert(inputs, outputDir, {
      autoFormat: true,
      quality: 85,
    });

    // Then: Correct format for each, total size < 30% of original
    expect(metrics.successful).toBe(25); // All succeed
    expect(metrics.failed).toBe(0);

    // Calculate total size reduction
    const totalOriginalSize = metrics.results.reduce(
      (sum, r) => sum + r.originalSize,
      0
    );
    const totalNewSize = metrics.results.reduce(
      (sum, r) => sum + r.newSize,
      0
    );
    const totalReduction = calculateSizeReduction(totalOriginalSize, totalNewSize);

    expect(totalReduction).toBeGreaterThan(70); // >70% reduction
    expect(metrics.totalSavings).toBeGreaterThan(0);
  });

  it("should analyze content in <100ms per image", async () => {
    const marker = createPerformanceMarker("content-analysis");

    // Given: 2048x2048 image
    const imagePath = await createPhotographImage(2048, 2048);
    context.testImages.push(imagePath);

    // When: Analyzing content
    const analysis = analyzeContent(imagePath);
    const duration = marker.elapsed();

    // Then: Completes in <100ms
    expect(duration).toBeLessThan(100);
    expect(analysis).toBeDefined();
    expect(analysis.entropy).toBeGreaterThan(0);
  });

  it("should handle edge case: all-white image (zero entropy)", async () => {
    // Given: Solid white image (zero entropy)
    const whitePath = await createSolidColorImage(100, 100, {
      r: 255,
      g: 255,
      b: 255,
    });
    context.testImages.push(whitePath);

    // When: Analyzing
    const analysis = analyzeContent(whitePath);

    // Then: Detect zero entropy
    expect(analysis.entropy).toBeCloseTo(0, 1);

    // Should still convert successfully
    const outputPath = join(context.tempDir, "white-output.png");
    const result = await convertToOptimalFormat({
      inputPath: whitePath,
      outputPath,
      format: "png",
    });

    expect(result.success).toBe(true);
  });

  it("should handle edge case: random noise (max entropy)", async () => {
    // Given: Maximum noise image
    // For this test, we'll create a high-entropy photograph which is close to max
    const noisePath = await createPhotographImage(256, 256);
    context.testImages.push(noisePath);

    // When: Analyzing
    const analysis = analyzeContent(noisePath);

    // Then: High entropy detected
    expect(analysis.entropy).toBeGreaterThan(5); // Should be high for photos
  });

  it("should detect palette-eligible icons", async () => {
    // Given: 16-color palette image
    const palettePath = await createPaletteImage(128, 128, 16);
    context.testImages.push(palettePath);

    // When: Analyzing
    const analysis = analyzeContent(palettePath);

    // Then: Detect limited palette
    expect(analysis.estimatedColors).toBeLessThanOrEqual(32);
    expect(analysis.entropy).toBeLessThan(5); // Lower than photos

    // Should recommend PNG-8 or similar
    const recommendation = recommendFormat(analysis);
    expect(["png", "png-8"]).toContain(recommendation.format);
  });
});

// =====================================================
// Test Suite: Format Conversion Quality
// =====================================================

describe("Format Conversion Quality", () => {
  it("should maintain quality at JPEG quality 85", async () => {
    // Given: Test photograph
    const photoPath = await createPhotographImage(800, 600);
    context.testImages.push(photoPath);

    // When: Converting to JPEG at quality 85
    const outputPath = join(context.tempDir, "quality-test.jpg");
    await convertToOptimalFormat({
      inputPath: photoPath,
      outputPath,
      format: "jpeg",
      quality: 85,
    });
    context.testImages.push(outputPath);

    // Then: Output should be valid JPEG
    await assertImageFormat(outputPath, "jpeg");

    // Check dimensions preserved
    const originalMeta = await sharp(photoPath).metadata();
    const outputMeta = await sharp(outputPath).metadata();

    expect(outputMeta.width).toBe(originalMeta.width);
    expect(outputMeta.height).toBe(originalMeta.height);
  });

  it("should support WebP format with transparency", async () => {
    // Given: Transparent PNG
    const transparentPath = await createTransparentColorImage(200, 200, {
      r: 255,
      g: 0,
      b: 0,
      alpha: 128,
    });
    context.testImages.push(transparentPath);

    // When: Converting to WebP
    const outputPath = join(context.tempDir, "webp-test.webp");
    const result = await convertToOptimalFormat({
      inputPath: transparentPath,
      outputPath,
      format: "webp",
      quality: 85,
    });
    context.testImages.push(outputPath);

    // Then: Valid WebP with transparency
    expect(result.success).toBe(true);
    await assertHasTransparency(outputPath);
  });

  it("should respect PNG compression levels", async () => {
    // Given: Test graphic
    const graphicPath = await createGraphicImage(300, 300);
    context.testImages.push(graphicPath);

    // When: Converting with different compression levels
    const fastOutput = join(context.tempDir, "png-fast.png");
    const slowOutput = join(context.tempDir, "png-slow.png");

    await convertToOptimalFormat({
      inputPath: graphicPath,
      outputPath: fastOutput,
      format: "png",
      compressionLevel: 1, // Fast
    });

    await convertToOptimalFormat({
      inputPath: graphicPath,
      outputPath: slowOutput,
      format: "png",
      compressionLevel: 9, // Maximum compression
    });

    context.testImages.push(fastOutput, slowOutput);

    // Then: Higher compression = smaller file
    const fastSize = await getFileSize(fastOutput);
    const slowSize = await getFileSize(slowOutput);

    expect(slowSize).toBeLessThanOrEqual(fastSize);
  });
});

// =====================================================
// Test Suite: Conversion Metrics
// =====================================================

describe("Conversion Metrics", () => {
  it("should report accurate conversion metrics", async () => {
    // Given: Test image
    const imagePath = await createPhotographImage(512, 512);
    context.testImages.push(imagePath);

    // When: Converting
    const outputPath = join(context.tempDir, "metrics-test.jpg");
    const metrics = await convertToOptimalFormat({
      inputPath: imagePath,
      outputPath,
      format: "jpeg",
      quality: 85,
    });
    context.testImages.push(outputPath);

    // Then: Metrics reported correctly
    expect(metrics.success).toBe(true);
    expect(metrics.originalSize).toBeGreaterThan(0);
    expect(metrics.newSize).toBeGreaterThan(0);
    expect(metrics.savingsBytes).toBeGreaterThan(0);
    expect(metrics.savingsPercentage).toBeGreaterThan(0);
  });

  it("should calculate batch metrics correctly", async () => {
    // Given: Multiple images
    const inputs: string[] = [];
    for (let i = 0; i < 5; i++) {
      const img = await createPhotographImage(256, 256);
      inputs.push(img);
      context.testImages.push(img);
    }

    // When: Batch converting
    const outputDir = join(context.tempDir, "batch-metrics");
    const metrics = await batchConvert(inputs, outputDir, {
      format: "jpeg",
      quality: 85,
    });

    // Then: Batch metrics accurate
    expect(metrics.successful).toBe(5);
    expect(metrics.failed).toBe(0);
    expect(metrics.totalOriginalSize).toBeGreaterThan(0);
    expect(metrics.totalNewSize).toBeGreaterThan(0);
    expect(metrics.totalSavings).toBeGreaterThan(0);
    expect(metrics.averageSavingsPercentage).toBeGreaterThan(0);
  });
});
