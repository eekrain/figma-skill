/**
 * Integration test utilities
 *
 * Common helper functions for integration testing across images and vectors modules
 */
import sharp from "sharp";
import { mkdir, rm, mkdtemp, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

// =====================================================
// Types
// =====================================================

export interface TempDirectory {
  path: string;
  cleanup: () => Promise<void>;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  channels: number;
  hasAlpha: boolean;
  fileSize: number;
}

export interface MemoryMeasurement {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

// =====================================================
// Temporary Directory Management
// =====================================================

/**
 * Create a temporary directory for testing
 * Returns path and cleanup function
 */
export async function createTempDir(prefix = "figma-test-"): Promise<TempDirectory> {
  const tempPath = await mkdtemp(join(tmpdir(), prefix));

  return {
    path: tempPath,
    cleanup: async () => {
      try {
        await rm(tempPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * Execute callback with temporary directory
 * Automatically cleans up after callback completes
 */
export async function withTempDirectory<T>(
  callback: (dir: string) => Promise<T> | T,
  prefix = "figma-test-"
): Promise<T> {
  const tempDir = await createTempDir(prefix);
  try {
    return await callback(tempDir.path);
  } finally {
    await tempDir.cleanup();
  }
}

/**
 * Get test temp directory (persistent for test run)
 */
export function testTempDir(): string {
  return join(process.cwd(), "src", "tests", "temp");
}

/**
 * Ensure test temp directory exists
 */
export async function ensureTestTempDir(): Promise<string> {
  const dir = testTempDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

// =====================================================
// Image Metadata Utilities
// =====================================================

/**
 * Get image metadata using sharp
 */
export async function getImageMetadata(imagePath: string): Promise<ImageMetadata> {
  const metadata = await sharp(imagePath).metadata();
  const stats = await stat(imagePath);

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    channels: metadata.channels || 3,
    hasAlpha: (metadata.channels || 3) === 4 || metadata.hasAlpha || false,
    fileSize: stats.size,
  };
}

/**
 * Assert image has expected dimensions
 */
export async function assertImageDimensions(
  imagePath: string,
  expected: { width: number; height: number }
): Promise<void> {
  const metadata = await getImageMetadata(imagePath);

  if (metadata.width !== expected.width || metadata.height !== expected.height) {
    throw new Error(
      `Image dimensions mismatch: expected ${expected.width}x${expected.height}, ` +
        `got ${metadata.width}x${metadata.height}`
    );
  }
}

/**
 * Assert image has expected format
 */
export async function assertImageFormat(
  imagePath: string,
  expectedFormat: "png" | "jpeg" | "webp" | "svg"
): Promise<void> {
  const metadata = await getImageMetadata(imagePath);

  // Normalize format names (sharp uses "jpg", we accept "jpeg")
  const actualFormat = metadata.format === "jpg" ? "jpeg" : metadata.format;

  if (actualFormat !== expectedFormat) {
    throw new Error(
      `Image format mismatch: expected ${expectedFormat}, got ${actualFormat}`
    );
  }
}

/**
 * Assert PNG has alpha channel (transparency)
 */
export async function assertHasTransparency(imagePath: string): Promise<void> {
  const metadata = await getImageMetadata(imagePath);

  if (!metadata.hasAlpha) {
    throw new Error(`Image ${imagePath} should have transparency but doesn't`);
  }
}

/**
 * Assert PNG has no alpha channel (opaque)
 */
export async function assertNoTransparency(imagePath: string): Promise<void> {
  const metadata = await getImageMetadata(imagePath);

  if (metadata.hasAlpha) {
    throw new Error(`Image ${imagePath} should not have transparency but does`);
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

/**
 * Calculate size reduction percentage
 */
export function calculateSizeReduction(originalSize: number, newSize: number): number {
  if (originalSize === 0) return 0;
  return ((originalSize - newSize) / originalSize) * 100;
}

// =====================================================
// JPEG Artifact Detection
// =====================================================

/**
 * Detect JPEG ringing artifacts around sharp edges
 * This is a simplified heuristic - real detection requires more sophisticated analysis
 */
export async function detectJpegArtifacts(imagePath: string): Promise<{
  hasArtifacts: boolean;
  confidence: number;
}> {
  try {
    const metadata = await getImageMetadata(imagePath);

    // Only JPEG can have JPEG artifacts
    if (metadata.format !== "jpg" && metadata.format !== "jpeg") {
      return { hasArtifacts: false, confidence: 0 };
    }

    // Load image and analyze edge areas
    const image = sharp(imagePath);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple heuristic: check for ringing artifacts near edges
    // Ringing appears as oscillations near sharp transitions
    let artifactScore = 0;
    const sampleCount = Math.min(1000, (info.width * info.height) / 100);

    for (let i = 0; i < sampleCount; i++) {
      // Sample random edge-like areas
      const x = Math.floor(Math.random() * (info.width - 4));
      const y = Math.floor(Math.random() * (info.height - 4));
      const idx = (y * info.width + x) * info.channels;

      // Check for oscillation pattern (characteristic of ringing)
      if (info.channels >= 3) {
        const center = data[idx];
        const right1 = data[idx + info.channels];
        const right2 = data[idx + info.channels * 2];

        // Ringing pattern: high-low-high or low-high-low oscillation
        if (
          (center > 200 && right1 < 50 && right2 > 200) ||
          (center < 50 && right1 > 200 && right2 < 50)
        ) {
          artifactScore++;
        }
      }
    }

    const confidence = artifactScore / sampleCount;
    return {
      hasArtifacts: confidence > 0.05, // 5% threshold
      confidence,
    };
  } catch {
    return { hasArtifacts: false, confidence: 0 };
  }
}

/**
 * Assert image has no significant JPEG artifacts
 */
export async function assertNoJpegArtifacts(
  imagePath: string,
  maxConfidence = 0.05
): Promise<void> {
  const result = await detectJpegArtifacts(imagePath);

  if (result.hasArtifacts && result.confidence > maxConfidence) {
    throw new Error(
      `Image ${imagePath} has JPEG artifacts (confidence: ${result.confidence.toFixed(3)})`
    );
  }
}

// =====================================================
// Memory Measurement
// =====================================================

/**
 * Measure current memory usage
 */
export function measureMemoryUsage(): MemoryMeasurement {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

/**
 * Measure memory before and after function execution
 */
export async function withMemoryMeasurement<T>(
  fn: () => Promise<T> | T
): Promise<{
  result: T;
  before: MemoryMeasurement;
  after: MemoryMeasurement;
  delta: MemoryMeasurement;
}> {
  const before = measureMemoryUsage();
  const result = await fn();
  const after = measureMemoryUsage();

  return {
    result,
    before,
    after,
    delta: {
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external,
      arrayBuffers: after.arrayBuffers - before.arrayBuffers,
    },
  };
}

// =====================================================
// Performance Markers
// =====================================================

export interface PerformanceMarker {
  label: string;
  startTime: number;
  elapsed(): number;
}

/**
 * Create a performance marker for timing
 */
export function createPerformanceMarker(label: string): PerformanceMarker {
  return {
    label,
    startTime: performance.now(),
    elapsed() {
      return performance.now() - this.startTime;
    },
  };
}

/**
 * Execute function and measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  label = "operation"
): Promise<{ result: T; duration: number }> {
  const marker = createPerformanceMarker(label);
  const result = await fn();
  const duration = marker.elapsed();

  return { result, duration };
}

// =====================================================
// File System Utilities
// =====================================================

/**
 * List all files in directory recursively
 */
export async function listFilesRecursively(
  dirPath: string,
  extensions?: string[]
): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursively(fullPath, extensions);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Count files in directory
 */
export async function countFiles(
  dirPath: string,
  extensions?: string[]
): Promise<number> {
  const files = await listFilesRecursively(dirPath, extensions);
  return files.length;
}

/**
 * Get total directory size
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  const files = await listFilesRecursively(dirPath);
  let totalSize = 0;

  for (const file of files) {
    const stats = await stat(file);
    totalSize += stats.size;
  }

  return totalSize;
}

// =====================================================
// Test Data Generation
// =====================================================

/**
 * Generate random test ID
 */
export function generateTestId(prefix = "test"): string {
  const random = randomBytes(4).toString("hex");
  return `${prefix}-${random}`;
}

/**
 * Create mock Figma node ID
 */
export function createNodeId(id: string): string {
  // Format: "1234:5678" or "I5666:180910" for instances
  return id.includes(":") ? id : `${id}:${Math.floor(Math.random() * 100000)}`;
}

// =====================================================
// Assertion Helpers
// =====================================================

/**
 * Assert value is in range (inclusive)
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  if (value < min || value > max) {
    throw new Error(
      message || `Value ${value} is not in range [${min}, ${max}]`
    );
  }
}

/**
 * Assert value is greater than threshold
 */
export function assertGreaterThan(
  value: number,
  threshold: number,
  message?: string
): void {
  if (value <= threshold) {
    throw new Error(
      message || `Value ${value} is not greater than ${threshold}`
    );
  }
}

/**
 * Assert value is less than threshold
 */
export function assertLessThan(
  value: number,
  threshold: number,
  message?: string
): void {
  if (value >= threshold) {
    throw new Error(
      message || `Value ${value} is not less than ${threshold}`
    );
  }
}

/**
 * Assert percentage is in valid range [0, 100]
 */
export function assertPercentage(value: number, message?: string): void {
  assertInRange(value, 0, 100, message || `Invalid percentage: ${value}`);
}

// =====================================================
// Async Utilities
// =====================================================

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError = new Error(`Operation timed out after ${timeoutMs}ms`)
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryIf?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 100,
    maxDelay = 1000,
    retryIf = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryIf(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
      await wait(delay);
    }
  }

  throw lastError;
}
