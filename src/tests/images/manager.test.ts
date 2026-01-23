/**
 * Tests for images/manager module
 *
 * Tests ImageManager class for image download and processing coordination.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { promises as fs } from "node:fs";

import {
  ImageManager,
  type ImageProcessingConfig,
  downloadAndProcessImages,
} from "@/images/manager";

// Mock dependencies
jest.mock("@/images/downloader", () => ({
  downloadImagesDeduplicated: jest.fn(),
}));

jest.mock("@/images/processor", () => ({
  processImage: jest.fn(),
  getImageMetadata: jest.fn(),
  generateDimensionCSS: jest.fn(),
}));

jest.mock("@/images/crop-calculator", () => ({
  calculateCropFromTransform: jest.fn(),
}));

describe("images/manager", () => {
  let mockImageManager: ImageManager;
  let mockItems: Array<{ id: string; url: string }>;
  let mockNodes: any[];
  let mockDownloadOptions: any;
  let mockProcessingConfig: ImageProcessingConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockImageManager = new ImageManager();

    // Get mocked functions
    const { downloadImagesDeduplicated } = require("@/images/downloader");
    const {
      processImage,
      getImageMetadata,
      generateDimensionCSS,
    } = require("@/images/processor");
    const { calculateCropFromTransform } = require("@/images/crop-calculator");

    // Mock items
    mockItems = [
      { id: "node-1", url: "https://example.com/image1.png" },
      { id: "node-2", url: "https://example.com/image2.png" },
      { id: "node-3", url: "https://example.com/image3.png" },
    ];

    // Mock nodes
    mockNodes = [
      {
        id: "node-1",
        type: "FRAME",
        name: "Image 1",
        transforms: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      {
        id: "node-2",
        type: "FRAME",
        name: "Image 2",
        transforms: [
          [1, 0, 10],
          [0, 1, 20],
        ],
      },
      {
        id: "node-3",
        type: "FRAME",
        name: "Image 3",
        transforms: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
    ];

    // Mock download options
    mockDownloadOptions = {
      outputDir: "/test/output",
      parallel: 3,
      timeout: 10000,
    };

    // Mock processing config
    mockProcessingConfig = {
      applyCrop: true,
      convertFormat: "png",
      quality: 90,
    };

    // Default mock for downloadImagesDeduplicated
    downloadImagesDeduplicated.mockResolvedValue([
      {
        id: "node-1",
        url: "https://example.com/image1.png",
        path: "/test/output/image1.png",
        success: true,
        width: 100,
        height: 100,
      },
      {
        id: "node-2",
        url: "https://example.com/image2.png",
        path: "/test/output/image2.png",
        success: true,
        width: 200,
        height: 150,
      },
      {
        id: "node-3",
        url: "https://example.com/image3.png",
        path: "/test/output/image3.png",
        success: true,
        width: 300,
        height: 200,
      },
    ]);

    // Default mock for processImage
    processImage.mockResolvedValue({
      path: "/test/output/image1_processed.png",
      width: 100,
      height: 100,
      format: "png",
      size: 5000,
    });

    // Default mock for getImageMetadata
    getImageMetadata.mockResolvedValue({
      width: 100,
      height: 100,
      format: "png",
      size: 5000,
    });

    // Default mock for generateDimensionCSS
    generateDimensionCSS.mockReturnValue(
      "--node-1-width: 100px; --node-1-height: 100px;"
    );

    // Default mock for calculateCropFromTransform
    calculateCropFromTransform.mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  // =====================================================
  // Test Suite 1: ImageManager.downloadAndProcess
  // =====================================================
  describe("ImageManager.downloadAndProcess", () => {
    it("should download and process images successfully", async () => {
      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        mockProcessingConfig
      );

      expect(result).toBeDefined();
      expect(result.downloads).toHaveLength(3);
      expect(result.stats.total).toBe(3);
      expect(result.stats.downloaded).toBe(3);
      expect(result.stats.failed).toBe(0);
    });

    it("should call downloadImagesDeduplicated with correct options", async () => {
      const { downloadImagesDeduplicated } = require("@/images/downloader");

      await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        mockProcessingConfig
      );

      expect(downloadImagesDeduplicated).toHaveBeenCalledWith(
        mockItems,
        expect.objectContaining({
          outputDir: "/test/output",
          parallel: 3,
          timeout: 10000,
        })
      );
    });

    it("should handle failed downloads gracefully", async () => {
      const { downloadImagesDeduplicated } = require("@/images/downloader");

      downloadImagesDeduplicated.mockResolvedValue([
        {
          id: "node-1",
          url: "https://example.com/image1.png",
          path: "/test/output/image1.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "node-2",
          url: "https://example.com/image2.png",
          path: "/test/output/image2.png",
          success: false,
          error: new Error("Download failed"),
        },
        {
          id: "node-3",
          url: "https://example.com/image3.png",
          path: "/test/output/image3.png",
          success: true,
          width: 300,
          height: 200,
        },
      ]);

      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        mockProcessingConfig
      );

      expect(result.stats.downloaded).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.processed).toHaveLength(2);
    });

    it("should calculate statistics correctly", async () => {
      const { processImage } = require("@/images/processor");

      processImage.mockResolvedValue({
        path: "/test/output/processed.png",
        width: 100,
        height: 100,
        format: "png",
        size: 5000,
      });

      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        mockProcessingConfig
      );

      expect(result.stats.total).toBe(3);
      expect(result.stats.processed).toBe(3);
      expect(result.stats.totalSize).toBe(15000); // 5000 * 3
    });

    it("should handle empty items array", async () => {
      const { downloadImagesDeduplicated } = require("@/images/downloader");

      downloadImagesDeduplicated.mockResolvedValue([]);

      const result = await mockImageManager.downloadAndProcess(
        [],
        mockNodes,
        mockDownloadOptions,
        mockProcessingConfig
      );

      expect(result.downloads).toHaveLength(0);
      expect(result.processed).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });
  });

  // =====================================================
  // Test Suite 2: Image Processing Configuration
  // =====================================================
  describe("ImageManager - processing configuration", () => {
    it("should apply crop when configured", async () => {
      const {
        calculateCropFromTransform,
      } = require("@/images/crop-calculator");

      await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        { applyCrop: true }
      );

      expect(calculateCropFromTransform).toHaveBeenCalledWith(
        expect.objectContaining({ id: "node-1" })
      );
    });

    it("should not apply crop when not configured", async () => {
      const {
        calculateCropFromTransform,
      } = require("@/images/crop-calculator");

      await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        { applyCrop: false }
      );

      expect(calculateCropFromTransform).not.toHaveBeenCalled();
    });

    it("should apply resize when configured", async () => {
      const { processImage } = require("@/images/processor");

      await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        {
          resize: { width: 50, height: 50 },
        }
      );

      expect(processImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          width: 50,
          height: 50,
        })
      );
    });

    it("should skip processing when no options provided", async () => {
      const { getImageMetadata, processImage } = require("@/images/processor");

      await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        {}
      );

      // Should call getImageMetadata instead of processImage
      expect(getImageMetadata).toHaveBeenCalled();
      expect(processImage).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Test Suite 3: CSS Generation
  // =====================================================
  describe("ImageManager - CSS generation", () => {
    it("should generate CSS when requested", async () => {
      const {
        downloadImagesDeduplicated,
        generateDimensionCSS,
      } = require("@/images/downloader");
      const { processImage } = require("@/images/processor");

      downloadImagesDeduplicated.mockResolvedValue([
        {
          id: "node-1",
          url: "https://example.com/image1.png",
          path: "/test/output/image1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      processImage.mockResolvedValue({
        path: "/test/output/image1.png",
        width: 100,
        height: 100,
        format: "png",
        size: 5000,
      });

      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        { generateCSS: true }
      );

      expect(result.css).toBeDefined();
      expect(generateDimensionCSS).toHaveBeenCalledWith("node-1", 100, 100);
    });

    it("should not generate CSS when generateCSS is false", async () => {
      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        { generateCSS: false }
      );

      expect(result.css).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 4: ImageManager.batchProcess
  // =====================================================
  describe("ImageManager.batchProcess", () => {
    it("should process batch of downloaded images", async () => {
      const { processImage } = require("@/images/processor");

      const downloads = [
        {
          id: "node-1",
          url: "https://example.com/image1.png",
          path: "/test/output/image1.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "node-2",
          url: "https://example.com/image2.png",
          path: "/test/output/image2.png",
          success: true,
          width: 200,
          height: 150,
        },
      ];

      const result = await mockImageManager.batchProcess(downloads, mockNodes, {
        applyCrop: true,
      });

      expect(result).toHaveLength(2);
      expect(processImage).toHaveBeenCalled();
    });

    it("should skip failed downloads in batch", async () => {
      const downloads = [
        {
          id: "node-1",
          url: "https://example.com/image1.png",
          path: "/test/output/image1.png",
          success: true,
          width: 100,
          height: 100,
        },
        {
          id: "node-2",
          url: "https://example.com/image2.png",
          path: "/test/output/image2.png",
          success: false,
          error: new Error("Failed"),
        },
      ];

      const result = await mockImageManager.batchProcess(
        downloads,
        mockNodes,
        {}
      );

      expect(result).toHaveLength(1);
    });

    it("should handle empty downloads array", async () => {
      const result = await mockImageManager.batchProcess([], mockNodes, {});

      expect(result).toHaveLength(0);
    });
  });

  // =====================================================
  // Test Suite 5: Error Handling
  // =====================================================
  describe("ImageManager - error handling", () => {
    it("should handle processing errors gracefully", async () => {
      const { processImage } = require("@/images/processor");

      processImage.mockRejectedValue(new Error("Processing failed"));

      const result = await mockImageManager.downloadAndProcess(
        mockItems,
        mockNodes,
        mockDownloadOptions,
        { applyCrop: true }
      );

      // Should continue processing other images
      expect(result.processed).toHaveLength(0); // All failed
      expect(result.stats.downloaded).toBe(3); // Downloads succeeded
    });

    it("should handle download errors", async () => {
      const { downloadImagesDeduplicated } = require("@/images/downloader");

      downloadImagesDeduplicated.mockRejectedValue(
        new Error("Download failed")
      );

      await expect(
        mockImageManager.downloadAndProcess(
          mockItems,
          mockNodes,
          mockDownloadOptions,
          mockProcessingConfig
        )
      ).rejects.toThrow("Download failed");
    });
  });

  // =====================================================
  // Test Suite 6: Convenience Function
  // =====================================================
  describe("downloadAndProcessImages", () => {
    it("should create ImageManager and call downloadAndProcess", async () => {
      const { downloadImagesDeduplicated } = require("@/images/downloader");
      const writeFileSpy = jest.spyOn(fs, "writeFile").mockResolvedValue();

      await downloadAndProcessImages(mockItems, mockNodes, "/test/output", {
        applyCrop: true,
      });

      expect(downloadImagesDeduplicated).toHaveBeenCalledWith(
        mockItems,
        expect.objectContaining({
          outputDir: "/test/output",
        })
      );

      writeFileSpy.mockRestore();
    });
  });

  // =====================================================
  // Test Suite 7: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should accept valid ImageProcessingConfig", () => {
      const config: ImageProcessingConfig = {
        applyCrop: true,
        resize: { width: 100, height: 100 },
        convertFormat: "png",
        quality: 90,
        generateCSS: true,
        cssOutputPath: "/test/output.css",
      };

      expect(config.applyCrop).toBe(true);
      expect(config.convertFormat).toBe("png");
    });

    it("should accept partial ImageProcessingConfig", () => {
      const config: ImageProcessingConfig = {
        applyCrop: false,
      };

      expect(config.applyCrop).toBe(false);
      expect(config.convertFormat).toBeUndefined();
    });
  });
});
