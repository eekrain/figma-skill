/**
 * Tests for client/index module
 *
 * Tests FigmaExtractor class for the main Figma client API.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { FigmaExtractor } from "@/client/index";

// Mock dependencies
jest.mock("@/extractors/built-in", () => ({
  allExtractors: [],
}));

jest.mock("@/extractors/node-walker", () => ({
  extractFromDesign: jest.fn(() => ({
    nodes: [
      {
        id: "node-1",
        name: "Test Node",
        type: "FRAME",
      },
    ],
    globalVars: { styles: {} },
  })),
}));

jest.mock("@/images/downloader", () => ({
  downloadImages: jest.fn(),
}));

jest.mock("@/streaming/file-streamer", () => ({
  streamFile: jest.fn(),
}));

jest.mock("@/streaming/node-streamer", () => ({
  streamNodes: jest.fn(),
}));

jest.mock("@/streaming/progress-emitter", () => ({
  ProgressEmitter: jest.fn(() => ({
    emit: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock("@/transformers/component", () => ({
  simplifyComponents: jest.fn((components: unknown) => components),
  simplifyComponentSets: jest.fn((sets: unknown) => sets),
}));

jest.mock("@/transformers/toon", () => ({
  toToon: jest.fn((design: unknown) => design),
  toToonLines: jest.fn(() => ["line1", "line2"]),
}));

jest.mock("@/utils/cache", () => ({
  FigmaCache: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(async (_key: unknown, fn: () => unknown) => await fn()),
    getStats: jest.fn(() => ({ size: 0, maxSize: 100, pending: 0 })),
    clear: jest.fn(),
  })),
}));

jest.mock("@/utils/fetch-with-retry", () => ({
  AuthenticationError: class extends Error {},
  FigmaApiError: class extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
    }
  },
  PayloadTooLargeError: class extends Error {},
  fetchWithRetry: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  setLogLevel: jest.fn(),
}));

jest.mock("@/utils/node-id", () => ({
  validateNodeId: jest.fn(() => ({ valid: true, normalized: "normalized-id" })),
}));

jest.mock("@/utils/rate-limiter", () => ({
  RateLimiter: jest.fn(() => ({
    execute: jest.fn((fn: () => unknown) => fn()),
    getStats: jest.fn(() => ({
      concurrent: 1,
      maxConcurrent: 10,
      queued: 0,
    })),
  })),
}));

jest.mock("./variables", () => ({
  mergeVariables: jest.fn(
    (_design: unknown, variables: unknown) =>
      variables || { byName: {}, byCollection: {} }
  ),
}));

jest.mock("./get-file-batch", () => ({
  calculateParallelism: jest.fn(() => 3),
  createBatchPlan: jest.fn(() => ({
    batchCount: 1,
    totalNodes: 3,
    batches: [["id1", "id2", "id3"]],
  })),
  generateBatchId: jest.fn(() => "batch-id"),
  mergeGetFileOptions: jest.fn((a: unknown, b: unknown) => ({ ...a, ...b })),
  prepareNodeIds: jest.fn((ids: unknown) => ids),
}));

describe("client/index", () => {
  let mockClient: FigmaExtractor;
  let mockConfig: any;
  let mockFetchWithRetry: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked fetchWithRetry
    const { fetchWithRetry } = require("@/utils/fetch-with-retry");
    mockFetchWithRetry = fetchWithRetry as jest.Mock;

    // Default mock for successful API responses
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: "Test File",
        document: {
          type: "DOCUMENT",
          id: "doc-1",
          children: [
            {
              id: "page-1",
              name: "Page 1",
              type: "PAGE",
              children: [
                {
                  id: "node-1",
                  name: "Test Frame",
                  type: "FRAME",
                  visible: true,
                },
              ],
            },
          ],
        },
        components: {},
        componentSets: {},
        styles: {},
      }),
    });

    mockConfig = {
      token: "test-token",
      baseUrl: "https://api.figma.com/v1",
      timeout: 30000,
      maxRetries: 3,
      cache: true,
      cacheSize: 100,
      concurrent: 10,
    };

    mockClient = new FigmaExtractor(mockConfig);
  });

  // =====================================================
  // Test Suite 1: Constructor
  // =====================================================
  describe("constructor", () => {
    it("should initialize with default config", () => {
      const client = new FigmaExtractor({ token: "test-token" });

      expect(client).toBeInstanceOf(FigmaExtractor);
    });

    it("should initialize with custom config", () => {
      const client = new FigmaExtractor({
        token: "custom-token",
        baseUrl: "https://custom.api.com",
        timeout: 60000,
        maxRetries: 5,
        cache: false,
        concurrent: 20,
      });

      expect(client).toBeInstanceOf(FigmaExtractor);
    });

    it("should not initialize cache when disabled", () => {
      const { FigmaCache } = require("@/utils/cache");
      jest.clearAllMocks();

      new FigmaExtractor({ token: "test-token", cache: false });

      expect(FigmaCache).not.toHaveBeenCalled();
    });

    it("should initialize rate limiter with concurrent value", () => {
      const { RateLimiter } = require("@/utils/rate-limiter");

      new FigmaExtractor({ token: "test-token", concurrent: 15 });

      expect(RateLimiter).toHaveBeenCalledWith(15);
    });
  });

  // =====================================================
  // Test Suite 2: setLogLevel
  // =====================================================
  describe("setLogLevel", () => {
    it("should set log level to debug", () => {
      const { setLogLevel } = require("@/utils/logger");

      mockClient.setLogLevel("debug");

      expect(setLogLevel).toHaveBeenCalledWith(0);
    });

    it("should set log level to info", () => {
      const { setLogLevel } = require("@/utils/logger");

      mockClient.setLogLevel("info");

      expect(setLogLevel).toHaveBeenCalledWith(1);
    });

    it("should set log level to warn", () => {
      const { setLogLevel } = require("@/utils/logger");

      mockClient.setLogLevel("warn");

      expect(setLogLevel).toHaveBeenCalledWith(2);
    });

    it("should set log level to error", () => {
      const { setLogLevel } = require("@/utils/logger");

      mockClient.setLogLevel("error");

      expect(setLogLevel).toHaveBeenCalledWith(3);
    });

    it("should set log level to silent", () => {
      const { setLogLevel } = require("@/utils/logger");

      mockClient.setLogLevel("silent");

      expect(setLogLevel).toHaveBeenCalledWith(4);
    });
  });

  // =====================================================
  // Test Suite 3: Cache Methods
  // =====================================================
  describe("cache methods", () => {
    it("should get cache stats when cache is enabled", () => {
      const stats = mockClient.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats).toEqual({ size: 0, maxSize: 100, pending: 0 });
    });

    it("should return null cache stats when cache is disabled", () => {
      const client = new FigmaExtractor({ token: "test-token", cache: false });

      const stats = client.getCacheStats();

      expect(stats).toBeNull();
    });

    it("should clear cache", () => {
      const { info } = require("@/utils/logger");

      mockClient.clearCache();

      expect(info).toHaveBeenCalledWith("Cache cleared");
    });
  });

  // =====================================================
  // Test Suite 4: Rate Limiter Methods
  // =====================================================
  describe("rate limiter methods", () => {
    it("should get rate limiter stats", () => {
      const stats = mockClient.getRateLimiterStats();

      expect(stats).toBeDefined();
      expect(stats).toEqual({
        concurrent: 1,
        maxConcurrent: 10,
        queued: 0,
      });
    });
  });

  // =====================================================
  // Test Suite 5: getFile - Standard
  // =====================================================
  describe("getFile - standard mode", () => {
    it("should fetch file without options", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [
              {
                id: "page-1",
                type: "PAGE",
                visible: true,
                children: [],
              },
            ],
          },
          components: {},
          componentSets: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123");

      expect(result).toBeDefined();
      if (typeof result !== "string") {
        expect(result.name).toBe("Test File");
      }
    });

    it("should use cache when fetching file", async () => {
      await mockClient.getFile("file-key-123");

      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        "https://api.figma.com/v1/files/file-key-123",
        expect.objectContaining({
          headers: {
            "X-Figma-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle authentication errors", async () => {
      const { AuthenticationError } = require("@/utils/fetch-with-retry");

      mockFetchWithRetry.mockResolvedValue({
        status: 401,
        json: async () => ({ err: "Unauthorized" }),
      });

      await expect(mockClient.getFile("file-key-123")).rejects.toThrow(
        AuthenticationError
      );
    });

    it("should handle 403 errors", async () => {
      const { AuthenticationError } = require("@/utils/fetch-with-retry");

      mockFetchWithRetry.mockResolvedValue({
        status: 403,
        json: async () => ({ err: "Forbidden" }),
      });

      await expect(mockClient.getFile("file-key-123")).rejects.toThrow(
        AuthenticationError
      );
    });

    it("should handle JSON parse errors for large responses", async () => {
      const { FigmaApiError } = require("@/utils/fetch-with-retry");

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      });

      await expect(mockClient.getFile("file-key-123")).rejects.toThrow(
        FigmaApiError
      );
    });
  });

  // =====================================================
  // Test Suite 6: getFile - By Node ID
  // =====================================================
  describe("getFile - by nodeId", () => {
    it("should fetch specific node by nodeId", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          nodes: {
            "node-id-123": {
              document: {
                id: "node-id-123",
                name: "Test Node",
                type: "FRAME",
                visible: true,
              },
            },
          },
          styles: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123", {
        nodeId: "node-id-123",
      });

      expect(result).toBeDefined();
      if (typeof result !== "string") {
        expect(result.name).toBe("Test File");
      }
    });

    it("should validate nodeId before fetching", async () => {
      const { validateNodeId } = require("@/utils/node-id");

      await mockClient.getFile("file-key-123", {
        nodeId: "invalid-id",
      });

      expect(validateNodeId).toHaveBeenCalledWith(
        "invalid-id",
        expect.any(Object)
      );
    });

    it("should handle invalid nodeId format", async () => {
      const { validateNodeId } = require("@/utils/node-id");
      (validateNodeId as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid format",
      });

      await expect(
        mockClient.getFile("file-key-123", { nodeId: "invalid-id" })
      ).rejects.toThrow("Invalid format");
    });
  });

  // =====================================================
  // Test Suite 7: getFile - Batched
  // =====================================================
  describe("getFile - batched with nodeIds", () => {
    it("should fetch multiple nodes with nodeIds option", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          nodes: {
            "node-1": {
              document: {
                id: "node-1",
                name: "Node 1",
                type: "FRAME",
                visible: true,
              },
            },
            "node-2": {
              document: {
                id: "node-2",
                name: "Node 2",
                type: "FRAME",
                visible: true,
              },
            },
            "node-3": {
              document: {
                id: "node-3",
                name: "Node 3",
                type: "FRAME",
                visible: true,
              },
            },
          },
          styles: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123", {
        nodeIds: ["node-1", "node-2", "node-3"],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("should handle empty nodeIds array", async () => {
      const result = await mockClient.getFile("file-key-123", {
        nodeIds: [],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // =====================================================
  // Test Suite 8: getFile - Toon Format
  // =====================================================
  describe("getFile - toon format", () => {
    it("should return toon format when format option is 'toon'", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [
              {
                id: "page-1",
                type: "PAGE",
                visible: true,
                children: [],
              },
            ],
          },
          components: {},
          componentSets: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123", {
        format: "toon",
      });

      expect(result).toBeDefined();
    });

    it("should pass compress option to toToon", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [
              {
                id: "page-1",
                type: "PAGE",
                visible: true,
                children: [],
              },
            ],
          },
          components: {},
          componentSets: {},
        }),
      });

      await mockClient.getFile("file-key-123", {
        format: "toon",
        compress: true,
      });

      const { toToon } = require("@/transformers/toon");
      expect(toToon).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ compress: true })
      );
    });
  });

  // =====================================================
  // Test Suite 9: getNodes
  // =====================================================
  describe("getNodes", () => {
    it("should fetch specific nodes by IDs", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          nodes: {
            "node-1": {
              document: {
                id: "node-1",
                name: "Node 1",
                type: "FRAME",
                visible: true,
              },
            },
            "node-2": {
              document: {
                id: "node-2",
                name: "Node 2",
                type: "FRAME",
                visible: true,
              },
            },
          },
          styles: {},
        }),
      });

      const result = await mockClient.getNodes("file-key-123", {
        ids: ["node-1", "node-2"],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Test File");
      expect(result.nodes).toBeDefined();
    });

    it("should join IDs with comma for API request", async () => {
      await mockClient.getNodes("file-key-123", {
        ids: ["node-1", "node-2", "node-3"],
      });

      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("ids=node-1%2Cnode-2%2Cnode-3"),
        expect.any(Object)
      );
    });
  });

  // =====================================================
  // Test Suite 10: getImageUrls
  // =====================================================
  describe("getImageUrls", () => {
    it("should get image URLs for nodes", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          "node-1": "https://example.com/image1.png",
          "node-2": "https://example.com/image2.png",
        }),
      });

      const result = await mockClient.getImageUrls("file-key-123", {
        ids: ["node-1", "node-2"],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "node-1",
        url: "https://example.com/image1.png",
      });
    });

    it("should use default format (png) when not specified", async () => {
      await mockClient.getImageUrls("file-key-123", {
        ids: ["node-1"],
      });

      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("format=png"),
        expect.any(Object)
      );
    });

    it("should use specified format", async () => {
      await mockClient.getImageUrls("file-key-123", {
        ids: ["node-1"],
        format: "svg",
      });

      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("format=svg"),
        expect.any(Object)
      );
    });

    it("should use specified scale", async () => {
      await mockClient.getImageUrls("file-key-123", {
        ids: ["node-1"],
        scale: 2,
      });

      expect(mockFetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining("scale=2"),
        expect.any(Object)
      );
    });
  });

  // =====================================================
  // Test Suite 11: downloadImages
  // =====================================================
  describe("downloadImages", () => {
    it("should download images for nodes", async () => {
      const { downloadImages } = require("@/images/downloader");
      (downloadImages as jest.Mock).mockResolvedValue([
        {
          id: "node-1",
          path: "/output/image1.png",
          success: true,
          width: 100,
          height: 100,
        },
      ]);

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          images: {
            node1: "https://example.com/image1.png",
            node2: "https://example.com/image2.png",
          },
        }),
      });

      const result = await mockClient.downloadImages("file-key-123", {
        ids: ["node1", "node2"],
        outputDir: "/output",
      });

      expect(result).toHaveLength(2);
      expect(downloadImages).toHaveBeenCalled();
    });

    it("should use default parallel value of 5", async () => {
      const { downloadImages } = require("@/images/downloader");
      (downloadImages as jest.Mock).mockResolvedValue([]);

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          images: { node1: "https://example.com/image1.png" },
        }),
      });

      await mockClient.downloadImages("file-key-123", {
        ids: ["node1"],
        outputDir: "/output",
      });

      expect(downloadImages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ parallel: 5 })
      );
    });

    it("should use custom parallel value", async () => {
      const { downloadImages } = require("@/images/downloader");
      (downloadImages as jest.Mock).mockResolvedValue([]);

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          images: { node1: "https://example.com/image1.png" },
        }),
      });

      await mockClient.downloadImages("file-key-123", {
        ids: ["node1"],
        outputDir: "/output",
        parallel: 10,
      });

      expect(downloadImages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ parallel: 10 })
      );
    });
  });

  // =====================================================
  // Test Suite 12: getComponents and getComponentSets
  // =====================================================
  describe("getComponents and getComponentSets", () => {
    it("should get components from file", async () => {
      const mockComponents = {
        "comp-1": { key: "comp-1-key", id: "comp-1", name: "Button" },
        "comp-2": { key: "comp-2-key", id: "comp-2", name: "Input" },
      };

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => mockComponents,
      });

      const result = await mockClient.getComponents("file-key-123");

      expect(result).toBeDefined();
    });

    it("should get component sets from file", async () => {
      const mockComponentSets = {
        "set-1": { key: "set-1-key", id: "set-1", name: "Buttons" },
      };

      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => mockComponentSets,
      });

      const result = await mockClient.getComponentSets("file-key-123");

      expect(result).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 13: getFileStream
  // =====================================================
  describe("getFileStream", () => {
    it("should return async iterable of toon lines", async () => {
      const stream = await mockClient.getFileStream("file-key-123");

      expect(stream).toBeDefined();

      const lines = [];
      for await (const line of stream) {
        lines.push(line);
      }

      expect(lines).toEqual(["line1", "line2"]);
    });

    it("should pass compress option to toToonLines", async () => {
      await mockClient.getFileStream("file-key-123", { compress: true });

      const { toToonLines } = require("@/transformers/toon");
      expect(toToonLines).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ compress: true })
      );
    });
  });

  // =====================================================
  // Test Suite 14: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should accept FigmaExtractorConfig", () => {
      const config = {
        token: "test-token",
        baseUrl: "https://api.figma.com/v1",
        timeout: 30000,
        maxRetries: 3,
        cache: true,
        cacheSize: 100,
        concurrent: 10,
      };

      const client = new FigmaExtractor(config);

      expect(client).toBeInstanceOf(FigmaExtractor);
    });

    it("should return SimplifiedDesign from getFile", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Test File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [
              {
                id: "page-1",
                type: "PAGE",
                visible: true,
                children: [],
              },
            ],
          },
          components: {},
          componentSets: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123");

      if (typeof result !== "string") {
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("nodes");
        expect(result).toHaveProperty("components");
        expect(result).toHaveProperty("componentSets");
      }
    });
  });

  // =====================================================
  // Test Suite 15: Edge Cases
  // =====================================================
  describe("edge cases", () => {
    it("should handle empty document children", async () => {
      mockFetchWithRetry.mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Empty File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [],
          },
          components: {},
          componentSets: {},
        }),
      });

      const result = await mockClient.getFile("file-key-123");

      if (typeof result !== "string") {
        expect(result.name).toBe("Empty File");
        expect(result.nodes).toEqual([]);
      }
    });

    it("should handle missing optional properties", async () => {
      // Use fetchWithRetry directly to bypass type issues
      const { fetchWithRetry } = require("@/utils/fetch-with-retry");
      (fetchWithRetry as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({
          name: "Minimal File",
          document: {
            type: "DOCUMENT",
            id: "doc-1",
            children: [
              {
                id: "page-1",
                type: "PAGE",
                visible: true,
                children: [],
              },
            ],
          },
        }),
      });

      const result = await mockClient.getFile("file-key-123");

      if (typeof result !== "string" && !Array.isArray(result)) {
        expect(result.name).toBe("Minimal File");
        expect(result.components).toEqual({});
        expect(result.componentSets).toEqual({});
      }
    });
  });
});
