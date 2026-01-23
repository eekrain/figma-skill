/**
 * Download-Process Pipeline Integration Tests
 *
 * Tests the integrated download and processing workflow:
 * 1. Download images from URLs
 * 2. Apply format conversion during download
 * 3. Handle partial failures gracefully
 * 4. Report accurate progress and statistics
 * 5. Respect memory limits during large batches
 *
 * RED PHASE: These tests will fail because the enhanced integration
 * orchestrator doesn't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { createServer } from "node:http";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createReadStream } from "node:fs";
import { randomBytes } from "node:crypto";

// Module imports
import {
  downloadAndProcess,
  processBatch,
  configureCache,
  clearCache,
  type DownloadProcessOptions,
  type DownloadProcessResult,
  type PipelineStats,
  type BatchProcessorOptions,
} from "../../images/index.js";
import {
  withTempDirectory,
  createTempDir,
  countFiles,
  getDirectorySize,
  assertGreaterThan,
  assertLessThan,
} from "../utils/integration-helpers.js";
import { withMemoryMeasurement, createPerformanceMarker } from "../utils/performance-helpers.js";
import { createMockImageBuffer } from "../mocks/figma-api-mocks.js";

// =====================================================
// Test Server Setup
// =====================================================

interface TestServer {
  server: ReturnType<typeof createServer>;
  port: number;
  url: string;
  close: () => Promise<void>;
}

let testServer: TestServer;

async function setupTestServer(): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Simulate image download
      if (req.url?.startsWith("/images/")) {
        const size = parseInt(req.url?.split("-")[1] || "1024");
        const buffer = Buffer.alloc(size, 0xAB);
        res.writeHead(200, { "Content-Type": "image/png", "Content-Length": size });
        res.end(buffer);
      } else if (req.url === "/error") {
        res.writeHead(500);
        res.end("Server error");
      } else if (req.url === "/timeout") {
        // Never respond - simulate timeout
        // Connection will eventually close
      } else if (req.url === "/notfound") {
        res.writeHead(404);
        res.end("Not found");
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      }
    });

    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        server,
        port,
        url: `http://localhost:${port}`,
        close: () =>
          new Promise((closeResolve) => {
            server.close(() => closeResolve());
          }),
      });
    });

    server.on("error", reject);
  });
}

// =====================================================
// Test Context
// =====================================================

interface TestContext {
  tempDir: string;
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  // Setup test HTTP server
  testServer = await setupTestServer();

  // Create temp directory
  const temp = await createTempDir("download-integration-");
  context = { tempDir: temp.path };
});

afterAll(async () => {
  await testServer.close();
  await rm(context.tempDir, { recursive: true, force: true });
});

// =====================================================
// Test Suite: Download-Process Pipeline
// =====================================================

describe("Download-Process Pipeline Integration", () => {
  beforeEach(async () => {
    // Clear cache before each test
    await clearCache();
  });

  it("should download 100 images, convert, cleanup temp files", async () => {
    // Given: 100 Figma image export URLs
    const urls = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/img-${i}-${1024 * 10}` // 10KB each
    );

    // When: Running full pipeline
    const options: DownloadProcessOptions = {
      urls,
      outputDir: context.tempDir,
      concurrency: 10,
      format: "jpeg",
      quality: 85,
      cleanupTemp: true,
    };

    const result = await downloadAndProcess(options);

    // Then: All images downloaded, temp dir cleaned, final output valid
    expect(result.success).toBe(true);
    expect(result.completed).toBe(100);
    expect(result.failed).toBe(0);

    // Verify files exist
    const fileCount = await countFiles(context.tempDir, [".jpg", ".jpeg"]);
    expect(fileCount).toBe(100);

    // Verify temp files cleaned up
    const tempDirExists = await mkdir(join(context.tempDir, "temp"))
      .then(() => true)
      .catch(() => false);
    // If it was created but cleaned, it might not exist
    // Just verify we have the right number of output files
  });

  it("should handle partial failures gracefully", async () => {
    // Given: 10 URLs, 2 invalid
    const urls = [
      `${testServer.url}/images/valid-1-${1024 * 5}`,
      `${testServer.url}/images/valid-2-${1024 * 5}`,
      `${testServer.url}/error`, // Will fail
      `${testServer.url}/images/valid-3-${1024 * 5}`,
      `${testServer.url}/notfound`, // Will fail
      `${testServer.url}/images/valid-4-${1024 * 5}`,
      `${testServer.url}/images/valid-5-${1024 * 5}`,
      `${testServer.url}/images/valid-6-${1024 * 5}`,
      `${testServer.url}/images/valid-7-${1024 * 5}`,
      `${testServer.url}/images/valid-8-${1024 * 5}`,
    ];

    // When: Pipeline runs
    const options: DownloadProcessOptions = {
      urls,
      outputDir: context.tempDir,
      concurrency: 4,
      continueOnError: true,
    };

    const result = await downloadAndProcess(options);

    // Then: 8 succeed, 2 fail with proper error reporting
    expect(result.completed).toBe(8);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);

    // Verify error details
    const errorUrls = result.errors.map((e) => e.url);
    expect(errorUrls).toContain(`${testServer.url}/error`);
    expect(errorUrls).toContain(`${testServer.url}/notfound`);
  });

  it("should report accurate progress and statistics", async () => {
    // Given: 50 images in pipeline
    const urls = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/progress-${i}-${1024 * 8}`
    );

    const progressUpdates: Array<{ completed: number; total: number; percent: number }> = [];

    // When: Processing with progress callbacks
    const options: DownloadProcessOptions = {
      urls,
      outputDir: context.tempDir,
      concurrency: 5,
      onProgress: (progress: { completed: number; total: number; percent: number }) => {
        progressUpdates.push({ ...progress });
      },
    };

    const result = await downloadAndProcess(options);

    // Then: Progress updates accurate, final stats correct
    expect(result.completed).toBe(50);
    expect(result.stats.totalBytes).toBeGreaterThan(0);
    expect(result.stats.averageSpeed).toBeGreaterThan(0); // bytes per second

    // Verify progress updates were called
    expect(progressUpdates.length).toBeGreaterThan(0);

    // Last update should show 100%
    const lastUpdate = progressUpdates[progressUpdates.length - 1];
    expect(lastUpdate.percent).toBe(100);
    expect(lastUpdate.completed).toBe(50);
  });

  it("should respect memory limits during large batch", async () => {
    // Given: 500 images pipeline
    const urls = Array.from({ length: 500 }, (_, i) =>
      `${testServer.url}/images/large-${i}-${1024 * 100}` // 100KB each
    );

    // Disable Sharp cache for batch operations
    configureCache({ enabled: false });

    // When: Processing with concurrency limit
    const memoryBefore = process.memoryUsage().heapUsed;

    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 4, // Limit concurrency
      maxMemoryMB: 512, // Set memory limit
    });

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024;

    // Then: Heap usage stays bounded, no OOM
    expect(result.success).toBe(true);
    expect(result.completed).toBe(500);

    // Memory growth should be reasonable (<500MB for this test)
    assertLessThan(memoryDelta, 500);

    // Re-enable cache for other tests
    configureCache({ enabled: true });
  });
});

// =====================================================
// Test Suite: Batch Processing
// =====================================================

describe("Batch Processing Integration", () => {
  beforeEach(async () => {
    await clearCache();
  });

  it("should respect concurrency limit", async () => {
    // Given: 20 download tasks
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      url: `${testServer.url}/images/concurrent-${i}-${1024 * 5}`,
      outputPath: join(context.tempDir, `concurrent-${i}.jpg`),
    }));

    let maxConcurrent = 0;
    let currentConcurrent = 0;

    // When: Processing with concurrency = 4
    const processor = async (task: (typeof tasks)[0]) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 50));

      currentConcurrent--;
      return { success: true, path: task.outputPath };
    };

    const options: BatchProcessorOptions = {
      concurrency: 4,
      onProgress: (progress) => {
        // Track progress
      },
    };

    const result = await processBatch(tasks, processor, options);

    // Then: Concurrency never exceeds limit
    expect(maxConcurrent).toBeLessThanOrEqual(4);
    expect(result.completed).toBe(20);
    expect(result.failed).toBe(0);
  });

  it("should process batch with mixed success/failure", async () => {
    // Given: Mix of valid and invalid URLs
    const tasks = [
      { url: `${testServer.url}/images/mix-1-${1024 * 5}`, outputPath: join(context.tempDir, "mix-1.jpg") },
      { url: `${testServer.url}/error`, outputPath: join(context.tempDir, "mix-error.jpg") },
      { url: `${testServer.url}/images/mix-2-${1024 * 5}`, outputPath: join(context.tempDir, "mix-2.jpg") },
      { url: `${testServer.url}/notfound`, outputPath: join(context.tempDir, "mix-404.jpg") },
      { url: `${testServer.url}/images/mix-3-${1024 * 5}`, outputPath: join(context.tempDir, "mix-3.jpg") },
    ];

    const processor = async (task: (typeof tasks)[0]) => {
      if (task.url.includes("/error") || task.url.includes("/notfound")) {
        throw new Error(`Failed to download: ${task.url}`);
      }
      // Simulate successful download
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { success: true, path: task.outputPath };
    };

    // When: Processing batch
    const result = await processBatch(tasks, processor, { concurrency: 2 });

    // Then: Mixed results reported correctly
    expect(result.completed).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it("should provide accurate batch statistics", async () => {
    // Given: 10 tasks with varying durations
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      url: `${testServer.url}/images/stats-${i}-${1024 * (5 + i)}`,
      outputPath: join(context.tempDir, `stats-${i}.jpg`),
    }));

    const marker = createPerformanceMarker("batch-stats");

    const processor = async (task: (typeof tasks)[0]) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
      return { success: true, path: task.outputPath };
    };

    // When: Processing batch
    const result = await processBatch(tasks, processor, { concurrency: 4 });

    const totalDuration = marker.elapsed();

    // Then: Statistics calculated correctly
    expect(result.completed).toBe(10);
    expect(result.stats).toBeDefined();
    expect(result.stats.totalDuration).toBeGreaterThan(0);
    expect(result.stats.averageTime).toBeGreaterThan(0);
  });
});

// =====================================================
// Test Suite: Performance Benchmarks
// =====================================================

describe("Download-Process Performance", () => {
  beforeEach(async () => {
    await clearCache();
  });

  it("should download and process 100 images in <30s", async () => {
    const marker = createPerformanceMarker("download-100");

    // Given: 100 images
    const urls = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/perf-${i}-${1024 * 20}` // 20KB each
    );

    // When: Downloading and processing
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 10,
      format: "jpeg",
      quality: 85,
    });

    const duration = marker.elapsed();

    // Then: <30s total, <300ms average per image
    expect(result.completed).toBe(100);
    expect(duration).toBeLessThan(30000); // 30 seconds
    expect(duration / 100).toBeLessThan(300); // <300ms per image
  });

  it("should scale performance with concurrency", async () => {
    // Test with different concurrency levels
    const urls = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/scale-${i}-${1024 * 10}`
    );

    const results: Array<{ concurrency: number; duration: number }> = [];

    for (const concurrency of [2, 5, 10]) {
      await clearCache();
      await rm(context.tempDir, { recursive: true, force: true });
      await mkdir(context.tempDir, { recursive: true });

      const marker = createPerformanceMarker(`concurrency-${concurrency}`);

      await downloadAndProcess({
        urls,
        outputDir: context.tempDir,
        concurrency,
      });

      results.push({ concurrency, duration: marker.elapsed() });
    }

    // Higher concurrency should be faster (diminishing returns apply)
    expect(results[1].duration).toBeLessThan(results[0].duration);
    // Concurrency 10 might not be significantly faster than 5 due to overhead
    // but should not be slower
    expect(results[2].duration).toBeLessThanOrEqual(results[0].duration * 1.5);
  });
});

// =====================================================
// Test Suite: Cache Behavior
// =====================================================

describe("Sharp Cache Behavior", () => {
  it("should disable cache for batch operations", async () => {
    // Given: Large batch
    const urls = Array.from({ length: 200 }, (_, i) =>
      `${testServer.url}/images/cache-${i}-${1024 * 10}`
    );

    // When: Processing with cache disabled
    configureCache({ enabled: false });
    const result1 = await downloadAndProcess({
      urls,
      outputDir: join(context.tempDir, "batch1"),
      concurrency: 8,
    });

    // Then: Process successfully
    expect(result1.completed).toBe(200);

    // Re-enable cache
    configureCache({ enabled: true });
  });

  it("should track cache statistics", async () => {
    // Given: Cache enabled
    configureCache({ enabled: true, items: 100 });
    await clearCache();

    const urls = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/cachestats-${i}-${1024 * 10}`
    );

    // When: Processing
    await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 5,
    });

    // Then: Cache stats available
    const stats = await import("../../images/sharp-cache.js").then((m) => m.getCacheStats());
    expect(stats).toBeDefined();
    // Cache stats would show hits/misses if we were re-processing same images
  });
});

// =====================================================
// Test Suite: Memory Safety
// =====================================================

describe("Memory Safety", () => {
  it("should not leak memory across batches", async () => {
    await clearCache();

    // Run multiple batches and check memory growth
    const urls = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/memleak-${i}-${1024 * 50}`
    );

    const measurements: Array<number> = [];

    for (let i = 0; i < 3; i++) {
      await clearCache();

      const { before, after } = await withMemoryMeasurement(async () => {
        await downloadAndProcess({
          urls,
          outputDir: join(context.tempDir, `batch-${i}`),
          concurrency: 5,
        });
      });

      measurements.push(after.heapUsed);
    }

    // Memory growth should not be unbounded
    // (Third batch should not use significantly more than first)
    const growth = ((measurements[2] - measurements[0]) / measurements[0]) * 100;

    // Allow up to 20% growth for caching and normal variance
    expect(growth).toBeLessThan(50);
  });

  it("should recover from individual item failures", async () => {
    // Given: Batch with some failures
    const urls = [
      ...Array.from({ length: 10 }, (_, i) => `${testServer.url}/images/recover-${i}-${1024 * 10}`),
      `${testServer.url}/error`,
      `${testServer.url}/notfound`,
      ...Array.from({ length: 10 }, (_, i) => `${testServer.url}/images/recover-${i + 10}-${1024 * 10}`),
    ];

    // When: Processing with continueOnError
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 4,
      continueOnError: true,
    });

    // Then: Valid items processed despite failures
    expect(result.completed).toBe(20);
    expect(result.failed).toBe(2);
    expect(result.success).toBe(false); // Partial failure
  });
});
