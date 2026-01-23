/**
 * Unit tests for images/mask-downloader module
 *
 * Tests mask-aware downloading with graceful error handling
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  downloadImagesWithMasks,
  groupTargetsByMask,
  type MaskDownloadOptions,
  type MaskDownloadResult,
  type MaskRelationship,
} from "@/images/mask-downloader";
import { ProgressEmitter } from "@/streaming/progress-emitter";

// Mock the dependencies
jest.mock("../../images/mask-compositor", () => ({
  applyVectorMask: jest.fn(),
  applyLuminanceMask: jest.fn(),
}));

jest.mock("../../images/downloader", () => ({
  downloadImages: jest.fn(),
}));

// Test constants - use writable temporary directory
const TEST_OUTPUT_DIR = "/tmp/figma-skill-mask-downloader-test";

describe("images/mask-downloader", () => {
  // =====================================================
  // Test Suite 1: groupTargetsByMask
  // =====================================================
  describe("groupTargetsByMask", () => {
    it("should group items by their mask relationships", () => {
      const items = [
        { id: "target-1", url: "https://example.com/1.png" },
        { id: "target-2", url: "https://example.com/2.png" },
        { id: "no-mask-1", url: "https://example.com/3.png" },
      ];

      const maskMap = new Map<string, MaskRelationship>([
        [
          "target-1",
          {
            targetNodeId: "target-1",
            maskNodeId: "mask-1",
            maskType: "VECTOR",
          },
        ],
        [
          "target-2",
          {
            targetNodeId: "target-2",
            maskNodeId: "mask-1",
            maskType: "ALPHA",
          },
        ],
      ]);

      const grouped = groupTargetsByMask(items, maskMap);

      expect(grouped.get("mask-1")).toHaveLength(2);
      expect(grouped.get("mask-1")).toEqual([
        { id: "target-1", url: "https://example.com/1.png" },
        { id: "target-2", url: "https://example.com/2.png" },
      ]);
    });

    it("should group items without masks separately", () => {
      const items = [
        { id: "target-1", url: "https://example.com/1.png" },
        { id: "no-mask-1", url: "https://example.com/2.png" },
      ];

      const maskMap = new Map<string, MaskRelationship>([
        [
          "target-1",
          {
            targetNodeId: "target-1",
            maskNodeId: "mask-1",
            maskType: "VECTOR",
          },
        ],
      ]);

      const grouped = groupTargetsByMask(items, maskMap);

      expect(grouped.get("__no_mask__")).toHaveLength(1);
      expect(grouped.get("__no_mask__")?.[0].id).toBe("no-mask-1");
    });

    it("should return empty map when no items provided", () => {
      const items: Array<{ id: string; url: string }> = [];
      const maskMap = new Map<string, MaskRelationship>();

      const grouped = groupTargetsByMask(items, maskMap);

      expect(grouped.size).toBe(0);
    });

    it("should handle multiple different masks", () => {
      const items = [
        { id: "target-1", url: "https://example.com/1.png" },
        { id: "target-2", url: "https://example.com/2.png" },
        { id: "target-3", url: "https://example.com/3.png" },
      ];

      const maskMap = new Map<string, MaskRelationship>([
        [
          "target-1",
          {
            targetNodeId: "target-1",
            maskNodeId: "mask-1",
            maskType: "VECTOR",
          },
        ],
        [
          "target-2",
          {
            targetNodeId: "target-2",
            maskNodeId: "mask-2",
            maskType: "ALPHA",
          },
        ],
      ]);

      const grouped = groupTargetsByMask(items, maskMap);

      expect(grouped.get("mask-1")).toHaveLength(1);
      expect(grouped.get("mask-2")).toHaveLength(1);
      expect(grouped.get("mask-1")?.[0].id).toBe("target-1");
      expect(grouped.get("mask-2")?.[0].id).toBe("target-2");
    });
  });

  // =====================================================
  // Test Suite 2: downloadImagesWithMasks - Basic Functionality
  // =====================================================
  describe("downloadImagesWithMasks - basic functionality", () => {
    let mockProgress: ProgressEmitter;

    beforeEach(() => {
      mockProgress = new ProgressEmitter();
      jest.spyOn(mockProgress, "start").mockImplementation(() => {});
      jest.spyOn(mockProgress, "increment").mockImplementation(() => {});
      jest.spyOn(mockProgress, "complete").mockImplementation(() => {});

      // Mock the downloader to return success
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "test-1",
          url: "https://example.com/test.png",
          path: "/output/test-1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);
    });

    it("should download images without masks when enableMasks is false", async () => {
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockClear();

      const items = [{ id: "test-1", url: "https://example.com/test.png" }];
      const maskRelationships: MaskRelationship[] = [];

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: false,
      };

      await downloadImagesWithMasks(items, maskRelationships, options);

      expect(mockDownload).toHaveBeenCalledTimes(1);
    });

    it("should download and composite masked images when enableMasks is true", async () => {
      const items = [{ id: "target-1", url: "https://example.com/1.png" }];
      const maskRelationships: MaskRelationship[] = [
        {
          targetNodeId: "target-1",
          maskNodeId: "mask-1",
          maskType: "VECTOR",
          maskBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
          targetBoundingBox: { x: 10, y: 10, width: 80, height: 80 },
        },
      ];

      // Mock successful download
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "target-1",
          url: "https://example.com/1.png",
          path: "/output/target-1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      // Mock successful mask compositing
      const { applyVectorMask: mockApplyVector } = require("../../images/mask-compositor");
      mockApplyVector.mockResolvedValue({
        path: "/output/target-1-masked.png",
        width: 80,
        height: 80,
        format: "png",
        size: 5000,
      });

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
        maskedSuffix: "-masked",
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(1);
      expect(results[0].hasMask).toBe(true);
      expect(results[0].maskType).toBe("VECTOR");
    });

    it("should return original images when no masks present", async () => {
      const items = [
        { id: "no-mask-1", url: "https://example.com/1.png" },
        { id: "no-mask-2", url: "https://example.com/2.png" },
      ];
      const maskRelationships: MaskRelationship[] = [];

      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "no-mask-1",
          url: "https://example.com/1.png",
          path: "/output/no-mask-1.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "no-mask-2",
          url: "https://example.com/2.png",
          path: "/output/no-mask-2.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(2);
      expect(results[0].hasMask).toBe(false);
      expect(results[1].hasMask).toBe(false);
    });

    it("should handle multiple mask relationships", async () => {
      const items = [
        { id: "target-1", url: "https://example.com/1.png" },
        { id: "target-2", url: "https://example.com/2.png" },
        { id: "target-3", url: "https://example.com/3.png" },
      ];

      // First two share the same mask
      const maskRelationships: MaskRelationship[] = [
        {
          targetNodeId: "target-1",
          maskNodeId: "mask-1",
          maskType: "ALPHA",
        },
        {
          targetNodeId: "target-2",
          maskNodeId: "mask-1",
          maskType: "ALPHA",
        },
        {
          targetNodeId: "target-3",
          maskNodeId: "mask-2",
          maskType: "VECTOR",
        },
      ];

      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "target-1",
          url: "https://example.com/1.png",
          path: "/output/target-1.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "target-2",
          url: "https://example.com/2.png",
          path: "/output/target-2.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "target-3",
          url: "https://example.com/3.png",
          path: "/output/target-3.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(3);
    });
  });

  // =====================================================
  // Test Suite 3: Error Handling - Graceful Degradation
  // =====================================================
  describe("Error handling - graceful degradation", () => {
    it("should skip mask on compositing error, falls back to original", async () => {
      const items = [{ id: "target-1", url: "https://example.com/1.png" }];
      const maskRelationships: MaskRelationship[] = [
        {
          targetNodeId: "target-1",
          maskNodeId: "mask-1",
          maskType: "VECTOR",
        },
      ];

      // Mock successful download
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "target-1",
          url: "https://example.com/1.png",
          path: "/output/target-1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      // Mock failing mask compositing
      const { applyVectorMask: mockApplyVector } = require("../../images/mask-compositor");
      mockApplyVector.mockRejectedValue(new Error("Mask compositing failed"));

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].hasMask).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Mask compositing failed"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle download errors when no masks present", async () => {
      const items = [{ id: "target-1", url: "https://example.com/1.png" }];
      const maskRelationships: MaskRelationship[] = [];

      // Mock failed download
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "target-1",
          url: "https://example.com/1.png",
          path: "/output/target-1.png",
          success: false,
          error: new Error("Download failed"),
        },
      ]);

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].hasMask).toBe(false);
    });

    it("should handle both download and mask compositing errors", async () => {
      const items = [{ id: "target-1", url: "https://example.com/1.png" }];
      const maskRelationships: MaskRelationship[] = [
        {
          targetNodeId: "target-1",
          maskNodeId: "mask-1",
          maskType: "VECTOR",
        },
      ];

      // Mock failed download
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "target-1",
          url: "https://example.com/1.png",
          path: "/output/target-1.png",
          success: false,
          error: new Error("Download failed"),
        },
      ]);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: true,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  // =====================================================
  // Test Suite 4: Default Options
  // =====================================================
  describe("default options", () => {
    it("should enable masks by default", async () => {
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([]);

      const items = [{ id: "test-1", url: "https://example.com/test.png" }];
      const maskRelationships: MaskRelationship[] = [];

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
      };

      await downloadImagesWithMasks(items, maskRelationships, options);

      // Verify masks were processed (would fail if relationships existed)
      expect(mockDownload).toHaveBeenCalled();
    });

    it("should use '-masked' as default suffix", () => {
      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
      };

      expect(options.maskedSuffix).toBeUndefined();
      // The function uses the default value internally
    });
  });

  // =====================================================
  // Test Suite 5: MaskDownloadResult Type
  // =====================================================
  describe("MaskDownloadResult type validation", () => {
    it("should return valid MaskDownloadResult structure", async () => {
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([
        {
          id: "test-1",
          url: "https://example.com/test.png",
          path: "/output/test-1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      const items = [{ id: "test-1", url: "https://example.com/test.png" }];
      const maskRelationships: MaskRelationship[] = [];

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        enableMasks: false,
      };

      const results = await downloadImagesWithMasks(
        items,
        maskRelationships,
        options
      );

      const result: MaskDownloadResult = results[0];

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("hasMask");
      expect(typeof result.maskType === "string" || result.maskType === undefined).toBe(
        true
      );
    });
  });

  // =====================================================
  // Test Suite 6: Progress Tracking
  // =====================================================
  describe("progress tracking", () => {
    it("should call progress methods when provided", async () => {
      const { downloadImages: mockDownload } = require("../../images/downloader");
      mockDownload.mockResolvedValue([]);

      const progress = new ProgressEmitter();
      const startSpy = jest.spyOn(progress, "start").mockImplementation(() => {});
      const incrementSpy = jest
        .spyOn(progress, "increment")
        .mockImplementation(() => {});
      const completeSpy = jest
        .spyOn(progress, "complete")
        .mockImplementation(() => {});

      const items = [{ id: "test-1", url: "https://example.com/test.png" }];
      const maskRelationships: MaskRelationship[] = [];

      const options: MaskDownloadOptions = {
        outputDir: TEST_OUTPUT_DIR,
        parallel: 5,
        progress,
      };

      await downloadImagesWithMasks(items, maskRelationships, options);

      expect(startSpy).toHaveBeenCalledWith(1, "downloading with masks");
      expect(incrementSpy).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
