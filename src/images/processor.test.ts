/**
 * Unit tests for image processor
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";

import {
  type ProcessOptions,
  convertFormat,
  cropImage,
  generateDimensionCSS,
  getImageMetadata,
  processImage,
} from "./processor";

describe("processImage", () => {
  const testDir = "/tmp/figma-skill-test";
  const inputFile = join(testDir, "input.png");
  const outputFile = join(testDir, "output.png");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    // Create a simple test image using sharp directly
    const sharp = (await import("sharp")).default;
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(inputFile);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("Basic processing", () => {
    it("should copy image without options", async () => {
      const result = await processImage(inputFile, outputFile);

      expect(result.path).toBe(outputFile);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.format).toBe("png");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should return processed image metadata", async () => {
      const result = await processImage(inputFile, outputFile);

      expect(result).toMatchObject({
        path: outputFile,
        width: 100,
        height: 100,
        format: expect.any(String),
        size: expect.any(Number),
      });
    });
  });

  describe("Crop processing", () => {
    it("should crop image to specified region", async () => {
      const options: ProcessOptions = {
        crop: { left: 10, top: 10, width: 50, height: 50 },
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("should handle crop at origin", async () => {
      const options: ProcessOptions = {
        crop: { left: 0, top: 0, width: 50, height: 50 },
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("should handle crop to full size", async () => {
      const options: ProcessOptions = {
        crop: { left: 0, top: 0, width: 100, height: 100 },
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it("should reject crop exceeding image bounds", async () => {
      const options: ProcessOptions = {
        crop: { left: 0, top: 0, width: 200, height: 200 },
      };

      await expect(
        processImage(inputFile, outputFile, options)
      ).rejects.toThrow();
    });
  });

  describe("Resize processing", () => {
    it("should resize image to specified dimensions", async () => {
      const options: ProcessOptions = {
        width: 50,
        height: 50,
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("should resize with aspect ratio preservation", async () => {
      const options: ProcessOptions = {
        width: 50,
        height: 50,
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("should handle upscale", async () => {
      const options: ProcessOptions = {
        width: 200,
        height: 200,
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });
  });

  describe("Format conversion", () => {
    it("should convert PNG to JPEG", async () => {
      const jpegFile = join(testDir, "output.jpg");
      const options: ProcessOptions = {
        format: "jpeg",
        quality: 80,
      };

      const result = await processImage(inputFile, jpegFile, options);

      expect(result.format).toBe("jpeg");
      expect(result.path).toBe(jpegFile);
    });

    it("should convert PNG to WebP", async () => {
      const webpFile = join(testDir, "output.webp");
      const options: ProcessOptions = {
        format: "webp",
        quality: 85,
      };

      const result = await processImage(inputFile, webpFile, options);

      expect(result.format).toBe("webp");
      expect(result.path).toBe(webpFile);
    });

    it("should apply quality setting to JPEG", async () => {
      const jpegFile = join(testDir, "output.jpg");
      const options: ProcessOptions = {
        format: "jpeg",
        quality: 50,
      };

      const result = await processImage(inputFile, jpegFile, options);

      expect(result.format).toBe("jpeg");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should keep PNG format when not specified", async () => {
      const result = await processImage(inputFile, outputFile);

      expect(result.format).toBe("png");
    });
  });

  describe("Combined operations", () => {
    it("should crop then resize", async () => {
      const options: ProcessOptions = {
        crop: { left: 0, top: 0, width: 80, height: 80 },
        width: 40,
        height: 40,
      };

      const result = await processImage(inputFile, outputFile, options);

      expect(result.width).toBe(40);
      expect(result.height).toBe(40);
    });

    it("should crop and convert format", async () => {
      const jpegFile = join(testDir, "output.jpg");
      const options: ProcessOptions = {
        crop: { left: 10, top: 10, width: 50, height: 50 },
        format: "jpeg",
        quality: 80,
      };

      const result = await processImage(inputFile, jpegFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(result.format).toBe("jpeg");
    });

    it("should resize and convert format", async () => {
      const webpFile = join(testDir, "output.webp");
      const options: ProcessOptions = {
        width: 50,
        height: 50,
        format: "webp",
        quality: 85,
      };

      const result = await processImage(inputFile, webpFile, options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(result.format).toBe("webp");
    });
  });

  describe("Error handling", () => {
    it("should throw on non-existent input file", async () => {
      await expect(
        processImage("/nonexistent/file.png", outputFile)
      ).rejects.toThrow();
    });

    it("should throw on invalid crop dimensions", async () => {
      const options: ProcessOptions = {
        crop: { left: -10, top: -10, width: 50, height: 50 },
      };

      await expect(
        processImage(inputFile, outputFile, options)
      ).rejects.toThrow();
    });

    it("should throw on zero dimensions", async () => {
      const options: ProcessOptions = {
        width: 0,
        height: 0,
      };

      await expect(
        processImage(inputFile, outputFile, options)
      ).rejects.toThrow();
    });
  });
});

describe("getImageMetadata", () => {
  const testDir = "/tmp/figma-skill-test-metadata";
  const testFile = join(testDir, "test.png");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    const sharp = (await import("sharp")).default;
    await sharp({
      create: {
        width: 150,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(testFile);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should get image metadata", async () => {
    const metadata = await getImageMetadata(testFile);

    expect(metadata).toMatchObject({
      path: testFile,
      width: 150,
      height: 100,
      format: "png",
      size: expect.any(Number),
    });
  });

  it("should throw on non-existent file", async () => {
    await expect(getImageMetadata("/nonexistent/file.png")).rejects.toThrow();
  });
});

describe("cropImage", () => {
  const testDir = "/tmp/figma-skill-test-crop";
  const inputFile = join(testDir, "input.png");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    const sharp = (await import("sharp")).default;
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(inputFile);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should crop image to specified region", async () => {
    const result = await cropImage(inputFile, {
      left: 10,
      top: 10,
      width: 50,
      height: 50,
    });

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it("should reject invalid crop region", async () => {
    await expect(
      cropImage(inputFile, { left: 0, top: 0, width: 200, height: 200 })
    ).rejects.toThrow();
  });
});

describe("convertFormat", () => {
  const testDir = "/tmp/figma-skill-test-convert";
  const inputFile = join(testDir, "input.png");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    const sharp = (await import("sharp")).default;
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(inputFile);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should convert PNG to JPEG", async () => {
    const outputFile = join(testDir, "output.jpg");
    const result = await convertFormat(inputFile, outputFile, "jpeg", 80);

    expect(result.format).toBe("jpeg");
    expect(result.path).toBe(outputFile);
  });

  it("should convert PNG to WebP", async () => {
    const outputFile = join(testDir, "output.webp");
    const result = await convertFormat(inputFile, outputFile, "webp", 85);

    expect(result.format).toBe("webp");
    expect(result.path).toBe(outputFile);
  });

  it("should apply quality parameter", async () => {
    const outputFile = join(testDir, "output.jpg");
    const result = await convertFormat(inputFile, outputFile, "jpeg", 50);

    expect(result.format).toBe("jpeg");
    expect(result.size).toBeGreaterThan(0);
  });
});

describe("generateDimensionCSS", () => {
  it("should generate CSS for image dimensions", () => {
    const css = generateDimensionCSS("node-123", 200, 150);

    expect(css).toContain("--image-node-123-width: 200px");
    expect(css).toContain("--image-node-123-height: 150px");
  });

  it("should format CSS correctly", () => {
    const css = generateDimensionCSS("test-id", 100, 100);

    expect(css).toMatch(
      /^\s+--image-test-id-width: 100px;\n\s+--image-test-id-height: 100px;$/
    );
  });

  it("should handle large dimensions", () => {
    const css = generateDimensionCSS("large-img", 3840, 2160);

    expect(css).toContain("3840px");
    expect(css).toContain("2160px");
  });

  it("should handle decimal dimensions", () => {
    const css = generateDimensionCSS("decimal-img", 100.5, 200.75);

    expect(css).toContain("100.5px");
    expect(css).toContain("200.75px");
  });
});
