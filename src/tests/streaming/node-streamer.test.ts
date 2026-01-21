/**
 * Unit tests for NodeStreamer
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import type {
  SimplifiedNode,
  StreamChunk,
  StreamProgress,
} from "@/extractors/types";

import { allExtractors } from "@/extractors";

import { streamNodes } from "@/streaming/node-streamer";
import { ProgressEmitter } from "@/streaming/progress-emitter";

describe("streamNodes", () => {
  let mockProgress: ProgressEmitter;

  beforeEach(() => {
    mockProgress = new ProgressEmitter();
  });

  const createMockNodes = (count: number, withChildren = false): Node[] => {
    return Array.from({ length: count }, (_, i) => {
      const node: Node = {
        id: `${i + 1}:1`,
        name: `Node ${i + 1}`,
        type: "FRAME",
        visible: true,
      } as Node;

      (node as { children?: Node[] }).children = [];

      if (withChildren && i % 2 === 0) {
        (node as { children?: Node[] }).children = [
          {
            id: `${i + 1}:2`,
            name: `Child ${i + 1}`,
            type: "FRAME",
            visible: true,
          } as Node,
        ];
      }

      return node;
    });
  };

  describe("Basic streaming", () => {
    it("should stream nodes in chunks", async () => {
      const nodes = createMockNodes(10);
      const chunks: StreamChunk[] = [];

      const generator = streamNodes(
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

      const generator = streamNodes(
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

      const generator = streamNodes(
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

      const generator = streamNodes(nodes, allExtractors, {}, mockProgress);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });
  });

  describe("Node flattening", () => {
    it("should flatten nested nodes", async () => {
      const nodes = createMockNodes(3, true);
      const allExtracteds: SimplifiedNode[] = [];

      const generator = streamNodes(
        nodes,
        allExtractors,
        { chunkSize: 10 },
        mockProgress
      );

      for await (const chunk of generator) {
        allExtracteds.push(...chunk.nodes);
      }

      // With children, we should have more than 3 extracted nodes
      expect(allExtracteds.length).toBeGreaterThan(3);
    });

    it("should preserve parent-child relationships", async () => {
      const child: Node = {
        id: "2:1",
        name: "Child",
        type: "FRAME",
        visible: true,
      } as Node;

      (child as { children?: Node[] }).children = [];

      const parent: Node = {
        id: "1:1",
        name: "Parent",
        type: "FRAME",
        visible: true,
      } as Node;

      (parent as { children?: Node[] }).children = [child];

      const chunks: StreamChunk[] = [];

      const generator = streamNodes(
        [parent],
        allExtractors,
        { chunkSize: 10 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      const allNodes = chunks.flatMap((c) => c.nodes);

      // Parent should exist
      const parentNode = allNodes.find((n) => n.id === "1:1");
      expect(parentNode).toBeDefined();
      expect(parentNode?.children).toBeDefined();
    });
  });

  describe("Chunk size configuration", () => {
    it("should use default chunk size of 50", async () => {
      const nodes = createMockNodes(150);
      const chunks: StreamChunk[] = [];

      const generator = streamNodes(nodes, allExtractors, {}, mockProgress);

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

      const generator = streamNodes(
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
  });

  describe("Progress tracking", () => {
    it("should emit progress events", async () => {
      const nodes = createMockNodes(10);
      const progressEvents: StreamProgress[] = [];

      mockProgress.on("progress", (p) => progressEvents.push(p));

      const generator = streamNodes(
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

      const generator = streamNodes(
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

  describe("Node filtering", () => {
    it("should filter nodes based on nodeFilter", async () => {
      const nodes = createMockNodes(5);
      nodes[2].visible = false;

      const chunks: StreamChunk[] = [];

      const generator = streamNodes(
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

      const totalNodes = chunks.reduce(
        (sum, chunk) => sum + chunk.nodes.length,
        0
      );
      expect(totalNodes).toBeLessThan(5);
    });
  });

  describe("Max depth", () => {
    it("should respect maxDepth configuration", async () => {
      const childNode: Node = {
        id: "2:1",
        name: "Child",
        type: "FRAME",
        visible: true,
      } as Node;

      (childNode as { children?: Node[] }).children = [];

      const parentNode: Node = {
        id: "1:1",
        name: "Parent",
        type: "FRAME",
        visible: true,
      } as Node;

      (parentNode as { children?: Node[] }).children = [childNode];

      const chunks: StreamChunk[] = [];

      const generator = streamNodes(
        [parentNode],
        allExtractors,
        { chunkSize: 10, maxDepth: 1 },
        mockProgress
      );

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks[0].nodes).toHaveLength(1);
      expect(chunks[0].nodes[0].children).toBeUndefined();
    });
  });

  describe("Async iteration", () => {
    it("should support async iterator protocol", async () => {
      const nodes = createMockNodes(5);

      const generator = streamNodes(
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

      const generator = streamNodes(
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

  describe("Return value", () => {
    it("should return final result with node count", async () => {
      const nodes = createMockNodes(5);

      const generator = streamNodes(
        nodes,
        allExtractors,
        { chunkSize: 2 },
        mockProgress
      );

      for await (const _chunk of generator) {
        // consume chunks
      }

      const result = await generator.next();

      expect(result.done).toBe(true);
      expect(result.value).toBeDefined();

      const finalResult =
        result.value as import("@/streaming/node-streamer").NodeStreamResult;
      expect(finalResult.nodeCount).toBeDefined();
      expect(finalResult.nodeCount).toBeGreaterThanOrEqual(5);
    });
  });
});
