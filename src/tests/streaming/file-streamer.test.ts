/**
 * Unit tests for FileStreamer
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { StreamChunk } from "@/extractors/types";

import { allExtractors } from "@/extractors/built-in";
import type { ExtractorFn } from "@/extractors/types";

import { type FileStreamResult, streamFile } from "@/streaming/file-streamer";
import { ProgressEmitter } from "@/streaming/progress-emitter";

describe("streamFile", () => {
  let mockProgress: ProgressEmitter;

  beforeEach(() => {
    mockProgress = new ProgressEmitter();
  });

  const createMockNodes = (count: number): Node[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i + 1}:1`,
      name: `Node ${i + 1}`,
      type: "FRAME",
      visible: true,
      children: [],
      width: 100,
      height: 100,
    })) as unknown as Node[];
  };

  describe("Basic streaming", () => {
    it("should stream nodes in chunks", async () => {
      const nodes = createMockNodes(10);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 3 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 10 nodes / 3 = 4 chunks (3, 3, 3, 1)
      expect(chunks[0].nodes).toHaveLength(3);
      expect(chunks[3].nodes).toHaveLength(1);
    });

    it("should include chunk index and total", async () => {
      const nodes = createMockNodes(10);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 3 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0].index).toBe(0);
      expect(chunks[0].total).toBe(4);
      expect(chunks[3].index).toBe(3);
    });

    it("should handle single node", async () => {
      const nodes = createMockNodes(1);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 50 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].nodes).toHaveLength(1);
      expect(chunks[0].total).toBe(1);
    });

    it("should handle empty node list", async () => {
      const nodes: Node[] = [];
      const chunks: StreamChunk[] = [];

      const generator = streamFile(nodes, allExtractors, {}, mockProgress);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it("should return final result", async () => {
      const nodes = createMockNodes(5);
      const chunks: StreamChunk[] = [];
      let finalResult: IteratorResult<StreamChunk, FileStreamResult> | null =
        null;

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 2 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      finalResult = await generator.next();

      expect(finalResult.done).toBe(true);
      expect(finalResult.value).toBeDefined();
      if (finalResult.done) {
        expect((finalResult.value as FileStreamResult).nodes).toBeDefined();
        expect((finalResult.value as FileStreamResult).name).toBe(
          "streamed-file"
        );
      }
    });
  });

  describe("Chunk size configuration", () => {
    it("should use default chunk size of 50", async () => {
      const nodes = createMockNodes(150);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(nodes, allExtractors, {}, mockProgress);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3); // 150 / 50 = 3
      chunks.forEach((chunk) => {
        expect(chunk.nodes.length).toBeLessThanOrEqual(50);
      });
    });

    it("should use custom chunk size", async () => {
      const nodes = createMockNodes(100);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 25 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4); // 100 / 25 = 4
    });

    it("should handle chunk size larger than node count", async () => {
      const nodes = createMockNodes(5);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 100 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].nodes).toHaveLength(5);
    });
  });

  describe("Progress tracking", () => {
    it("should emit progress events", async () => {
      const nodes = createMockNodes(10);
      const progressEvents: Array<{
        percent: number;
        processed: number;
        total: number;
      }> = [];

      mockProgress.on("progress", (p) => progressEvents.push(p));

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 2 },
        mockProgress
      );

      for await (const _chunk of generator) {
        // consume chunks
      }

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
    });

    it("should track processed count correctly", async () => {
      const nodes = createMockNodes(20);
      const processedCounts: number[] = [];

      mockProgress.on("progress", (p) => processedCounts.push(p.processed));

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 5 },
        mockProgress
      );

      for await (const _chunk of generator) {
        // consume chunks
      }

      expect(processedCounts).toContain(5);
      expect(processedCounts).toContain(10);
      expect(processedCounts).toContain(15);
      expect(processedCounts).toContain(20);
    });
  });

  describe("Custom extractors", () => {
    it("should use custom extractors", async () => {
      const customExtractor: ExtractorFn = jest.fn(
        (_node, result, _context) => {
          (result as { customData?: string }).customData = "custom";
        }
      );

      const nodes = createMockNodes(3);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        [customExtractor],
        { chunkSize: 10 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(customExtractor).toHaveBeenCalled();
      chunks[0].nodes.forEach((node: unknown) => {
        expect((node as { customData?: string }).customData).toBe("custom");
      });
    });

    it("should handle empty extractors array", async () => {
      const nodes = createMockNodes(3);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(nodes, [], { chunkSize: 10 }, mockProgress);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].nodes).toHaveLength(3);
    });
  });

  describe("Node filtering", () => {
    it("should filter nodes based on nodeFilter", async () => {
      const nodes = createMockNodes(5);
      // Mark the 3rd node as not visible
      nodes[2].visible = false;

      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        {
          chunkSize: 10,
          nodeFilter: (node: Node) => node.visible !== false,
        },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Should have fewer nodes due to filtering
      const totalNodes = chunks.reduce(
        (sum, chunk) => sum + chunk.nodes.length,
        0
      );
      expect(totalNodes).toBeLessThan(5);
    });
  });

  describe("Max depth", () => {
    it("should respect maxDepth configuration", async () => {
      const childNode = {
        id: "2:1",
        name: "Child",
        type: "FRAME",
        visible: true,
        children: [],
        width: 50,
        height: 50,
      } as unknown as Node;

      const parentNode = {
        id: "1:1",
        name: "Parent",
        type: "FRAME",
        visible: true,
        children: [childNode],
        width: 100,
        height: 100,
      } as unknown as Node;

      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        [parentNode],
        allExtractors,
        { chunkSize: 10, maxDepth: 1 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // With maxDepth 1, children should not be processed
      expect(chunks[0].nodes).toHaveLength(1);
      expect(chunks[0].nodes[0].children).toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("should handle errors in extractors gracefully", async () => {
      const errorExtractor: ExtractorFn = jest.fn(() => {
        throw new Error("Extractor error");
      });

      const nodes = createMockNodes(3);

      const generator = streamFile(
        nodes,
        [errorExtractor],
        { chunkSize: 10 },
        mockProgress
      );

      await expect(async () => {
        for await (const _chunk of generator) {
          // consume chunks
        }
      }).rejects.toThrow();
    });
  });

  describe("Async iteration", () => {
    it("should support async iterator protocol", async () => {
      const nodes = createMockNodes(5);

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 2 },
        mockProgress
      );

      expect(typeof generator[Symbol.asyncIterator]).toBe("function");
    });

    it("should allow breaking iteration early", async () => {
      const nodes = createMockNodes(10);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 2 },
        mockProgress
      );

      let count = 0;
      for await (const chunk of generator) {
        chunks.push(chunk);
        count++;
        if (count === 2) break;
      }

      expect(chunks).toHaveLength(2);
    });
  });

  describe("Components and ComponentSets", () => {
    it("should include components when requested", async () => {
      const nodes = createMockNodes(3);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 10, includeComponents: true },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      const result = await generator.next();
      expect(result.done).toBe(true);
      expect((result.value as FileStreamResult).components).toBeDefined();
    });

    it("should include component sets when requested", async () => {
      const nodes = createMockNodes(3);
      const chunks: StreamChunk[] = [];

      const generator = streamFile(
        nodes,
        allExtractors,
        { chunkSize: 10, includeComponentSets: true },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      const result = await generator.next();
      expect(result.done).toBe(true);
      expect((result.value as FileStreamResult).componentSets).toBeDefined();
    });
  });
});
