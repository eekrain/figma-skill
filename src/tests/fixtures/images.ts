/**
 * Image test fixtures - Create test images with controlled characteristics
 *
 * Provides factory functions to generate test images with specific properties
 * for testing content analysis, format optimization, and auto-conversion.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// =====================================================
// Test Configuration
// =====================================================

/**
 * Default test fixtures directory
 */
export const FIXTURES_DIR = join(process.cwd(), "src", "tests", "fixtures", "test-images");

/**
 * Ensure test fixtures directory exists
 */
async function ensureFixturesDir(): Promise<void> {
  await mkdir(FIXTURES_DIR, { recursive: true });
}

/**
 * Generate unique filename for test images
 */
function generateFilename(prefix: string, suffix: string): string {
  const unique = randomBytes(4).toString("hex");
  return join(FIXTURES_DIR, `${prefix}-${unique}.${suffix}`);
}

// =====================================================
// Solid Color Images
// =====================================================

/**
 * Create a solid color image
 * Useful for testing entropy calculation (should be ~0.0)
 *
 * @param width - Image width
 * @param height - Image height
 * @param color - RGB color values (0-255)
 * @returns Path to created image
 */
export async function createSolidColorImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("solid", "png");

  const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: rgb,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

/**
 * Create a solid color image with transparency
 * Useful for testing transparency detection
 *
 * @param width - Image width
 * @param height - Image height
 * @param color - RGBA color values (0-255)
 * @returns Path to created image
 */
export async function createTransparentColorImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number; alpha: number }
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("transparent", "png");

  const rgba = {
    r: color.r,
    g: color.g,
    b: color.b,
    alpha: color.alpha / 255,
  };

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: rgba,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

// =====================================================
// Noise Images
// =====================================================

/**
 * Create a random noise image
 * Useful for testing entropy calculation (should be ~8.0 for max noise)
 *
 * @param width - Image width
 * @param height - Image height
 * @param intensity - Noise intensity (0-1, 1 = full random noise)
 * @returns Path to created image
 */
