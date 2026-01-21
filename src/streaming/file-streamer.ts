/**
 * File streamer - Stream file contents with chunk-based processing
 */
import type { Node } from "@figma/rest-api-spec";

import { extractFromDesign } from "@/extractors/node-walker";
import type {
  ExtractorFn,
  SimplifiedDesign,
  SimplifiedNode,
  TraversalOptions,
} from "@/extractors/types";
import type { StreamChunk } from "@/extractors/types";

import type { ProgressEmitter } from "./progress-emitter";

/**
 * Configuration for file streaming
 */
export interface FileStreamConfig extends TraversalOptions {
  /** Extractors to apply (default: all from built-in) */
  extractors?: ExtractorFn[];
  /** Number of nodes per chunk (default: 50) */
  chunkSize?: number;
  /** Include components (default: true) */
  includeComponents?: boolean;
  /** Include component sets (default: true) */
  includeComponentSets?: boolean;
}

/**
 * Result of streaming a file
 */
export interface FileStreamResult extends SimplifiedDesign {
  /** Total chunks processed */
  totalChunks: number;
}

/**
 * File streamer class for chunk-based file processing
 */
export class FileStreamer {
  private progress: ProgressEmitter;
  private chunkSize: number;
  private config: FileStreamConfig;

  constructor(progress: ProgressEmitter, config: FileStreamConfig = {}) {
    this.progress = progress;
    this.chunkSize = config.chunkSize || 50;
    this.config = config;
  }

  /**
   * Stream nodes from a Figma file in chunks
   * Returns an async iterator of chunks
   */
  async *streamNodes(
    nodes: Node[],
    extractors: ExtractorFn[]
  ): AsyncGenerator<StreamChunk, FileStreamResult, unknown> {
    // Count total nodes for progress tracking
    const totalCount = this.countNodes(nodes);
    this.progress.start(totalCount, "extracting");

    let processedCount = 0;
    let chunkIndex = 0;
    const allChunks: SimplifiedNode[][] = [];

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

      // Yield chunks
      for (let i = 0; i < extractedNodes.length; i += this.chunkSize) {
        const chunk = extractedNodes.slice(i, i + this.chunkSize);
        allChunks.push(chunk);

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
        name: "streamed-file",
        nodes: extractedNodes,
        components: {},
        componentSets: {},
        globalVars,
        totalChunks: chunkIndex,
      } as FileStreamResult;
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
}

/**
 * Stream a Figma file with chunk-based processing
 *
 * @param nodes - Root nodes to stream
 * @param extractors - Extractors to apply
 * @param config - Streaming configuration
 * @param progress - Progress emitter for event updates
 * @returns Async iterator of chunks
 */
export async function* streamFile(
  nodes: Node[],
  extractors: ExtractorFn[],
  config: FileStreamConfig = {},
  progress: ProgressEmitter
): AsyncGenerator<StreamChunk, FileStreamResult, unknown> {
  const streamer = new FileStreamer(progress, config);
  return yield* streamer.streamNodes(nodes, extractors);
}
