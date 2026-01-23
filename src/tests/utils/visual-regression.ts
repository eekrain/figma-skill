/**
 * Visual regression testing utilities
 *
 * Image comparison and visual difference detection for testing
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// =====================================================
// Types
// =====================================================

export interface ImageComparisonResult {
  /** Whether images match within threshold */
  pass: boolean;
  /** Number of differing pixels */
  diffPixels: number;
  /** Total pixels compared */
  totalPixels: number;
  /** Difference ratio (0-1) */
  diffRatio: number;
  /** Path to difference image if generated */
  diffPath?: string;
}

export interface VisualRegressionOptions {
  /** Maximum allowed pixel difference (0-1, default: 0.01) */
  threshold?: number;
  /** Maximum allowed delta per channel (0-255, default: 10) */
  maxDelta?: number;
  /** Generate difference image */
  generateDiff?: boolean;
  /** Output directory for diff images */
  diffOutputDir?: string;
}

// =====================================================
// Image Comparison
// =====================================================

/**
 * Compare two images pixel by pixel
 *
 * @param actualPath - Path to actual image
 * @param expectedPath - Path to expected image
 * @param options - Comparison options
 * @returns Comparison result
 */
export async function compareImages(
  actualPath: string,
  expectedPath: string,
  options: VisualRegressionOptions = {}
): Promise<ImageComparisonResult> {
  const {
    threshold = 0.01,
    maxDelta = 10,
    generateDiff = false,
    diffOutputDir,
  } = options;

  // Load both images
  const actualImage = sharp(actualPath);
  const expectedImage = sharp(expectedPath);

  const [actualMeta, expectedMeta] = await Promise.all([
    actualImage.metadata(),
    expectedImage.metadata(),
  ]);

  // Ensure dimensions match
  const width = actualMeta.width || 0;
  const height = actualMeta.height || 0;

  if (width !== (expectedMeta.width || 0) || height !== (expectedMeta.height || 0)) {
    throw new Error(
      `Image dimensions don't match: actual ${width}x${height}, ` +
        `expected ${expectedMeta.width}x${expectedMeta.height}`
    );
  }

  // Get raw pixel data
  const [actualData, expectedData] = await Promise.all([
    actualImage.ensureAlpha().raw().toBuffer(),
    expectedImage.ensureAlpha().raw().toBuffer(),
  ]);

  const channels = actualMeta.channels || 4;
  const totalPixels = width * height;
  let diffPixels = 0;

  // Compare pixels
  const diffBuffer = generateDiff ? Buffer.alloc(actualData.length) : undefined;

  for (let i = 0; i < actualData.length; i += channels) {
    let pixelDiffers = false;

    // Compare each channel
    for (let c = 0; c < channels; c++) {
      const delta = Math.abs(
        (actualData[i + c] ?? 0) - (expectedData[i + c] ?? 0)
      );

      if (delta > maxDelta) {
        pixelDiffers = true;
      }
    }

    if (pixelDiffers) {
      diffPixels++;

      // Mark diff pixel in red if generating diff image
      if (diffBuffer) {
        // Red channel for visibility
        diffBuffer[i] = 255;
        // Green/blue channels zero
        diffBuffer[i + 1] = 0;
        diffBuffer[i + 2] = 0;
        // Keep alpha if present
        if (channels === 4) {
          diffBuffer[i + 3] = actualData[i + 3] ?? 255;
        }
      }
    }
  }

  const diffRatio = diffPixels / totalPixels;
  const pass = diffRatio <= threshold;

  let diffPath: string | undefined;

  if (generateDiff && diffBuffer) {
    diffPath = await generateDiffImage(diffBuffer, width, height, channels, {
      outputDir: diffOutputDir,
    });
  }

  return {
    pass,
    diffPixels,
    totalPixels,
    diffRatio,
    diffPath,
  };
}

/**
 * Assert two images match visually
 *
 * @param actualPath - Path to actual image
 * @param expectedPath - Path to expected image
 * @param threshold - Maximum allowed difference ratio (0-1)
 * @throws Error if images don't match within threshold
 */
export async function assertVisualMatch(
  actualPath: string,
  expectedPath: string,
  threshold = 0.01
): Promise<void> {
  const result = await compareImages(actualPath, expectedPath, { threshold });

  if (!result.pass) {
    throw new Error(
      `Images don't match visually: ${result.diffPixels}/${result.totalPixels} ` +
        `pixels differ (${(result.diffRatio * 100).toFixed(2)}% > ${(threshold * 100).toFixed(2)}%)`
    );
  }
}

