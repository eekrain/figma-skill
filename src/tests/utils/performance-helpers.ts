/**
 * Performance testing utilities
 *
 * Benchmarking, timing, and performance assertion helpers
 */

// =====================================================
// Types
// =====================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
  percentile95: number;
  percentile99: number;
}

export interface PerformanceAssertion {
  operation: string;
  duration: number;
  targetDuration: number;
  passed: boolean;
  margin: number; // percentage over/under target
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryLeakTestResult {
  passed: boolean;
  initial: MemorySnapshot;
  final: MemorySnapshot;
  delta: MemorySnapshot;
  deltaPercentage: number;
  leakDetected: boolean;
}

// =====================================================
// Benchmarking
// =====================================================

/**
 * Run a benchmark test
 *
 * @param name - Benchmark name
 * @param fn - Function to benchmark (should be synchronous)
 * @param options - Benchmark options
 * @returns Benchmark result
 */
export async function runBenchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    minDuration?: number; // Minimum duration in ms
  } = {}
): Promise<BenchmarkResult> {
  const {
    iterations = 100,
    warmupIterations = 10,
    minDuration = 100,
  } = options;

  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Collect timings
  const times: number[] = [];
  let totalTime = 0;
  let minTime = Infinity;
  let maxTime = 0;

  // Run at least minDuration ms worth of iterations
  const start = performance.now();
  let actualIterations = 0;

  while (
    actualIterations < iterations ||
    totalTime < minDuration
  ) {
    const iterStart = performance.now();
    await fn();
    const iterTime = performance.now() - iterStart;

    times.push(iterTime);
    totalTime += iterTime;
    minTime = Math.min(minTime, iterTime);
    maxTime = Math.max(maxTime, iterTime);
    actualIterations++;
  }

  // Calculate statistics
  times.sort((a, b) => a - b);
  const averageTime = totalTime / actualIterations;
  const percentile95 = times[Math.floor(actualIterations * 0.95)] || maxTime;
  const percentile99 = times[Math.floor(actualIterations * 0.99)] || maxTime;
  const throughput = 1000 / averageTime; // ops per second

  return {
    name,
    iterations: actualIterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    throughput,
    percentile95,
    percentile99,
  };
}

/**
 * Assert operation completes within time limit
 *
 * @param operation - Operation description
 * @param fn - Function to execute
 * @param targetMs - Target duration in milliseconds
 * @param tolerance - Percentage tolerance (default: 10%)
 * @returns Performance assertion result
 */
export async function assertPerformance<T>(
  operation: string,
  fn: () => T | Promise<T>,
  targetMs: number,
  tolerance = 0.1
): Promise<PerformanceAssertion & { result: T }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  const margin = ((duration - targetMs) / targetMs) * 100;
  const passed = duration <= targetMs * (1 + tolerance);

  if (!passed) {
    throw new Error(
      `Performance assertion failed: ${operation} took ${duration.toFixed(2)}ms, ` +
        `target was ${targetMs}ms (${margin > 0 ? "+" : ""}${margin.toFixed(1)}%)`
    );
  }

  return {
    operation,
    duration,
    targetDuration: targetMs,
    passed,
    margin,
    result,
  };
}

/**
 * Compare performance of two functions
 *
 * @param name1 - First function name
 * @param fn1 - First function
 * @param name2 - Second function name
 * @param fn2 - Second function
 * @param iterations - Number of iterations (default: 100)
 * @returns Comparison result with faster function indicated
 */
export async function comparePerformance<T1, T2>(
  name1: string,
  fn1: () => T1 | Promise<T1>,
  name2: string,
  fn2: () => T2 | Promise<T2>,
  iterations = 100
): Promise<{
  winner: string;
  speedup: number; // How much faster (as multiple)
  result1: BenchmarkResult;
  result2: BenchmarkResult;
}> {
  const [result1, result2] = await Promise.all([
    runBenchmark(name1, fn1, { iterations }),
    runBenchmark(name2, fn2, { iterations }),
  ]);

  const winner = result1.averageTime < result2.averageTime ? name1 : name2;
  const speedup =
    result1.averageTime < result2.averageTime
      ? result2.averageTime / result1.averageTime
      : result1.averageTime / result2.averageTime;

  return {
    winner,
    speedup,
    result1,
    result2,
  };
}

