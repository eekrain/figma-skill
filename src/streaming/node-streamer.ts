/**
 * Node streamer - Stream specific nodes with chunk-based processing
 */
import type { Node } from "@figma/rest-api-spec";

import { extractFromDesign } from "@/extractors/node-walker";
import type {
  ExtractorFn,
  SimplifiedNode,
  TraversalOptions,
} from "@/extractors/types";
import type { StreamChunk } from "@/extractors/types";

import type { ProgressEmitter } from "./progress-emitter";

/**
 * Configuration for node streaming
 */
export interface NodeStreamConfig extends TraversalOptions {
  /** Extractors to apply (default: all from built-in) */
  extractors?: ExtractorFn[];
  /** Number of nodes per chunk (default: 50) */
  chunkSize?: number;
}

/**
 * Result of streaming nodes
 */
export interface NodeStreamResult {
  /** Extracted nodes */
  nodes: SimplifiedNode[];
  /** Global variables */
  globalVars: { styles: Record<string, unknown> };
  /** Total chunks processed */
  totalChunks: number;
  /** Total nodes processed */
  nodeCount: number;
}

/**
 * Node streamer class for chunk-based node processing
 */
export class NodeStreamer {
  private progress: ProgressEmitter;
  private chunkSize: number;
  private config: NodeStreamConfig;

  constructor(progress: ProgressEmitter, config: NodeStreamConfig = {}) {
    this.progress = progress;
    this.chunkSize = config.chunkSize || 50;
    this.config = config;
  }

  /**
   * Stream specific nodes in chunks
   * Returns an async iterator of chunks
   */
  async *streamNodes(
    nodes: Node[],
    extractors: ExtractorFn[]
  ): AsyncGenerator<StreamChunk, NodeStreamResult, unknown> {
    // Count total nodes for progress tracking
    const totalCount = this.countNodes(nodes);
    this.progress.start(totalCount, "extracting");

    let processedCount = 0;
    let chunkIndex = 0;

    try {
      // Extract all nodes using the extraction pipeline
      const { nodes: extractedNodes, globalVars } = extractFromDesign(
        nodes,
        extractors,
        {
          maxDepth: this.config.maxDepth,
          nodeFilter: this.config.nodeFilter,
          afterChildren: this.config.afterChildren,
        },
        { styles: {} }
      );

      // Calculate total chunks
      const totalChunks = Math.ceil(extractedNodes.length / this.chunkSize);
      this.progress.setOperation("chunking");

      // Flatten the node tree for streaming
      const flatNodes = this.flattenNodes(extractedNodes);

      // Yield chunks
      for (let i = 0; i < flatNodes.length; i += this.chunkSize) {
        const chunk = flatNodes.slice(i, i + this.chunkSize);

        const streamChunk: StreamChunk = {
          nodes: chunk,
          index: chunkIndex,
          total: totalChunks,
        };

        processedCount += chunk.length;
        this.progress.setProcessed(processedCount);

        yield streamChunk;
        chunkIndex++;
      }

      // Return final result
      this.progress.complete();

      return {
        nodes: extractedNodes,
        globalVars,
        totalChunks: chunkIndex,
        nodeCount: flatNodes.length,
      };
    } catch (error) {
      this.progress.error(error as Error);
      throw error;
    }
  }

  /**
   * Count total nodes (including nested children)
   */
  private countNodes(nodes: Node[]): number {
    let count = 0;

    for (const node of nodes) {
      count++;
      const children = (node as { children?: Node[] }).children;
      if (children && children.length > 0) {
        count += this.countNodes(children);
      }
    }

    return count;
  }

  /**
   * Flatten node tree into a single array
   */
  private flattenNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
    const result: SimplifiedNode[] = [];

    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        result.push(...this.flattenNodes(node.children));
      }
    }

    return result;
  }
}

/**
 * Stream specific nodes with chunk-based processing
 *
 * @param nodes - Nodes to stream
 * @param extractors - Extractors to apply
 * @param config - Streaming configuration
 * @param progress - Progress emitter for event updates
 * @returns Async iterator of chunks
 */
export async function* streamNodes(
  nodes: Node[],
  extractors: ExtractorFn[],
  config: NodeStreamConfig = {},
  progress: ProgressEmitter
): AsyncGenerator<StreamChunk, NodeStreamResult, unknown> {
  const streamer = new NodeStreamer(progress, config);
  const generator = streamer.streamNodes(nodes, extractors);

  let result: IteratorResult<StreamChunk, NodeStreamResult>;

  while (!(result = await generator.next()).done) {
    yield result.value;
  }

  // Return the final result from the generator
  return result.value;
}