// =====================================================
// Diff Image Generation
// =====================================================

interface DiffImageOptions {
  outputDir?: string;
  suffix?: string;
}

/**
 * Generate a visual diff image highlighting differences
 *
 * @param diffBuffer - Buffer containing diff pixel data
 * @param width - Image width
 * @param height - Image height
 * @param channels - Number of channels
 * @param options - Generation options
 * @returns Path to generated diff image
 */
async function generateDiffImage(
  diffBuffer: Buffer,
  width: number,
  height: number,
  channels: number,
  options: DiffImageOptions = {}
): Promise<string> {
  const { outputDir, suffix = `-${randomBytes(4).toString("hex")}` } = options;

  // Create temp file for diff image
  const tempDir = outputDir || join(process.cwd(), "src", "tests", "temp", "diffs");
  await mkdir(tempDir, { recursive: true });

  const diffPath = join(tempDir, `diff${suffix}.png`);

  // Write diff image
  await sharp(diffBuffer, {
    raw: { width, height, channels },
  })
    .png()
    .toFile(diffPath);

  return diffPath;
}

/**
 * Create side-by-side comparison image
 *
 * @param imagePath1 - Path to first image
 * @param imagePath2 - Path to second image
 * @param outputPath - Output path for comparison image
 */
export async function createSideBySideComparison(
  imagePath1: string,
  imagePath2: string,
  outputPath: string
): Promise<void> {
  const [image1, image2] = await Promise.all([
    sharp(imagePath1),
    sharp(imagePath2),
  ]);

  const [meta1, meta2] = await Promise.all([
    image1.metadata(),
    image2.metadata(),
  ]);

  const width = (meta1.width || 0) + (meta2.width || 0);
  const height = Math.max(meta1.height || 0, meta2.height || 0);

  // Create composite image
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: await image1.png().toBuffer(), left: 0, top: 0 },
      {
        input: await image2.png().toBuffer(),
        left: meta1.width || 0,
        top: 0,
      },
    ])
    .png()
    .toFile(outputPath);
}

// =====================================================
// Perceptual Hash (for fuzzy matching)
// =====================================================

/**
 * Generate perceptual hash of image
 * Uses average hash algorithm for simplicity
 *
 * @param imagePath - Path to image
 * @param size - Hash size (default: 8x8 = 64 bits)
 * @returns Perceptual hash as BigInt
 */
export async function generatePerceptualHash(
  imagePath: string,
  size = 8
): Promise<bigint> {
  // Resize to small size and convert to grayscale
  const { data, info } = await sharp(imagePath)
    .resize(size, size, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Calculate average pixel value
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  const average = sum / data.length;

  // Generate hash: 1 if above average, 0 if below
  let hash = 0n;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > average) {
      hash |= 1n << BigInt(i);
    }
  }

  return hash;
}

/**
 * Calculate Hamming distance between two hashes
 * Number of differing bits
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns Hamming distance (0 = identical)
 */
export function hammingDistance(hash1: bigint, hash2: bigint): number {
  const xor = hash1 ^ hash2;
  let distance = 0;

  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }

  return distance;
}

/**
 * Compare images using perceptual hashing
 * Good for detecting if images are "similar" rather than exact match
 *
 * @param imagePath1 - Path to first image
 * @param imagePath2 - Path to second image
 * @param maxDistance - Maximum allowed Hamming distance (default: 5 for 64-bit hash)
 * @returns Comparison result with similarity score
 */
export async function compareImagesPerceptual(
  imagePath1: string,
  imagePath2: string,
  maxDistance = 5
): Promise<{
  similar: boolean;
  distance: number;
  maxBits: number;
  similarity: number; // 0-1, 1 = identical
}> {
  const [hash1, hash2] = await Promise.all([
    generatePerceptualHash(imagePath1),
    generatePerceptualHash(imagePath2),
  ]);

  const distance = hammingDistance(hash1, hash2);
  const maxBits = 64; // 8x8 hash
  const similarity = 1 - distance / maxBits;

  return {
    similar: distance <= maxDistance,
    distance,
    maxBits,
    similarity,
  };
}

