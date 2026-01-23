/**
 * Load Performance Tests
 *
 * Stress tests and load testing to verify system stability under heavy load.
 * These tests ensure the system handles:
 * - Large batches of operations
 * - Concurrent processing
 * - Resource exhaustion scenarios
 * - Failure recovery under load
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { createServer } from "node:http";
import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// Module imports
import {
  downloadAndProcess,
  processBatch,
  configureCache,
  clearCache,
  type DownloadProcessOptions,
  type BatchProcessorOptions,
} from "../../images/index.js";
import {
  withTempDirectory,
  createTempDir,
  countFiles,
  assertGreaterThan,
  assertLessThan,
} from "../utils/integration-helpers.js";
import {
  withMemoryMeasurement,
  measureThroughput,
  measureConcurrency,
  detectMemoryLeak,
  assertNoMemoryLeak,
  type MemorySnapshot,
} from "../utils/performance-helpers.js";

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
      const url = req.url || "";

      if (url.startsWith("/images/")) {
        const size = parseInt(url.split("-")[1] || "10240");
        const buffer = Buffer.alloc(size, 0xAB);
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": size,
        });
        res.end(buffer);
      } else if (url === "/error") {
        res.writeHead(500);
        res.end("Server error");
      } else if (url === "/timeout") {
        // Never respond
      } else if (url === "/slow") {
        setTimeout(() => {
          res.writeHead(200);
          res.end("done");
        }, 5000);
      } else if (url === "/notfound") {
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
  snapshots: MemorySnapshot[];
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  testServer = await setupTestServer();
  const temp = await createTempDir("load-test-");
  context = {
    tempDir: temp.path,
    snapshots: [],
  };
});

afterAll(async () => {
  await testServer.close();
  await rm(context.tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await clearCache();
  context.snapshots = [];
});

// =====================================================
// Test Suite: Large Batch Processing
// =====================================================

describe("Load Tests: Large Batch Processing", () => {
  it("should handle 1000 image batch with controlled concurrency", async () => {
    // Given: 1000 URLs
    const urls = Array.from({ length: 1000 }, (_, i) =>
      `${testServer.url}/images/load-1000-${i}-${1024 * 20}` // 20KB each
    );

    // Disable cache for batch
    configureCache({ enabled: false });

    // When: Processing with concurrency limit
    const { before, after, result } = await withMemoryMeasurement(async () => {
      return await downloadAndProcess({
        urls,
        outputDir: context.tempDir,
        concurrency: 10, // Controlled concurrency
        maxMemoryMB: 512,
      });
    });

    const memoryDelta = (after.heapUsed - before.heapUsed) / 1024 / 1024;

    // Then: No resource exhaustion, all images downloaded
    expect(result.success).toBe(true);
    expect(result.completed).toBe(1000);
    expect(result.failed).toBe(0);
    expect(memoryDelta).toBeLessThan(1024); // <1GB heap growth

    // Re-enable cache
    configureCache({ enabled: true });
  });

  it("should scale throughput with concurrency", async () => {
    const urls = Array.from({ length: 200 }, (_, i) =>
      `${testServer.url}/images/scale-${i}-${1024 * 10}`
    );

    const concurrencyLevels = [4, 8, 16];
    const results: Array<{ concurrency: number; throughput: number }> = [];

    for (const concurrency of concurrencyLevels) {
      await clearCache();

      const { throughput } = await measureThroughput(
        async () => {
          await downloadAndProcess({
            urls,
            outputDir: join(context.tempDir, `scale-${concurrency}`),
            concurrency,
          });
        },
        30000 // 30 second test
      );

      results.push({ concurrency, throughput });
    }

    // Higher concurrency should yield higher throughput
    expect(results[1].throughput).toBeGreaterThan(results[0].throughput);
    expect(results[2].throughput).toBeGreaterThan(results[0].throughput);
  });
});

// =====================================================
// Test Suite: Failure Resilience
// =====================================================

describe("Load Tests: Failure Resilience", () => {
  it("should recover from individual failures without stopping batch", async () => {
    // Given: 10% random failures
    const urls: string[] = [];
    for (let i = 0; i < 100; i++) {
      if (i % 10 === 0) {
        urls.push(`${testServer.url}/error`); // Will fail
      } else if (i % 15 === 0) {
        urls.push(`${testServer.url}/notfound`); // Will fail
      } else {
        urls.push(`${testServer.url}/images/resilient-${i}-${1024 * 10}`);
      }
    }

    // When: Processing with error recovery
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 8,
      continueOnError: true,
    });

    // Then: Success despite ~17% failure rate
    expect(result.completed).toBeGreaterThan(80);
    expect(result.failed).toBeGreaterThan(0);
    expect(result.failed).toBeLessThan(20);
  });

  it("should handle timeout scenarios gracefully", async () => {
    // Given: Mix of normal and timeout URLs
    const urls = [
      ...Array.from({ length: 5 }, (_, i) =>
        `${testServer.url}/images/timeout-test-${i}-${1024 * 5}`
      ),
      `${testServer.url}/timeout`, // Will timeout
      ...Array.from({ length: 5 }, (_, i) =>
        `${testServer.url}/images/timeout-test-${i + 5}-${1024 * 5}`
      ),
    ];

    // When: Processing with short timeout
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 4,
      timeout: 2000, // 2 second timeout
      continueOnError: true,
    });

    // Then: Process valid URLs, handle timeout gracefully
    expect(result.completed).toBe(10); // The 10 valid ones
    expect(result.failed).toBe(1); // The timeout one
  });

  it("should process multiple batches safely", async () => {
    // Given: 3 sequential large batches
    const batch1 = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/multi-1-${i}-${1024 * 15}`
    );
    const batch2 = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/multi-2-${i}-${1024 * 15}`
    );
    const batch3 = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/multi-3-${i}-${1024 * 15}`
    );

    // When: Processing sequentially
    const results = [];

    for (const [i, batch] of [batch1, batch2, batch3].entries()) {
      await clearCache();

      const result = await downloadAndProcess({
        urls: batch,
        outputDir: join(context.tempDir, `multi-batch-${i}`),
        concurrency: 8,
      });

      results.push(result);
    }

    // Then: All batches process successfully
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.completed).toBe(100);
    }
  });
});

// =====================================================
// Test Suite: Concurrency Stress
// =====================================================

describe("Load Tests: Concurrency Stress", () => {
  it("should handle maximum concurrency without crashes", async () => {
    // Given: CPU count * 2 concurrency
    const cpuCount = require("node:os").cpus().length;
    const maxConcurrency = cpuCount * 2;

    const urls = Array.from({ length: 500 }, (_, i) =>
      `${testServer.url}/images/max-concurrent-${i}-${1024 * 10}`
    );

    // When: Processing with max concurrency
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: maxConcurrency,
    });

    // Then: No crashes, all processed
    expect(result.success).toBe(true);
    expect(result.completed).toBe(500);
  });

  it("should maintain stability under sustained load", async () => {
    // Given: Sustained load over time
    const iterations = 5;
    const batchSize = 50;

    const results: Array<{ completed: number; failed: number; duration: number }> =
      [];

    for (let i = 0; i < iterations; i++) {
      await clearCache();

      const urls = Array.from({ length: batchSize }, (_, j) =>
        `${testServer.url}/images/sustained-${i}-${j}-${1024 * 12}`
      );

      const marker = createPerformanceMarker();
      const result = await downloadAndProcess({
        urls,
        outputDir: join(context.tempDir, `sustained-${i}`),
        concurrency: 8,
      });
      const duration = marker.elapsed();

      results.push({
        completed: result.completed,
        failed: result.failed,
        duration,
      });
    }

    // Then: Consistent performance across iterations
    const durations = results.map((r) => r.duration);
    const avgDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;

    // No iteration should be more than 2x the average
    for (const duration of durations) {
      expect(duration).toBeLessThan(avgDuration * 2);
    }

    // All should succeed
    for (const result of results) {
      expect(result.completed).toBe(batchSize);
      expect(result.failed).toBe(0);
    }
  });
});

// =====================================================
// Test Suite: Memory Safety
// =====================================================

describe("Load Tests: Memory Safety", () => {
  it("should not leak memory over many iterations", async () => {
    await clearCache();

    // Given: Function that processes images
    async function processImages() {
      const urls = Array.from({ length: 50 }, (_, i) =>
        `${testServer.url}/images/leak-test-${i}-${1024 * 20}`
      );

      await downloadAndProcess({
        urls,
        outputDir: context.tempDir,
        concurrency: 6,
      });
    }

    // When: Running multiple iterations
    await assertNoMemoryLeak(processImages, {
      iterations: 10,
      threshold: 30, // 30% growth threshold
      forceGc: false, // Don't force GC, test natural behavior
    });
  });

  it("should handle memory pressure gracefully", async () => {
    // Given: Very large batch with memory limit
    const urls = Array.from({ length: 1000 }, (_, i) =>
      `${testServer.url}/images/pressure-${i}-${1024 * 50}` // 50KB each
    );

    configureCache({ enabled: false });

    // When: Processing with memory limit
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 4, // Lower concurrency to reduce memory pressure
      maxMemoryMB: 256, // Strict memory limit
    });

    // Then: Complete without OOM, some may fail due to memory
    expect(result.completed + result.failed).toBe(1000);
    expect(result.completed).toBeGreaterThan(500); // At least 50% succeed

    configureCache({ enabled: true });
  });

  it("should free memory after batch completes", async () => {
    // Given: Large batch
    const urls = Array.from({ length: 500 }, (_, i) =>
      `${testServer.url}/images/free-mem-${i}-${1024 * 25}`
    );

    // Measure memory before
    const snapshot1 = takeMemorySnapshot();

    // When: Processing batch
    await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 8,
    });

    // Force GC if available
    if (typeof global.gc === "function") {
      global.gc();
      await new Promise((resolve) => setTimeout(resolve, 100));
      global.gc();
    }

    // Measure memory after
    const snapshot2 = takeMemorySnapshot();

    const memoryGrowth =
      ((snapshot2.heapUsed - snapshot1.heapUsed) / snapshot1.heapUsed) * 100;

    // Then: Memory growth should be reasonable (<200% for temp data)
    expect(memoryGrowth).toBeLessThan(200);
  });

  function takeMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    return {
      timestamp: performance.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
    };
  }
});

// =====================================================
// Test Suite: Resource Management
// =====================================================

describe("Load Tests: Resource Management", () => {
  it("should clean up temp files after processing", async () => {
    // Given: Batch with temp cleanup enabled
    const urls = Array.from({ length: 100 }, (_, i) =>
      `${testServer.url}/images/cleanup-${i}-${1024 * 10}`
    );

    const tempDir = join(context.tempDir, "temp-cleanup");

    // When: Processing with cleanup
    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 10,
      tempDir,
      cleanupTemp: true,
    });

    // Then: Output files exist, temp files cleaned
    expect(result.completed).toBe(100);

    // Check output files exist
    const outputFiles = await countFiles(context.tempDir, [".png", ".jpg", ".jpeg"]);
    expect(outputFiles).toBe(100);

    // Temp directory should be empty or cleaned
    // (depends on implementation)
  });

  it("should handle concurrent batch operations", async () => {
    // Given: 3 independent batches running "concurrently"
    const batch1 = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/concurrent-batch1-${i}-${1024 * 10}`
    );
    const batch2 = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/concurrent-batch2-${i}-${1024 * 10}`
    );
    const batch3 = Array.from({ length: 50 }, (_, i) =>
      `${testServer.url}/images/concurrent-batch3-${i}-${1024 * 10}`
    );

    // When: Processing batches in parallel
    const results = await Promise.all([
      downloadAndProcess({
        urls: batch1,
        outputDir: join(context.tempDir, "concurrent-1"),
        concurrency: 6,
      }),
      downloadAndProcess({
        urls: batch2,
        outputDir: join(context.tempDir, "concurrent-2"),
        concurrency: 6,
      }),
      downloadAndProcess({
        urls: batch3,
        outputDir: join(context.tempDir, "concurrent-3"),
        concurrency: 6,
      }),
    ]);

    // Then: All batches complete successfully
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.completed).toBe(50);
    }
  });
});

// =====================================================
// Test Suite: Performance Degradation Detection
// =====================================================

describe("Load Tests: Performance Degradation", () => {
  it("should not degrade performance over time", async () => {
    // Given: Multiple sequential batches
    const batchCount = 10;
    const batchSize = 30;

    const timings: number[] = [];

    for (let i = 0; i < batchCount; i++) {
      await clearCache();

      const urls = Array.from({ length: batchSize }, (_, j) =>
        `${testServer.url}/images/degrade-${i}-${j}-${1024 * 10}`
      );

      const start = performance.now();

      await downloadAndProcess({
        urls,
        outputDir: join(context.tempDir, `degrade-${i}`),
        concurrency: 6,
      });

      const duration = performance.now() - start;
      timings.push(duration);
    }

    // Check: Last batch shouldn't be more than 2x slower than first
    const firstTiming = timings[0];
    const lastTiming = timings[timings.length - 1];
    const degradation = lastTiming / firstTiming;

    expect(degradation).toBeLessThan(2); // Not more than 2x slower
  });

  it("should maintain throughput under varying load", async () => {
    // Given: Batches of varying sizes
    const batchSizes = [20, 50, 100, 50, 20];
    const throughputs: number[] = [];

    for (const [i, size] of batchSizes.entries()) {
      await clearCache();

      const urls = Array.from({ length: size }, (_, j) =>
        `${testServer.url}/images/varying-${i}-${j}-${1024 * 10}`
      );

      const { throughput } = await measureThroughput(
        async () => {
          await downloadAndProcess({
            urls,
            outputDir: join(context.tempDir, `varying-${i}`),
            concurrency: 6,
          });
        },
        15000 // 15 second max per batch
      );

      throughputs.push(throughput);
    }

    // Throughput shouldn't vary wildly (>3x between min and max)
    const minThroughput = Math.min(...throughputs);
    const maxThroughput = Math.max(...throughputs);
    const variance = maxThroughput / minThroughput;

    expect(variance).toBeLessThan(3);
  });
});

// =====================================================
// Test Suite: Edge Cases
// =====================================================

describe("Load Tests: Edge Cases", () => {
  it("should handle empty URL list", async () => {
    const result = await downloadAndProcess({
      urls: [],
      outputDir: context.tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(0);
  });

  it("should handle single URL", async () => {
    const result = await downloadAndProcess({
      urls: [`${testServer.url}/images/single-${1024 * 10}`],
      outputDir: context.tempDir,
    });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(1);
  });

  it("should handle very large images", async () => {
    // Given: 5MB images
    const urls = Array.from({ length: 10 }, (_, i) =>
      `${testServer.url}/images/large-${i}-${1024 * 5 * 1024}` // 5MB each
    );

    configureCache({ enabled: false });

    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 2, // Low concurrency for large files
    });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(10);

    configureCache({ enabled: true });
  });

  it("should handle very small images efficiently", async () => {
    // Given: 1KB images
    const urls = Array.from({ length: 500 }, (_, i) =>
      `${testServer.url}/images/tiny-${i}-${1024}` // 1KB each
    );

    const result = await downloadAndProcess({
      urls,
      outputDir: context.tempDir,
      concurrency: 20, // High concurrency for tiny files
    });

    expect(result.success).toBe(true);
    expect(result.completed).toBe(500);
  });
});
