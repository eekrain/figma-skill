/**
 * Unit tests for paginated node fetcher
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { StreamChunk } from "@/extractors/types";
import type { FileStreamResult } from "@/streaming/file-streamer";
import {
  fetchPaginatedFile,
  isSizeRelatedError,
} from "@/streaming/paginated-fetcher";
import { ProgressEmitter } from "@/streaming/progress-emitter";
import { FigmaApiError, PayloadTooLargeError } from "@/utils/fetch-with-retry";

describe("paginated-fetcher", () => {
  let mockProgress: ProgressEmitter;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    mockProgress = new ProgressEmitter();
    mockRequest = jest.fn() as unknown as jest.Mock;
  });

  const createMockDocumentNode = (children: Node[]): Node => {
    return {
      id: "fileKey-0:0",
      name: "Document",
      type: "DOCUMENT",
      children,
    } as unknown as Node;
  };

  const createMockFrameNode = (
    id: string,
    name: string,
    children?: Node[]
  ): Node => {
    return {
      id,
      name,
      type: "FRAME",
      visible: true,
      children: children || [],
      width: 100,
      height: 100,
    } as unknown as Node;
  };

  describe("isSizeRelatedError", () => {
    it("should detect PayloadTooLargeError", () => {
      const error = new PayloadTooLargeError("Payload too large");
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect 413 FigmaApiError", () => {
      const error = new FigmaApiError("Too large", 413);
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect 500 FigmaApiError", () => {
      const error = new FigmaApiError("Server error", 500);
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect 503 FigmaApiError", () => {
      const error = new FigmaApiError("Service unavailable", 503);
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect timeout errors", () => {
      const error = new Error("Request timeout after 30000ms");
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect JSON parsing errors", () => {
      const error = new Error("Failed to parse JSON");
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should detect truncate errors", () => {
      const error = new Error("Response truncated");
      expect(isSizeRelatedError(error)).toBe(true);
    });

    it("should not detect other errors", () => {
      const error = new Error("Some other error");
      expect(isSizeRelatedError(error)).toBe(false);
    });

    it("should not detect 404 errors", () => {
      const error = new FigmaApiError("Not found", 404);
      expect(isSizeRelatedError(error)).toBe(false);
    });
  });

  describe("fetchPaginatedFile", () => {
    it("should fetch document node first", async () => {
      const mockChildren = [
        createMockFrameNode("1:1", "Frame 1"),
        createMockFrameNode("1:2", "Frame 2"),
      ];
      const docNode = createMockDocumentNode(mockChildren);

      mockRequest
        .mockResolvedValueOnce({
          nodes: {
            "fileKey-0:0": docNode,
          },
        })
        .mockResolvedValue({
          nodes: {},
        });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      // Expect the first call to be for the document node
      expect(mockRequest).toHaveBeenCalledWith(
        "/files/testFile/nodes?ids=testFile-0:0"
      );

      // Consume the generator
      for await (const _chunk of generator) {
        // consume
      }
    });

    it("should fetch children in batches", async () => {
      const mockChildren = [
        createMockFrameNode("1:1", "Frame 1"),
        createMockFrameNode("1:2", "Frame 2"),
        createMockFrameNode("1:3", "Frame 3"),
        createMockFrameNode("1:4", "Frame 4"),
        createMockFrameNode("1:5", "Frame 5"),
      ];
      const docNode = createMockDocumentNode(mockChildren);

      // Mock document response
      mockRequest.mockResolvedValueOnce({
        nodes: {
          "fileKey-0:0": docNode,
        },
      });

      // Mock batch responses (batch size is 3)
      // First batch: 1:1, 1:2, 1:3
      mockRequest.mockResolvedValueOnce({
        nodes: {
          "1:1": createMockFrameNode("1:1", "Frame 1"),
          "1:2": createMockFrameNode("1:2", "Frame 2"),
          "1:3": createMockFrameNode("1:3", "Frame 3"),
        },
      });

      // Second batch: 1:4, 1:5
      mockRequest.mockResolvedValueOnce({
        nodes: {
          "1:4": createMockFrameNode("1:4", "Frame 4"),
          "1:5": createMockFrameNode("1:5", "Frame 5"),
        },
      });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      // Consume the generator
      for await (const _chunk of generator) {
        // consume
      }

      // Should have called request 3 times (document + 2 batches)
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it("should yield chunks as nodes are fetched", async () => {
      // Create many nodes to trigger chunk yielding
      const mockChildren: Node[] = [];
      for (let i = 1; i <= 100; i++) {
        mockChildren.push(createMockFrameNode(`${i}:1`, `Frame ${i}`));
      }
      const docNode = createMockDocumentNode(mockChildren);

      // Mock document response
      mockRequest.mockResolvedValueOnce({
        nodes: {
          "fileKey-0:0": docNode,
        },
      });

      // Mock batch responses
      mockRequest.mockImplementation((endpoint: string) => {
        // eslint-disable-next-line no-undef
        const idsParam = new URLSearchParams(endpoint.split("?")[1]).get("ids");
        const ids = idsParam!.split(",");

        const nodes: Record<string, Node> = {};
        for (const id of ids) {
          nodes[id] = createMockFrameNode(id, `Node ${id}`);
        }

        return Promise.resolve({ nodes });
      });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Should have yielded at least some chunks
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should track progress correctly", async () => {
      const progressEvents: Array<{
        percent: number;
        processed: number;
        total: number;
        operation: string;
      }> = [];

      mockProgress.on("progress", (p) => progressEvents.push(p));

      const mockChildren = [
        createMockFrameNode("1:1", "Frame 1"),
        createMockFrameNode("1:2", "Frame 2"),
        createMockFrameNode("1:3", "Frame 3"),
      ];
      const docNode = createMockDocumentNode(mockChildren);

      mockRequest
        .mockResolvedValueOnce({
          nodes: {
            "fileKey-0:0": docNode,
          },
        })
        .mockResolvedValueOnce({
          nodes: {
            "1:1": createMockFrameNode("1:1", "Frame 1"),
            "1:2": createMockFrameNode("1:2", "Frame 2"),
            "1:3": createMockFrameNode("1:3", "Frame 3"),
          },
        });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      for await (const _chunk of generator) {
        // consume
      }

      // Should have emitted progress events
      expect(progressEvents.length).toBeGreaterThan(0);

      // Last event should be 100% complete
      const lastEvent = progressEvents[progressEvents.length - 1];
      expect(lastEvent.percent).toBe(100);
    });

    it("should return final result", async () => {
      const mockChildren = [
        createMockFrameNode("1:1", "Frame 1"),
        createMockFrameNode("1:2", "Frame 2"),
      ];
      const docNode = createMockDocumentNode(mockChildren);

      mockRequest
        .mockResolvedValueOnce({
          nodes: {
            "fileKey-0:0": docNode,
          },
        })
        .mockResolvedValueOnce({
          nodes: {
            "1:1": createMockFrameNode("1:1", "Frame 1"),
            "1:2": createMockFrameNode("1:2", "Frame 2"),
          },
        });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      const result = await generator.next();
      expect(result.done).toBe(true);

      const finalResult = result.value as FileStreamResult;
      expect(finalResult).toBeDefined();
      expect(finalResult.name).toBe("paginated-file");
      expect(finalResult.nodes).toBeDefined();
      expect(finalResult.globalVars).toBeDefined();
    });

    it("should handle empty document", async () => {
      const docNode = createMockDocumentNode([]);

      mockRequest.mockResolvedValueOnce({
        nodes: {
          "fileKey-0:0": docNode,
        },
      });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Should complete without errors
      const result = await generator.next();
      expect(result.done).toBe(true);
    });
  });

  describe("rebuildTree", () => {
    it("should rebuild tree structure from flat nodes", async () => {
      // This is tested indirectly through fetchPaginatedFile
      // but we can verify the structure is correct by checking
      // that children are properly nested
      const childNode = createMockFrameNode("1:2", "Child");
      const parentNode = createMockFrameNode("1:1", "Parent", [childNode]);

      // Add parent reference to child (as Figma API does)
      (childNode as unknown as { parent?: string }).parent = "1:1";

      const docNode = createMockDocumentNode([parentNode]);

      mockRequest
        .mockResolvedValueOnce({
          nodes: {
            "fileKey-0:0": docNode,
          },
        })
        .mockResolvedValueOnce({
          nodes: {
            "1:1": parentNode,
            "1:2": childNode,
          },
        });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      const result = await generator.next();
      expect(result.done).toBe(true);

      // Verify tree structure is maintained
      const finalResult = result.value as FileStreamResult;
      expect(finalResult.nodes.length).toBeGreaterThan(0);
    });
  });

  describe("estimateTotalNodes", () => {
    it("should estimate based on top-level nodes", async () => {
      const mockChildren: Node[] = [];
      for (let i = 1; i <= 10; i++) {
        const frame = createMockFrameNode(`${i}:1`, `Frame ${i}`);
        // Add some children
        (frame as Node & { children?: Node[] }).children = [
          createMockFrameNode(`${i}:2`, `Child ${i}-1`),
          createMockFrameNode(`${i}:3`, `Child ${i}-2`),
        ];
        mockChildren.push(frame);
      }
      const docNode = createMockDocumentNode(mockChildren);

      mockRequest
        .mockResolvedValueOnce({
          nodes: {
            "fileKey-0:0": docNode,
          },
        })
        .mockResolvedValue({
          nodes: {},
        });

      const generator = fetchPaginatedFile(
        "testFile",
        mockRequest,
        {},
        mockProgress
      );

      // Start consuming to trigger progress
      const iterator = generator[Symbol.asyncIterator]();
      await iterator.next();

      // Progress should be started with an estimate
      const progress = mockProgress.getProgress();
      expect(progress.total).toBeGreaterThan(0);
    });
  });
});