// =====================================================
// Memory Leak Detection
// =====================================================

/**
 * Take a memory snapshot
 */
export function takeMemorySnapshot(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    timestamp: performance.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

/**
 * Detect memory leaks by comparing memory before and after operations
 *
 * @param operations - Function that performs operations (should be called multiple times)
 * @param options - Test options
 * @returns Memory leak test result
 */
export async function detectMemoryLeak(
  operations: () => void | Promise<void>,
  options: {
    iterations?: number;
    gcThreshold?: number; // Percentage growth considered leak (default: 20%)
    forceGc?: boolean; // Try to force garbage collection (default: true)
  } = {}
): Promise<MemoryLeakTestResult> {
  const {
    iterations = 10,
    gcThreshold = 20,
    forceGc = true,
  } = options;

  // Try to force GC if available
  if (forceGc && typeof global.gc === "function") {
    global.gc();
  }

  const initial = takeMemorySnapshot();

  // Run operations multiple times
  for (let i = 0; i < iterations; i++) {
    await operations();

    // Force GC between iterations if available
    if (forceGc && typeof global.gc === "function") {
      global.gc();
    }
  }

  // Final GC
  if (forceGc && typeof global.gc === "function") {
    global.gc();
  }

  const final = takeMemorySnapshot();

  // Calculate delta
  const delta: MemorySnapshot = {
    timestamp: final.timestamp - initial.timestamp,
    heapUsed: final.heapUsed - initial.heapUsed,
    heapTotal: final.heapTotal - initial.heapTotal,
    external: final.external - initial.external,
    arrayBuffers: final.arrayBuffers - initial.arrayBuffers,
  };

  const deltaPercentage = (delta.heapUsed / initial.heapUsed) * 100;
  const leakDetected = deltaPercentage > gcThreshold;

  return {
    passed: !leakDetected,
    initial,
    final,
    delta,
    deltaPercentage,
    leakDetected,
  };
}

/**
 * Assert no significant memory leak
 *
 * @param operations - Function to test for leaks
 * @param options - Test options
 * @throws Error if memory leak detected
 */
export async function assertNoMemoryLeak(
  operations: () => void | Promise<void>,
  options: {
    iterations?: number;
    threshold?: number;
    forceGc?: boolean;
  } = {}
): Promise<void> {
  const result = await detectMemoryLeak(operations, options);

  if (result.leakDetected) {
    throw new Error(
      `Memory leak detected: heap grew by ${result.deltaPercentage.toFixed(1)}% ` +
        `(${formatBytes(result.delta.heapUsed)}) over ${options.iterations || 10} iterations`
    );
  }
}

// =====================================================
// Throughput Testing
// =====================================================

/**
 * Measure throughput of a function
 *
 * @param fn - Function to measure
 * @param durationMs - Test duration in milliseconds
 * @returns Throughput result (operations per second)
 */
export async function measureThroughput<T>(
  fn: () => T | Promise<T>,
  durationMs = 1000
): Promise<{
  operations: number;
  duration: number;
  throughput: number; // ops per second
  averageLatency: number; // ms per operation
}> {
  const start = performance.now();
  let operations = 0;

  while (performance.now() - start < durationMs) {
    await fn();
    operations++;
  }

  const duration = performance.now() - start;
  const throughput = (operations / duration) * 1000;
  const averageLatency = duration / operations;

  return {
    operations,
    duration,
    throughput,
    averageLatency,
  };
}

/**
 * Assert throughput meets minimum requirement
 *
 * @param fn - Function to measure
 * @param minThroughput - Minimum operations per second
 * @param durationMs - Test duration
 */
export async function assertThroughput(
  fn: () => void | Promise<void>,
  minThroughput: number,
  durationMs = 1000
): Promise<void> {
  const result = await measureThroughput(fn, durationMs);

  if (result.throughput < minThroughput) {
    throw new Error(
      `Throughput below target: ${result.throughput.toFixed(0)} ops/sec ` +
        `< ${minThroughput} ops/sec`
    );
  }
}

// =====================================================
// Concurrency Testing
// =====================================================

/**
 * Measure performance under concurrent load
 *
 * @param fn - Function to execute
 * @param concurrency - Number of concurrent operations
 * @param totalOperations - Total operations to run
 * @returns Concurrency test result
 */
export async function measureConcurrency<T>(
  fn: () => T | Promise<T>,
  concurrency: number,
  totalOperations: number
): Promise<{
  operations: number;
  concurrency: number;
  totalTime: number;
  averageTime: number;
  throughput: number;
}> {
  const start = performance.now();
  const operationsPerWorker = Math.ceil(totalOperations / concurrency);

  // Create workers
  const workers = Array.from({ length: concurrency }, async () => {
    for (let i = 0; i < operationsPerWorker; i++) {
      await fn();
    }
  });

  await Promise.all(workers);

  const totalTime = performance.now() - start;
  const actualOperations = operationsPerWorker * concurrency;
  const throughput = (actualOperations / totalTime) * 1000;
  const averageTime = totalTime / actualOperations;

  return {
    operations: actualOperations,
    concurrency,
    totalTime,
    averageTime,
    throughput,
  };
}

// =====================================================
// Formatting Utilities
// =====================================================

// Re-export from integration-helpers for convenience
export {
  createPerformanceMarker,
  type PerformanceMarker,
} from "./integration-helpers.js";

/**
 * Measure memory before and after function execution
 */
export async function withMemoryMeasurement<T>(
  fn: () => Promise<T> | T
): Promise<{
  result: T;
  before: MemorySnapshot;
  after: MemorySnapshot;
  delta: MemorySnapshot;
}> {
  const initial = takeMemorySnapshot();
  const result = await fn();
  const final = takeMemorySnapshot();

  return {
    result,
    before: initial,
    after: final,
    delta: {
      timestamp: final.timestamp - initial.timestamp,
      heapUsed: final.heapUsed - initial.heapUsed,
      heapTotal: final.heapTotal - initial.heapTotal,
      external: final.external - initial.external,
      arrayBuffers: final.arrayBuffers - initial.arrayBuffers,
    },
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)}s`;
  }
}

/**
 * Format benchmark result for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines = [
    `Benchmark: ${result.name}`,
    `  Iterations: ${result.iterations}`,
    `  Total time: ${formatDuration(result.totalTime)}`,
    `  Average: ${formatDuration(result.averageTime)}`,
    `  Min: ${formatDuration(result.minTime)}`,
    `  Max: ${formatDuration(result.maxTime)}`,
    `  95th percentile: ${formatDuration(result.percentile95)}`,
    `  99th percentile: ${formatDuration(result.percentile99)}`,
    `  Throughput: ${result.throughput.toFixed(0)} ops/sec`,
  ];

  return lines.join("\n");
}

// =====================================================
// Performance Monitoring
// =====================================================

/**
 * Create a performance monitor for tracking multiple operations
 */
export class PerformanceMonitor {
  private measurements = new Map<string, number[]>();

  /**
   * Start timing an operation
   */
  start(operation: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      const measurements = this.measurements.get(operation) || [];
      measurements.push(duration);
      this.measurements.set(operation, measurements);
    };
  }

  /**
   * Get statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const total = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      total,
      average: total / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(measurements.length * 0.95)],
      p99: sorted[Math.floor(measurements.length * 0.99)],
    };
  }

  /**
   * Get all operation names
   */
  getOperations(): string[] {
    return Array.from(this.measurements.keys());
  }

  /**
   * Reset all measurements
   */
  reset(): void {
    this.measurements.clear();
  }

  /**
   * Generate report
   */
  report(): string {
    const lines = ["Performance Monitor Report:", ""];

    for (const operation of this.getOperations()) {
      const stats = this.getStats(operation);
      if (!stats) continue;

      lines.push(`${operation}:`);
      lines.push(`  Count: ${stats.count}`);
      lines.push(`  Total: ${formatDuration(stats.total)}`);
      lines.push(`  Average: ${formatDuration(stats.average)}`);
      lines.push(`  Min: ${formatDuration(stats.min)}`);
      lines.push(`  Max: ${formatDuration(stats.max)}`);
      lines.push(`  P95: ${formatDuration(stats.p95)}`);
      lines.push(`  P99: ${formatDuration(stats.p99)}`);
      lines.push("");
    }

    return lines.join("\n");
  }
}