/**
 * Assert images are perceptually similar
 *
 * @param imagePath1 - Path to first image
 * @param imagePath2 - Path to second image
 * @param maxDistance - Maximum allowed Hamming distance
 * @param minSimilarity - Minimum similarity score (0-1)
 */
export async function assertPerceptuallySimilar(
  imagePath1: string,
  imagePath2: string,
  maxDistance = 5,
  minSimilarity = 0.9
): Promise<void> {
  const result = await compareImagesPerceptual(
    imagePath1,
    imagePath2,
    maxDistance
  );

  if (!result.similar || result.similarity < minSimilarity) {
    throw new Error(
      `Images are not perceptually similar: distance ${result.distance}/${result.maxBits}, ` +
        `similarity ${(result.similarity * 100).toFixed(1)}% < ${(minSimilarity * 100).toFixed(0)}%`
    );
  }
}

// =====================================================
// Color Analysis
// =====================================================

export interface ColorStats {
  dominantColors: Array<{ color: string; count: number; percentage: number }>;
  colorCount: number;
  isGrayscale: boolean;
}

/**
 * Analyze colors in an image
 *
 * @param imagePath - Path to image
 * @param sampleSize - Number of pixels to sample (default: 10000)
 * @returns Color statistics
 */
export async function analyzeColors(
  imagePath: string,
  sampleSize = 10000
): Promise<ColorStats> {
  const { data, info } = await sharp(imagePath)
    .resize(200, 200, { fit: "inside" }) // Resize for faster analysis
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels || 3;
  const colorMap = new Map<string, number>();

  // Sample pixels
  const step = Math.max(1, Math.floor(data.length / (sampleSize * channels)));

  for (let i = 0; i < data.length; i += step * channels) {
    if (i + 2 >= data.length) break;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Quantize colors (round to nearest 10 to group similar colors)
    const qr = Math.round(r / 10) * 10;
    const qg = Math.round(g / 10) * 10;
    const qb = Math.round(b / 10) * 10;

    const colorKey = `${qr},${qg},${qb}`;
    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
  }

  // Sort by count
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, count]) => ({
      color: `rgb(${color})`,
      count,
      percentage: (count / Array.from(colorMap.values()).reduce((a, b) => a + b, 0)) * 100,
    }));

  // Check if image is grayscale (R ≈ G ≈ B for dominant colors)
  const isGrayscale = sortedColors.every(({ color }) => {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return false;
    const [, r, g, b] = match.map(Number);
    return Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
  });

  return {
    dominantColors: sortedColors,
    colorCount: colorMap.size,
    isGrayscale,
  };
}

// =====================================================
// Edge Detection (for sharpness assessment)
// =====================================================

/**
 * Detect edges in image using Sobel operator
 *
 * @param imagePath - Path to image
 * @returns Edge density (0-1, higher = more edges)
 */
export async function detectEdges(imagePath: string): Promise<number> {
  const { data, info } = await sharp(imagePath)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width || 0;
  const height = info.height || 0;

  // Apply Sobel operator
  let edgePixels = 0;
  const totalPixels = width * height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Sobel kernels
      const gx =
        -data[idx - width - 1] +
        data[idx - width + 1] +
        -2 * data[idx - 1] +
        2 * data[idx + 1] +
        -data[idx + width - 1] +
        data[idx + width + 1];

      const gy =
        -data[idx - width - 1] +
        -2 * data[idx - width] +
        -data[idx - width + 1] +
        data[idx + width - 1] +
        2 * data[idx + width] +
        data[idx + width + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude > 50) {
        // Threshold for edge
        edgePixels++;
      }
    }
  }

  return edgePixels / totalPixels;
}

/**
 * Assert image has sufficient edge detail (not blurry)
 *
 * @param imagePath - Path to image
 * @param minEdgeDensity - Minimum edge density (default: 0.01 = 1%)
 */
export async function assertSharpEnough(
  imagePath: string,
  minEdgeDensity = 0.01
): Promise<void> {
  const edgeDensity = await detectEdges(imagePath);

  if (edgeDensity < minEdgeDensity) {
    throw new Error(
      `Image appears blurry: edge density ${(edgeDensity * 100).toFixed(2)}% ` +
        `< ${(minEdgeDensity * 100).toFixed(0)}%`
    );
  }
}
