/**
 * Performance Benchmark Tests
 *
 * Establishes performance baselines for key operations.
 * These tests ensure that the codebase maintains acceptable performance
 * and helps catch performance regressions.
 *
 * Targets are based on typical use cases and should be reviewed
 * periodically as the codebase evolves.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { rm } from "node:fs/promises";
import { join } from "node:path";

// Module imports
import {
  applyVectorMask,
  alignCoordinateSpaces,
  analyzeContent,
  convertToOptimalFormat,
  canonicalizeSvg,
  optimizeSvg,
  deduplicateSvgs,
  type CompositeOptions,
  type AlignedAssets,
} from "../../images/index.js";
import {
  createPhotographImage,
  createGradientImage,
  createSolidColorImage,
  cleanupTestImages,
} from "../fixtures/images.js";
import {
  CIRCLE_MASK_SVG,
  SIMPLE_ICON,
  getAllIconFixtures,
} from "../fixtures/svg.js";
import {
  withTempDirectory,
  createTempDir,
} from "../utils/integration-helpers.js";
import {
  runBenchmark,
  assertPerformance,
  measureExecutionTime,
  createPerformanceMarker,
  type BenchmarkResult,
} from "../utils/performance-helpers.js";

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
  const temp = await createTempDir("benchmark-");
  context = {
    tempDir: temp.path,
    testImages: [],
  };
});

afterAll(async () => {
  await cleanupTestImages(context.testImages);
  await rm(context.tempDir, { recursive: true, force: true });
});

// =====================================================
// Test Suite: Mask Compositing Performance
// =====================================================

describe("Performance Benchmarks: Mask Compositing", () => {
  it("should composite circular mask in <500ms", async () => {
    const marker = createPerformanceMarker("circular-mask-composite");

    // Given: 1024x1024 image with circular mask
    const targetImagePath = await createGradientImage(1024, 1024);
    context.testImages.push(targetImagePath);

    const targetMaskPath = join(context.tempDir, "perf-target.png");
    const sharp = (await import("sharp")).default;
    await sharp(targetImagePath).png().toFile(targetMaskPath);

    const outputPath = join(context.tempDir, "perf-output.png");
    context.testImages.push(outputPath);

    const alignment: AlignedAssets = {
      targetImage: {
        path: targetMaskPath,
        width: 1024,
        height: 1024,
        bounds: { x: 0, y: 0, width: 1024, height: 1024 },
      },
      mask: {
        path: "circular-mask",
        width: 1024,
        height: 1024,
        bounds: { x: 0, y: 0, width: 1024, height: 1024 },
      },
      compositeDimensions: { width: 1024, height: 1024 },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // When: Applying vector mask
    const options: CompositeOptions = {
      targetImagePath: targetMaskPath,
      maskInput: CIRCLE_MASK_SVG,
      outputPath,
      alignment,
      maskType: "VECTOR",
    };

    await applyVectorMask(options);
    const duration = marker.elapsed();

    // Then: Completes in <500ms
    expect(duration).toBeLessThan(500);
  });

  it("should handle nested masks in <1s", async () => {
    const marker = createPerformanceMarker("nested-mask-composite");

    // Given: 3-level nested mask structure
    // Simulate by applying mask multiple times
    const baseImagePath = await createGradientImage(512, 512);
    context.testImages.push(baseImagePath);

    const outputPath1 = join(context.tempDir, "nested-1.png");
    const outputPath2 = join(context.tempDir, "nested-2.png");
    const outputPath3 = join(context.tempDir, "nested-3.png");
    context.testImages.push(outputPath1, outputPath2, outputPath3);

    const alignment: AlignedAssets = {
      targetImage: {
        path: baseImagePath,
        width: 512,
        height: 512,
        bounds: { x: 0, y: 0, width: 512, height: 512 },
      },
      mask: {
        path: "mask",
        width: 512,
        height: 512,
        bounds: { x: 0, y: 0, width: 512, height: 512 },
      },
      compositeDimensions: { width: 512, height: 512 },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // When: Applying nested masks sequentially
    await applyVectorMask({
      targetImagePath: baseImagePath,
      maskInput: CIRCLE_MASK_SVG,
      outputPath: outputPath1,
      alignment,
      maskType: "VECTOR",
    });

    await applyVectorMask({
      targetImagePath: outputPath1,
      maskInput: CIRCLE_MASK_SVG,
      outputPath: outputPath2,
      alignment,
      maskType: "VECTOR",
    });

    await applyVectorMask({
      targetImagePath: outputPath2,
      maskInput: CIRCLE_MASK_SVG,
      outputPath: outputPath3,
      alignment,
      maskType: "VECTOR",
    });

    const duration = marker.elapsed();

    // Then: <1 second total
    expect(duration).toBeLessThan(1000);
  });
});

// =====================================================
// Test Suite: Format Conversion Performance
// =====================================================

describe("Performance Benchmarks: Format Conversion", () => {
  it("should convert 100 images in <30s", async () => {
    const marker = createPerformanceMarker("convert-100-images");

    // Given: 100 mixed images (photos + graphics)
    const images: string[] = [];

    for (let i = 0; i < 50; i++) {
      const photo = await createPhotographImage(800, 600);
      images.push(photo);
      context.testImages.push(photo);

      const graphic = await createSolidColorImage(400, 300, {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
      });
      images.push(graphic);
      context.testImages.push(graphic);
    }

    // When: Converting all images
    const results: Array<{ success: boolean; duration: number }> = [];

    for (let i = 0; i < images.length; i++) {
      const start = performance.now();
      try {
        const outputPath = join(context.tempDir, `convert-${i}.jpg`);
        await convertToOptimalFormat({
          inputPath: images[i],
          outputPath,
          format: i % 2 === 0 ? "jpeg" : "png",
        });
        results.push({ success: true, duration: performance.now() - start });
      } catch {
        results.push({ success: false, duration: performance.now() - start });
      }
    }

    const duration = marker.elapsed();

    // Then: <30s total, <300ms average per image
    expect(results.filter((r) => r.success).length).toBe(100);
    expect(duration).toBeLessThan(30000);
    expect(duration / 100).toBeLessThan(300);
  });

  it("should analyze content in <100ms per image", async () => {
    const marker = createPerformanceMarker("analyze-content-2048");

    // Given: 2048x2048 image
    const imagePath = await createPhotographImage(2048, 2048);
    context.testImages.push(imagePath);

    // When: Analyzing content
    const analysis = analyzeContent(imagePath);
    const duration = marker.elapsed();

    // Then: <100ms
    expect(duration).toBeLessThan(100);
    expect(analysis.entropy).toBeGreaterThan(0);
  });

  it("should batch convert with performance scaling", async () => {
    // Benchmark conversion at different batch sizes
    const batchSizes = [10, 50, 100];
    const results: Array<{ batchSize: number; totalTime: number; avgTime: number }> = [];

    for (const batchSize of batchSizes) {
      const images: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        const img = await createPhotographImage(512, 512);
        images.push(img);
        context.testImages.push(img);
      }

      const { duration } = await measureExecutionTime(async () => {
        for (let i = 0; i < images.length; i++) {
          const outputPath = join(context.tempDir, `batch-${batchSize}-${i}.jpg`);
          await convertToOptimalFormat({
            inputPath: images[i],
            outputPath,
            format: "jpeg",
            quality: 85,
          });
        }
      });

      results.push({
        batchSize,
        totalTime: duration,
        avgTime: duration / batchSize,
      });
    }

    // Verify performance scales roughly linearly
    // 50 images should take roughly 5x the time of 10 images (allowing 2x variance)
    const ratio10to50 = results[1].totalTime / results[0].totalTime;
    expect(ratio10to50).toBeGreaterThan(2.5); // At least 2.5x
    expect(ratio10to50).toBeLessThan(10); // But not more than 10x

    // 100 images should take roughly 10x the time of 10 images (allowing 3x variance)
    const ratio10to100 = results[2].totalTime / results[0].totalTime;
    expect(ratio10to100).toBeGreaterThan(3); // At least 3x
    expect(ratio10to100).toBeLessThan(20); // But not more than 20x
  });
});

// =====================================================
// Test Suite: Batch Processing Performance
// =====================================================

describe("Performance Benchmarks: Batch Processing", () => {
  it("should process 500 images without OOM", async () => {
    const marker = createPerformanceMarker("process-500-images");

    // Given: 500 images
    const images: string[] = [];

    for (let i = 0; i < 500; i++) {
      const img = await createSolidColorImage(200, 200, {
        r: i % 256,
        g: (i * 2) % 256,
        b: (i * 3) % 256,
      });
      images.push(img);
      context.testImages.push(img);
    }

    const memoryBefore = process.memoryUsage().heapUsed;

    // When: Processing with concurrency = CPU count
    const { result, duration } = await measureExecutionTime(async () => {
      const { processBatch } = await import("../../images/batch-processor.js");

      return await processBatch(
        images.map((img, i) => ({
          inputPath: img,
          outputPath: join(context.tempDir, `batch-500-${i}.png`),
        })),
        async (task) => {
          await convertToOptimalFormat({
            inputPath: task.inputPath,
            outputPath: task.outputPath,
            format: "png",
          });
          return { success: true };
        },
        { concurrency: require("node:os").cpus().length }
      );
    });

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsedMB = (memoryAfter - memoryBefore) / 1024 / 1024;

    // Then: Complete successfully, heap < 2GB
    expect(result.completed).toBe(500);
    expect(result.failed).toBe(0);
    expect(memoryUsedMB).toBeLessThan(2048); // <2GB
    expect(duration).toBeLessThan(60000); // <60 seconds
  });

  it("should maintain stable heap usage", async () => {
    // Benchmark: 1000 images in batches
    const batchSize = 100;
    const numBatches = 10;
    const measurements: Array<number> = [];

    for (let batch = 0; batch < numBatches; batch++) {
      const images: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        const img = await createSolidColorImage(150, 150, {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
        });
        images.push(img);
        context.testImages.push(img);
      }

      const memoryBefore = process.memoryUsage().heapUsed;

      // Process batch
      const { processBatch } = await import("../../images/batch-processor.js");
      await processBatch(
        images.map((img, i) => ({
          inputPath: img,
          outputPath: join(context.tempDir, `stable-${batch}-${i}.png`),
        })),
        async (task) => {
          await convertToOptimalFormat({
            inputPath: task.inputPath,
            outputPath: task.outputPath,
            format: "png",
          });
          return { success: true };
        },
        { concurrency: 4 }
      );

      const memoryAfter = process.memoryUsage().heapUsed;
      measurements.push(memoryAfter - memoryBefore);
    }

    // Check for memory leaks - last batch should not use significantly more than first
    const firstBatchMem = measurements[0];
    const lastBatchMem = measurements[measurements.length - 1];
    const growth = ((lastBatchMem - firstBatchMem) / firstBatchMem) * 100;

    // Allow up to 50% growth for cache and normal variance
    expect(growth).toBeLessThan(50);
  });
});

// =====================================================
// Test Suite: Vector Optimization Performance
// =====================================================

describe("Performance Benchmarks: Vector Optimization", () => {
  it("should optimize 100 SVGs in <5s", async () => {
    const marker = createPerformanceMarker("optimize-100-svg");

    // Given: 100 SVG icons
    const icons = getAllIconFixtures();
    const svgs: string[] = [];

    for (let i = 0; i < 100; i++) {
      const randomIcon = Object.values(icons)[i % Object.keys(icons).length];
      svgs.push(randomIcon);
    }

    // When: Optimizing
    const results = svgs.map((svg) => optimizeSvg(svg));
    const duration = marker.elapsed();

    // Then: <50ms average per SVG
    expect(results.length).toBe(100);
    expect(duration).toBeLessThan(5000);
    expect(duration / 100).toBeLessThan(50);
  });

  it("should deduplicate 200 SVGs in <2s", async () => {
    const marker = createPerformanceMarker("deduplicate-200-svg");

    // Given: 200 SVGs
    const icons = getAllIconFixtures();
    const svgs: string[] = [];

    for (let i = 0; i < 200; i++) {
      const randomIcon = Object.values(icons)[i % Object.keys(icons).length];
      svgs.push(randomIcon);
    }

    // When: Deduplicating
    const canonicalized = svgs.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);
    const duration = marker.elapsed();

    // Then: <10ms average per SVG
    expect(result.uniqueSvgs.length).toBeLessThan(200);
    expect(duration).toBeLessThan(2000);
    expect(duration / 200).toBeLessThan(10);
  });

  it("should hash SVGs efficiently", async () => {
    const marker = createPerformanceMarker("hash-1000-svg");

    // Given: 1000 SVG strings
    const icons = getAllIconFixtures();
    const svgs: string[] = [];

    for (let i = 0; i < 1000; i++) {
      const randomIcon = Object.values(icons)[i % Object.keys(icons).length];
      svgs.push(randomIcon);
    }

    // When: Computing hashes
    const hashes = svgs.map((svg) => canonicalizeSvg(svg).hash);
    const duration = marker.elapsed();

    // Then: <1ms average per SVG
    expect(hashes.length).toBe(1000);
    expect(duration).toBeLessThan(1000);
    expect(duration / 1000).toBeLessThan(1);
  });
});

// =====================================================
// Test Suite: Detailed Benchmarks
// =====================================================

describe("Performance Benchmarks: Detailed Analysis", () => {
  it("should provide detailed benchmark results", async () => {
    // Given: Target operation
    async function targetOperation() {
      const img = await createPhotographImage(800, 600);
      context.testImages.push(img);

      await convertToOptimalFormat({
        inputPath: img,
        outputPath: join(context.tempDir, "detailed-benchmark.jpg"),
        format: "jpeg",
        quality: 85,
      });
    }

    // When: Running detailed benchmark
    const result = await runBenchmark(targetOperation, {
      iterations: 50,
      warmupIterations: 5,
      minDuration: 100,
    });

    // Then: Detailed statistics available
    expect(result.name).toBe("targetOperation");
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.averageTime).toBeGreaterThan(0);
    expect(result.minTime).toBeGreaterThan(0);
    expect(result.maxTime).toBeGreaterThan(0);
    expect(result.throughput).toBeGreaterThan(0);
    expect(result.percentile95).toBeGreaterThan(0);
    expect(result.percentile99).toBeGreaterThan(0);

    // Verify consistency - 99th percentile shouldn't be too far from average
    const ratio = result.percentile99 / result.averageTime;
    expect(ratio).toBeLessThan(5); // Not more than 5x variation
  });

  it("should compare performance between implementations", async () => {
    // Compare: solid color vs photograph conversion
    const solidImg = await createSolidColorImage(500, 500, { r: 128, g: 128, b: 128 });
    const photoImg = await createPhotographImage(500, 500);
    context.testImages.push(solidImg, photoImg);

    const result1 = await runBenchmark(
      async () => {
        await convertToOptimalFormat({
          inputPath: solidImg,
          outputPath: join(context.tempDir, "compare-solid.jpg"),
          format: "jpeg",
        });
      },
      { iterations: 20 }
    );

    const result2 = await runBenchmark(
      async () => {
        await convertToOptimalFormat({
          inputPath: photoImg,
          outputPath: join(context.tempDir, "compare-photo.jpg"),
          format: "jpeg",
        });
      },
      { iterations: 20 }
    );

    // Both should complete in reasonable time
    expect(result1.averageTime).toBeLessThan(500);
    expect(result2.averageTime).toBeLessThan(500);
  });
});

// =====================================================
// Test Suite: Performance Regression Detection
// =====================================================

describe("Performance Benchmarks: Regression Detection", () => {
  it("should detect performance regressions in mask compositing", async () => {
    // Baseline: circular mask should be <500ms
    const targetPath = await createGradientImage(1024, 1024);
    context.testImages.push(targetPath);

    const outputPath = join(context.tempDir, "regression-test.png");
    context.testImages.push(outputPath);

    const alignment: AlignedAssets = {
      targetImage: {
        path: targetPath,
        width: 1024,
        height: 1024,
        bounds: { x: 0, y: 0, width: 1024, height: 1024 },
      },
      mask: {
        path: "mask",
        width: 1024,
        height: 1024,
        bounds: { x: 0, y: 0, width: 1024, height: 1024 },
      },
      compositeDimensions: { width: 1024, height: 1024 },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // Assert performance meets baseline
    await assertPerformance(
      async () => {
        await applyVectorMask({
          targetImagePath: targetPath,
          maskInput: CIRCLE_MASK_SVG,
          outputPath,
          alignment,
          maskType: "VECTOR",
        });
      },
      500, // 500ms target
      0.1 // 10% tolerance
    );
  });

  it("should detect performance regressions in format conversion", async () => {
    // Baseline: photo conversion should be <200ms
    const photoPath = await createPhotographImage(800, 600);
    context.testImages.push(photoPath);

    const outputPath = join(context.tempDir, "regression-photo.jpg");
    context.testImages.push(outputPath);

    await assertPerformance(
      async () => {
        await convertToOptimalFormat({
          inputPath: photoPath,
          outputPath,
          format: "jpeg",
          quality: 85,
        });
      },
      200, // 200ms target
      0.15 // 15% tolerance
    );
  });
});
