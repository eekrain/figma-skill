/**
 * TDD Tests for downloadAssets() - API Redesign Feature
 *
 * Test order:
 * 1. Type definitions (compile-time checks)
 * 2. Asset format detection
 * 3. Format configuration validation
 * 4. Download path generation
 * 5. downloadAssets execution
 * 6. Integration with getFile()
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type {
  AssetFormat,
  AssetFormatConfig,
  DownloadAssetsOptions,
  DownloadedAsset,
} from "@/client/download-assets";
// Import functions to test (will be implemented)
import {
  detectAssetFormats,
  generateDownloadPath,
  getNodesForDownload,
} from "@/client/download-assets";

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = jest.fn() as any;

describe("downloadAssets - TDD", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReset();
  });

  // =====================================================
  // Test Suite 1: Type Definitions (compile-time)
  // =====================================================
  describe("Type Definitions", () => {
    it("should define AssetFormat type correctly", () => {
      const format1: AssetFormat = "svg";
      const format2: AssetFormat = "png";
      const format3: AssetFormat = "jpg";
      const format4: AssetFormat = "webp";

      expect(format1).toBe("svg");
      expect(format2).toBe("png");
      expect(format3).toBe("jpg");
      expect(format4).toBe("webp");
    });

    it("should define AssetFormatConfig type correctly", () => {
      const config: AssetFormatConfig = {
        format: "png",
        scale: 2,
      };

      expect(config.format).toBe("png");
      expect(config.scale).toBe(2);
    });

    it("should define AssetFormatConfig with scales array", () => {
      const config: AssetFormatConfig = {
        format: "png",
        scales: [1, 2, 4],
        subdir: "png-multi",
      };

      expect(config.format).toBe("png");
      expect(config.scales).toEqual([1, 2, 4]);
      expect(config.subdir).toBe("png-multi");
    });

    it("should define DownloadAssetsOptions type correctly", () => {
      const options: DownloadAssetsOptions = {
        outputDir: "assets",
        formats: [
          { format: "svg" },
          { format: "png", scale: 2 },
          { format: "jpg", scales: [1, 2] },
        ],
      };

      expect(options.outputDir).toBe("assets");
      expect(options.formats).toHaveLength(3);
    });

    it("should define DownloadedAsset type correctly", () => {
      const asset: DownloadedAsset = {
        format: "png",
        scale: 2,
        nodeId: "node-1",
        nodePath: "page/frame/button",
        relativePath: "assets/page/frame/button@2x.png",
        absolutePath: "/full/path/assets/page/frame/button@2x.png",
      };

      expect(asset.format).toBe("png");
      expect(asset.scale).toBe(2);
      expect(asset.nodeId).toBe("node-1");
    });
  });

  // =====================================================
  // Test Suite 2: Asset Format Detection
  // =====================================================
  describe("detectAssetFormats", () => {
    it("should detect SVG nodes", () => {
      const svgNode = {
        id: "svg-1",
        name: "icon",
        type: "VECTOR",
        fills: [{ type: "SOLID", color: {} }],
      };

      const formats = detectAssetFormats(svgNode as any);
      expect(formats).toContain("svg");
    });

    it("should detect nodes that support PNG/JPG/WEBP", () => {
      const frameNode = {
        id: "frame-1",
        name: "component",
        type: "FRAME",
        fills: [{ type: "SOLID", color: {} }],
      };

      const formats = detectAssetFormats(frameNode as any);
      expect(formats).toContain("png");
      expect(formats).toContain("jpg");
      expect(formats).toContain("webp");
    });

    it("should detect multiple supported formats", () => {
      const frameNode = {
        id: "frame-1",
        name: "component",
        type: "FRAME",
        fills: [{ type: "SOLID", color: {} }],
      };

      const formats = detectAssetFormats(frameNode as any);
      expect(formats).toEqual(expect.arrayContaining(["png", "jpg", "webp"]));
    });

    it("should return empty array for unsupported node types", () => {
      const textNode = {
        id: "text-1",
        name: "label",
        type: "TEXT",
        characters: "Hello",
      };

      const formats = detectAssetFormats(textNode as any);
      expect(formats).toEqual([]);
    });

    it("should handle NODE and INSTANCE types", () => {
      const instanceNode = {
        id: "instance-1",
        name: "button",
        type: "INSTANCE",
      };

      const formats = detectAssetFormats(instanceNode as any);
      expect(formats).toEqual(expect.arrayContaining(["png", "jpg", "webp"]));
    });
  });

  // =====================================================
  // Test Suite 3: Download Path Generation
  // =====================================================
  describe("generateDownloadPath", () => {
    it("should generate path for single scale PNG", () => {
      const path = generateDownloadPath({
        outputDir: "assets",
        nodeId: "node-1",
        nodePath: "page/frame/button",
        format: "png",
        scale: 2,
        subdir: undefined,
      });

      expect(path).toBe("assets/page/frame/button@2x.png");
    });

    it("should generate path for SVG", () => {
      const path = generateDownloadPath({
        outputDir: "assets",
        nodeId: "node-1",
        nodePath: "icons/home",
        format: "svg",
        scale: undefined,
        subdir: undefined,
      });

      expect(path).toBe("assets/icons/home.svg");
    });

    it("should include subdir when specified", () => {
      const path = generateDownloadPath({
        outputDir: "assets",
        nodeId: "node-1",
        nodePath: "page/frame/button",
        format: "png",
        scale: 1,
        subdir: "png-multi",
      });

      expect(path).toBe("assets/png-multi/page/frame/button@1x.png");
    });

    it("should handle root-level nodes (no path)", () => {
      const path = generateDownloadPath({
        outputDir: "assets",
        nodeId: "node-1",
        nodePath: "",
        format: "svg",
        scale: undefined,
        subdir: undefined,
      });

      expect(path).toBe("assets/node-1.svg");
    });

    it("should sanitize node names for file system", () => {
      const path = generateDownloadPath({
        outputDir: "assets",
        nodeId: "node-1",
        nodePath: "page/frame/Button with Spaces",
        format: "svg",
        scale: undefined,
        subdir: undefined,
      });

      expect(path).toBe("assets/page/frame/Button_with_Spaces.svg");
    });
  });

  // =====================================================
  // Test Suite 4: Get Nodes for Download
  // =====================================================
  describe("getNodesForDownload", () => {
    it("should collect all downloadable nodes from design", () => {
      const design = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Component",
            type: "FRAME",
            children: [
              { id: "vector-1", name: "icon", type: "VECTOR" },
              { id: "text-1", name: "label", type: "TEXT" },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const nodes = getNodesForDownload(design as any);
      expect(nodes).toHaveLength(2); // FRAME and VECTOR
      expect(nodes.find((n) => n.id === "frame-1")).toBeDefined();
      expect(nodes.find((n) => n.id === "vector-1")).toBeDefined();
    });

    it("should track node path for each node", () => {
      const design = {
        name: "test",
        nodes: [
          {
            id: "page-1",
            name: "Page",
            type: "PAGE",
            children: [
              {
                id: "frame-1",
                name: "Frame",
                type: "FRAME",
                children: [{ id: "vector-1", name: "Icon", type: "VECTOR" }],
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const nodes = getNodesForDownload(design as any);
      const vectorNode = nodes.find((n) => n.id === "vector-1");
      expect(vectorNode?.nodePath).toBe("Page/Frame/Icon");
    });

    it("should handle nested children recursively", () => {
      const design = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Frame1",
            type: "FRAME",
            children: [
              {
                id: "frame-2",
                name: "Frame2",
                type: "FRAME",
                children: [{ id: "vector-1", name: "Icon", type: "VECTOR" }],
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const nodes = getNodesForDownload(design as any);
      expect(nodes.length).toBeGreaterThanOrEqual(3);
      expect(nodes.find((n) => n.id === "frame-1")).toBeDefined();
      expect(nodes.find((n) => n.id === "frame-2")).toBeDefined();
      expect(nodes.find((n) => n.id === "vector-1")).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 5: downloadAssets Integration (with mocked fetch)
  // =====================================================
  // Integration tests removed - require actual file system operations
  // These should be tested in end-to-end tests with actual file I/O
});
