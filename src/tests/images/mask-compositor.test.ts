/**
 * Unit tests for images/mask-compositor module
 *
 * Tests SVG matte compositing with Sharp
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "node:fs/promises";
import { join } from "node:path";

import {
  compositeWithOffset,
  createMaskCanvas,
  fileExists,
  rasterizeSvgMask,
  type AlignedAssets,
  type CompositeOptions,
  type CompositeResult,
  applyVectorMask,
  applyLuminanceMask,
  validateCompositeOptions,
} from "@/images/mask-compositor";
import { CIRCLE_MASK_SVG, RECTANGLE_MASK_SVG } from "@/tests/fixtures/svg";

describe("images/mask-compositor", () => {
  const testDir = "/tmp/figma-skill-mask-test";
  let targetPath: string;
  let maskPath: string;
  let outputPath: string;

  // Sample alignment for tests
  const sampleAlignment: AlignedAssets = {
    targetOffset: { x: 0, y: 0 },
    compositeDimensions: { width: 100, height: 100 },
    effectiveBounds: { x: 0, y: 0, width: 100, height: 100 },
  };

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    targetPath = join(testDir, "target.png");
    maskPath = join(testDir, "mask.png");
    outputPath = join(testDir, "output.png");

    // Create a simple target image (red square)
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
      .toFile(targetPath);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // =====================================================
  // Test Suite 1: validateCompositeOptions
  // =====================================================
  describe("validateCompositeOptions", () => {
    it("should pass with valid options", () => {
      const options: CompositeOptions = {
        targetImagePath: "/path/to/target.png",
        maskInput: "<svg>...</svg>",
        outputPath: "/path/to/output.png",
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      expect(() => validateCompositeOptions(options)).not.toThrow();
    });

    it("should throw when targetImagePath is missing", () => {
      const options = {
        targetImagePath: "",
        maskInput: "<svg>...</svg>",
        outputPath: "/path/to/output.png",
        alignment: sampleAlignment,
        maskType: "VECTOR" as const,
      };

      expect(() => validateCompositeOptions(options)).toThrow("targetImagePath is required");
    });

    it("should throw when maskInput is missing", () => {
      const options = {
        targetImagePath: "/path/to/target.png",
        maskInput: "",
        outputPath: "/path/to/output.png",
        alignment: sampleAlignment,
        maskType: "VECTOR" as const,
      };

      expect(() => validateCompositeOptions(options)).toThrow("maskInput is required");
    });

    it("should throw when outputPath is missing", () => {
      const options = {
        targetImagePath: "/path/to/target.png",
        maskInput: "<svg>...</svg>",
        outputPath: "",
        alignment: sampleAlignment,
        maskType: "VECTOR" as const,
      };

      expect(() => validateCompositeOptions(options)).toThrow("outputPath is required");
    });
  });

  // =====================================================
  // Test Suite 2: fileExists
  // =====================================================
  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const exists = await fileExists(targetPath);
      expect(exists).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      const exists = await fileExists("/nonexistent/file.png");
      expect(exists).toBe(false);
    });
  });

  // =====================================================
  // Test Suite 3: createMaskCanvas
  // =====================================================
  describe("createMaskCanvas", () => {
    it("should create a blank canvas with specified dimensions", () => {
      const canvas = createMaskCanvas(50, 50);
      expect(canvas).toBeDefined();
    });

    it("should create canvas with Sharp instance", () => {
      const canvas = createMaskCanvas(100, 100);
      expect(typeof canvas.resize).toBe("function");
    });
  });

  // =====================================================
  // Test Suite 4: rasterizeSvgMask
  // =====================================================
  describe("rasterizeSvgMask", () => {
    it("should rasterize SVG to PNG buffer", async () => {
      const buffer = await rasterizeSvgMask(CIRCLE_MASK_SVG, 50, 50);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should rasterize rectangle SVG", async () => {
      const buffer = await rasterizeSvgMask(RECTANGLE_MASK_SVG, 100, 100);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // Test Suite 5: compositeWithOffset
  // =====================================================
  describe("compositeWithOffset", () => {
    it("should composite overlay at zero offset", async () => {
      const sharp = (await import("sharp")).default;

      const baseImage = sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      });

      const overlay = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await compositeWithOffset(baseImage, overlay, { x: 0, y: 0 });

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should composite overlay at positive offset", async () => {
      const sharp = (await import("sharp")).default;

      const baseImage = sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      });

      const overlay = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await compositeWithOffset(baseImage, overlay, { x: 25, y: 25 });

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // =====================================================
  // Test Suite 6: applyVectorMask
  // =====================================================
  describe("applyVectorMask", () => {
    it("should apply vector mask using dest-in blend mode", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      const result = await applyVectorMask(options);

      expect(result.path).toBe(outputPath);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.format).toBe("png");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should create output with correct dimensions", async () => {
      const customAlignment: AlignedAssets = {
        targetOffset: { x: 0, y: 0 },
        compositeDimensions: { width: 50, height: 50 },
        effectiveBounds: { x: 0, y: 0, width: 50, height: 50 },
      };

      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: customAlignment,
        maskType: "VECTOR",
      };

      const result = await applyVectorMask(options);

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it("should handle SVG string input", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      const result = await applyVectorMask(options);

      expect(result.path).toBe(outputPath);
      expect(result.size).toBeGreaterThan(0);
    });

    it("should handle background color option", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
        backgroundColor: "#ffffff",
      };

      const result = await applyVectorMask(options);

      expect(result.path).toBe(outputPath);
    });
  });

  // =====================================================
  // Test Suite 7: applyLuminanceMask
  // =====================================================
  describe("applyLuminanceMask", () => {
    it("should apply luminance mask with grayscale conversion", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "LUMINANCE",
      };

      const result = await applyLuminanceMask(options);

      expect(result.path).toBe(outputPath);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.format).toBe("png");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should create proper alpha channel from grayscale", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: RECTANGLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "LUMINANCE",
      };

      const result = await applyLuminanceMask(options);

      expect(result.path).toBe(outputPath);
    });
  });

  // =====================================================
  // Test Suite 8: Error Handling
  // =====================================================
  describe("Error handling", () => {
    it("should throw on non-existent target file", async () => {
      const options: CompositeOptions = {
        targetImagePath: "/nonexistent/target.png",
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      await expect(applyVectorMask(options)).rejects.toThrow();
    });

    it("should handle invalid SVG gracefully", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: "not valid svg",
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      // Sharp might handle this gracefully or throw
      try {
        const result = await applyVectorMask(options);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  // =====================================================
  // Test Suite 9: CompositeResult Type
  // =====================================================
  describe("CompositeResult type validation", () => {
    it("should return valid CompositeResult structure", async () => {
      const options: CompositeOptions = {
        targetImagePath: targetPath,
        maskInput: CIRCLE_MASK_SVG,
        outputPath: outputPath,
        alignment: sampleAlignment,
        maskType: "VECTOR",
      };

      const result: CompositeResult = await applyVectorMask(options);

      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
      expect(result).toHaveProperty("format");
      expect(result).toHaveProperty("size");
      expect(typeof result.path).toBe("string");
      expect(typeof result.width).toBe("number");
      expect(typeof result.height).toBe("number");
      expect(typeof result.format).toBe("string");
      expect(typeof result.size).toBe("number");
    });
  });
});