export async function createNoiseImage(
  width: number,
  height: number,
  intensity: number = 1
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("noise", "png");

  // Create random noise buffer
  const pixelCount = width * height;
  const buffer = Buffer.alloc(pixelCount * 3);

  for (let i = 0; i < buffer.length; i++) {
    // Mix random noise with base value based on intensity
    const random = Math.random() * 255;
    const base = 128;
    buffer[i] = Math.floor(base * (1 - intensity) + random * intensity);
  }

  await sharp(buffer, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

// =====================================================
// Gradient Images
// =====================================================

/**
 * Create a gradient image
 * Useful for testing continuous tone detection (photograph-like)
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Path to created image
 */
export async function createGradientImage(
  width: number,
  height: number
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("gradient", "png");

  // Create gradient by drawing lines
  const gradientData = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;

      // Create diagonal gradient
      const value = Math.floor(((x + y) / (width + height)) * 255);

      gradientData[idx] = value; // Red
      gradientData[idx + 1] = Math.floor(value * 0.8); // Green
      gradientData[idx + 2] = Math.floor(value * 0.6); // Blue
    }
  }

  await sharp(gradientData, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

// =====================================================
// Palette Images
// =====================================================

/**
 * Create an image with limited color palette
 * Useful for testing palette estimation
 *
 * @param width - Image width
 * @param height - Image height
 * @param colorCount - Number of unique colors to use
 * @returns Path to created image
 */
export async function createPaletteImage(
  width: number,
  height: number,
  colorCount: number
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename(`palette-${colorCount}`, "png");

  // Generate random colors
  const colors: Array<[number, number, number]> = [];
  for (let i = 0; i < colorCount; i++) {
    colors.push([
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ]);
  }

  // Create image with random color blocks
  const blockSize = Math.max(10, Math.floor(Math.min(width, height) / Math.sqrt(colorCount)));
  const data = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockIdx = Math.floor(y / blockSize) * Math.floor(width / blockSize) + Math.floor(x / blockSize);
      const colorIdx = blockIdx % colorCount;
      const color = colors[colorIdx];

      const idx = (y * width + x) * 3;
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

// =====================================================
// Graphic vs Photograph Test Images
// =====================================================

/**
 * Create a graphic-style image (flat colors, sharp edges)
 * Useful for testing graphic vs photograph classification
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Path to created image
 */
export async function createGraphicImage(
  width: number,
  height: number
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("graphic", "png");

  // Create image with geometric shapes and flat colors
  const data = Buffer.alloc(width * height * 3);
  const bgColor = [240, 240, 245];
  const shape1Color = [65, 105, 225]; // Royal blue
  const shape2Color = [255, 140, 0]; // Dark orange
  const shape3Color = [50, 205, 50]; // Lime green

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      let color = bgColor;

      // Draw rectangle (sharp edges)
      if (x > width * 0.1 && x < width * 0.4 && y > height * 0.1 && y < height * 0.4) {
        color = shape1Color;
      }
      // Draw circle
      else {
        const cx = width * 0.7;
        const cy = height * 0.7;
        const radius = Math.min(width, height) * 0.2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) {
          color = shape2Color;
        }
      }
      // Draw triangle (bottom)
      if (y > height * 0.8) {
        const triangleWidth = width * 0.3;
        const startX = width * 0.35;
        const progress = (y - height * 0.8) / (height * 0.2);
        const currentWidth = triangleWidth * progress;
        const centerX = width * 0.5;
        if (Math.abs(x - centerX) < currentWidth / 2) {
          color = shape3Color;
        }
      }

      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

/**
 * Create a photograph-style image (continuous tones)
 * Useful for testing photograph vs graphic classification
 *
 * @param width - Image width
 * @param height - Image height
 * @returns Path to created image
 */
export async function createPhotographImage(
  width: number,
  height: number
): Promise<string> {
  await ensureFixturesDir();

  const imagePath = generateFilename("photo", "jpg");

  // Create photo-like image with gradients and noise
  const data = Buffer.alloc(width * height * 3);

  // Base gradients for sky and ground
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;

      // Sky gradient (light blue to white)
      if (y < height * 0.6) {
        const skyProgress = y / (height * 0.6);
        const noise = (Math.random() - 0.5) * 20;
        data[idx] = Math.min(255, Math.max(0, 135 + skyProgress * 100 + noise)); // R
        data[idx + 1] = Math.min(255, Math.max(0, 206 + skyProgress * 40 + noise)); // G
        data[idx + 2] = Math.min(255, Math.max(0, 235 + skyProgress * 20 + noise)); // B
      }
      // Ground with texture
      else {
        const groundProgress = (y - height * 0.6) / (height * 0.4);
        const noise = (Math.random() - 0.5) * 60;
        const baseColor = 34 + groundProgress * 20; // Dark green to lighter
        data[idx] = Math.min(255, Math.max(0, baseColor + noise)); // R
        data[idx + 1] = Math.min(255, Math.max(0, baseColor * 2 + noise)); // G
        data[idx + 2] = Math.min(255, Math.max(0, baseColor * 0.5 + noise)); // B
      }
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .jpeg({ quality: 90 })
    .toFile(imagePath);

  return imagePath;
}

// =====================================================
// Cleanup Helpers
// =====================================================

/**
 * Clean up test images
 *
 * @param paths - Array of image paths to delete
 */
export async function cleanupTestImages(paths: string[]): Promise<void> {
  const { unlink } = await import("node:fs/promises");

  for (const path of paths) {
    try {
      await unlink(path);
    } catch {
      // Ignore errors if file doesn't exist
    }
  }
}

/**
 * Clean up all test images in fixtures directory
 */
export async function cleanupAllTestImages(): Promise<void> {
  const { readdir, unlink } = await import("node:fs/promises");

  try {
    const files = await readdir(FIXTURES_DIR);
    for (const file of files) {
      await unlink(join(FIXTURES_DIR, file));
    }
  } catch {
    // Directory doesn't exist or is empty
  }
}
