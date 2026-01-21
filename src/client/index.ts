/**
 * FigmaExtractor - Main client class for figma-skill
 */
import type { Component, ComponentSet, Node } from "@figma/rest-api-spec";

import { allExtractors } from "@/extractors/built-in";
import { extractFromDesign } from "@/extractors/node-walker";
import type {
  DownloadImagesOptions,
  DownloadedImageResult,
  FigmaExtractorConfig,
  GetFileOptions,
  GetImageUrlsOptions,
  GetNodesOptions,
  ImageUrlResult,
  SimplifiedDesign,
  SimplifiedNode,
  StreamChunk,
} from "@/extractors/types";
import { downloadImages as downloadImagesUtil } from "@/images/downloader";
import type {
  FileStreamConfig,
  FileStreamResult,
} from "@/streaming/file-streamer";
import { streamFile } from "@/streaming/file-streamer";
import { streamNodes as streamNodesUtil } from "@/streaming/node-streamer";
import type {
  NodeStreamConfig,
  NodeStreamResult,
} from "@/streaming/node-streamer";
import { ProgressEmitter } from "@/streaming/progress-emitter";
import {
  simplifyComponentSets,
  simplifyComponents,
} from "@/transformers/component";
import { toToon } from "@/transformers/toon";
import { FigmaCache } from "@/utils/cache";
import {
  AuthenticationError,
  FigmaApiError,
  PayloadTooLargeError,
  fetchWithRetry,
} from "@/utils/fetch-with-retry";
import { debug, info, setLogLevel } from "@/utils/logger";
import { validateNodeId } from "@/utils/node-id";
import { RateLimiter } from "@/utils/rate-limiter";

export class FigmaExtractor {
  private token: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private cache: FigmaCache | null;
  private rateLimiter: RateLimiter;

  constructor(config: FigmaExtractorConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || "https://api.figma.com/v1";
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries ?? 3;

    // Initialize cache
    if (config.cache !== false) {
      this.cache = new FigmaCache(config.cacheSize || 100);
    } else {
      this.cache = null;
    }

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(config.concurrent || 10);

    debug("FigmaExtractor initialized", {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      cacheEnabled: this.cache !== null,
      concurrent: config.concurrent || 10,
    });
  }

  /**
   * Set the log level
   */
  setLogLevel(level: "debug" | "info" | "warn" | "error" | "silent"): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
    setLogLevel(levels[level]);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; pending: number } | null {
    if (!this.cache) {
      return null;
    }
    return this.cache.getStats();
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(): {
    concurrent: number;
    maxConcurrent: number;
    queued: number;
  } {
    return this.rateLimiter.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache?.clear();
    info("Cache cleared");
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      cacheKey?: string[];
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Check cache if enabled
    if (this.cache && options?.cacheKey) {
      const cached = this.cache.get<T>(options.cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Execute with rate limiting
    const executeRequest = async (): Promise<T> => {
      const response = await fetchWithRetry(url, {
        method: options?.method || "GET",
        headers: {
          "X-Figma-Token": this.token,
          "Content-Type": "application/json",
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        maxRetries: this.maxRetries,
        timeout: this.timeout,
      });

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(
          "Invalid Figma token. Please check your credentials."
        );
      }

      // Parse JSON with error handling for malformed responses (can indicate size issues)
      let data: T;
      try {
        data = (await response.json()) as T;
      } catch (error) {
        if (error instanceof Error) {
          // JSON parsing errors can indicate truncated responses due to size
          throw new FigmaApiError(
            `Failed to parse response: ${error.message} (response may be too large)`,
            response.status
          );
        }
        throw error;
      }

      return data;
    };

    const result =
      this.cache && options?.cacheKey
        ? await this.cache.getOrSet(options.cacheKey, executeRequest)
        : await executeRequest();

    return result;
  }

  /**
   * Fetch a complete Figma file or specific node
   *
   * When nodeId is provided, fetches only that specific node.
   * When nodeId is omitted, fetches the entire file.
   */
  async getFile(
    fileKey: string,
    options?: GetFileOptions
  ): Promise<SimplifiedDesign | string> {
    info(`Fetching file: ${fileKey}`, { nodeId: options?.nodeId });
    console.log(`[DEBUG] Starting getFile for ${fileKey}...`);

    // Route based on nodeId presence
    if (options?.nodeId) {
      return await this.getFileByNode(fileKey, options);
    }

    // Original behavior - fetch entire file
    try {
      return await this.getFileStandard(fileKey, options);
    } catch (error) {
      // Check if it's a size-related error
      if (this.isSizeRelatedError(error)) {
        info(`File too large, using paginated approach`);
        console.log(`[DEBUG] Falling back to paginated fetching...`);
        // Fall back to paginated fetching
        return await this.getFilePaginated(fileKey, options);
      }
      throw error;
    }
  }

  /**
   * Fetch file using standard single-request approach
   */
  private async getFileStandard(
    fileKey: string,
    options?: GetFileOptions
  ): Promise<SimplifiedDesign> {
    const response = await this.rateLimiter.execute(() =>
      this.request<{
        name: string;
        document: Node;
        components?: Record<string, Component>;
        componentSets?: Record<string, ComponentSet>;
      }>(`/files/${fileKey}`, {
        cacheKey: ["file", fileKey],
      })
    );
    console.log(`[DEBUG] API response received, starting extraction...`);

    // Get extractors from options or use default allExtractors
    const extractors = options?.extractors || allExtractors;

    // Apply extraction pipeline
    const { nodes, globalVars } = extractFromDesign(
      [response.document],
      extractors,
      {
        maxDepth: options?.maxDepth,
        nodeFilter: options?.nodeFilter,
        afterChildren: options?.afterChildren,
      },
      { styles: {} }
    );
    console.log(`[DEBUG] Extraction complete: ${nodes.length} nodes extracted`);

    // Extract components if requested
    const components =
      options?.includeComponents !== false && response.components
        ? simplifyComponents(response.components)
        : {};

    // Extract component sets if requested
    const componentSets =
      options?.includeComponentSets !== false && response.componentSets
        ? simplifyComponentSets(response.componentSets, response.components)
        : {};

    console.log(`[DEBUG] Returning simplified design...`);

    const design: SimplifiedDesign = {
      name: response.name,
      nodes,
      components,
      componentSets,
      globalVars,
    };

    // Handle format option
    if (options?.format === "toon") {
      return toToon(design) as unknown as SimplifiedDesign;
    }

    return design;
  }

  /**
   * Fetch file using paginated approach for large files
   */
  private async getFilePaginated(
    fileKey: string,
    options?: GetFileOptions
  ): Promise<SimplifiedDesign> {
    // Import paginated fetcher
    const { fetchPaginatedFile } =
      await import("@/streaming/paginated-fetcher");

    // Create progress emitter
    const progress = new ProgressEmitter();

    // Create async generator
    const generator = fetchPaginatedFile(
      fileKey,
      (endpoint) => this.request<Node>(endpoint),
      {
        extractors: options?.extractors || allExtractors,
        maxDepth: options?.maxDepth,
        nodeFilter: options?.nodeFilter,
        afterChildren: options?.afterChildren,
      },
      progress
    );

    // Collect all chunks
    const allNodes: SimplifiedNode[] = [];
    let finalResult: FileStreamResult | undefined;

    for await (const chunk of generator) {
      allNodes.push(...chunk.nodes);
    }

    // Get final result
    const iteratorResult = await generator.next();
    if (iteratorResult.done) {
      finalResult = iteratorResult.value as FileStreamResult;
    }

    const design: SimplifiedDesign = {
      name: finalResult?.name || "paginated-file",
      nodes: finalResult?.nodes || allNodes,
      components: {},
      componentSets: {},
      globalVars: finalResult?.globalVars || { styles: {} },
    };

    // Handle format option
    if (options?.format === "toon") {
      return toToon(design) as unknown as SimplifiedDesign;
    }

    return design;
  }

  /**
   * Fetch specific nodes from a Figma file by nodeId
   * (Internal method used by getFile when nodeId is provided)
   */
  private async getFileByNode(
    fileKey: string,
    options: GetFileOptions
  ): Promise<SimplifiedDesign | string> {
    // Validate and normalize nodeId
    const validation = validateNodeId(options.nodeId!, {
      allowMultiple: true,
      allowInstance: true,
      allowUrlFormat: true,
    });

    if (!validation.valid) {
      throw new Error(validation.error || "Invalid node ID format");
    }

    const normalizedNodeId = validation.normalized!;

    info(`Fetching nodes: ${normalizedNodeId}`);

    // Use existing getNodes infrastructure
    const response = await this.rateLimiter.execute(() =>
      this.request<{
        name: string;
        nodes: Record<string, Node>;
      }>(`/files/${fileKey}/nodes?ids=${normalizedNodeId}`, {
        cacheKey: ["nodes", fileKey, normalizedNodeId],
      })
    );

    const extractors = options.extractors || allExtractors;
    const { nodes, globalVars } = extractFromDesign(
      Object.values(response.nodes),
      extractors,
      {
        maxDepth: options.maxDepth,
        nodeFilter: options.nodeFilter,
        afterChildren: options.afterChildren,
      },
      { styles: {} }
    );

    const design: SimplifiedDesign = {
      name: response.name,
      nodes,
      components: {}, // Node-specific fetch doesn't include components
      componentSets: {},
      globalVars,
    };

    if (options?.format === "toon") {
      return toToon(design) as unknown as SimplifiedDesign;
    }

    return design;
  }

  /**
   * Check if an error is size-related and should trigger paginated fallback
   */
  private isSizeRelatedError(error: unknown): boolean {
    if (error instanceof PayloadTooLargeError) {
      return true;
    }
    if (error instanceof FigmaApiError) {
      if (error.statusCode === 413) return true;
      if (error.statusCode === 500) return true;
      if (error.statusCode === 503) return true;
    }
    if (error instanceof Error) {
      if (error.message.includes("timeout")) return true;
      if (error.message.includes("JSON")) return true;
      if (error.message.includes("truncate")) return true;
    }
    return false;
  }

  /**
   * Fetch specific nodes from a Figma file
   */
  async getNodes(
    fileKey: string,
    options: GetNodesOptions
  ): Promise<SimplifiedDesign> {
    info(`Fetching nodes for file: ${fileKey}`, { ids: options.ids });

    const ids = options.ids.join(",");
    const response = await this.rateLimiter.execute(() =>
      this.request<{
        name: string;
        nodes: Record<string, Node>;
      }>(`/files/${fileKey}/nodes?ids=${ids}`, {
        cacheKey: ["nodes", fileKey, ids],
      })
    );

    // Get extractors from options or use default allExtractors
    const extractors = options.extractors || allExtractors;

    // Apply extraction pipeline to all fetched nodes
    const nodesArray = Object.values(response.nodes);
    const { nodes, globalVars } = extractFromDesign(
      nodesArray,
      extractors,
      {
        maxDepth: options.maxDepth,
        nodeFilter: options.nodeFilter,
        afterChildren: options.afterChildren,
      },
      { styles: {} }
    );

    return {
      name: response.name,
      nodes,
      components: {},
      componentSets: {},
      globalVars,
    };
  }

  /**
   * Get image URLs for specific nodes
   */
  async getImageUrls(
    fileKey: string,
    options: GetImageUrlsOptions
  ): Promise<ImageUrlResult[]> {
    info(`Getting image URLs for file: ${fileKey}`, { ids: options.ids });

    const ids = options.ids.join(",");
    const format = options.format || "png";
    const scale = options.scale || 1;

    const response = await this.rateLimiter.execute(() =>
      this.request<Record<string, string>>(
        `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
        {
          cacheKey: ["images", fileKey, ids, format, scale.toString()],
        }
      )
    );

    return Object.entries(response).map(([id, url]) => ({ id, url }));
  }

  /**
   * Download images for specific nodes
   *
   * @param fileKey - The Figma file key
   * @param options - Download options
   * @returns Download results with local file paths
   */
  async downloadImages(
    fileKey: string,
    options: DownloadImagesOptions
  ): Promise<DownloadedImageResult[]> {
    info(`Downloading images for file: ${fileKey}`, {
      ids: options.ids,
      outputDir: options.outputDir,
    });

    // Get image URLs first
    const urlResults = await this.getImageUrls(fileKey, options);

    // Create progress emitter for tracking
    const progress = new ProgressEmitter();

    // Download images in parallel
    const downloadResults = await downloadImagesUtil(urlResults, {
      outputDir: options.outputDir,
      parallel: options.parallel || 5,
      timeout: 5000,
      progress,
    });

    // Convert to DownloadedImageResult format
    return downloadResults.map((result) => ({
      id: result.id,
      path: result.path,
      width: result.width || 0,
      height: result.height || 0,
    }));
  }

  /**
   * Get components from a file
   */
  async getComponents(fileKey: string): Promise<Record<string, unknown>> {
    info(`Getting components for file: ${fileKey}`);

    const response = await this.rateLimiter.execute(() =>
      this.request<Record<string, Component>>(`/files/${fileKey}/components`, {
        cacheKey: ["components", fileKey],
      })
    );

    return simplifyComponents(response);
  }

  /**
   * Get component sets from a file
   */
  async getComponentSets(fileKey: string): Promise<Record<string, unknown>> {
    info(`Getting component sets for file: ${fileKey}`);

    const response = await this.rateLimiter.execute(() =>
      this.request<Record<string, ComponentSet>>(
        `/files/${fileKey}/component_sets`,
        {
          cacheKey: ["componentSets", fileKey],
        }
      )
    );

    return simplifyComponentSets(response);
  }

  /**
   * Stream a complete Figma file with chunk-based processing
   * Use this for large files with 10,000+ nodes
   *
   * @param fileKey - The Figma file key
   * @param config - Streaming configuration options
   * @returns Async iterator of chunks with progress events
   *
   * @example
   * ```typescript
   * const stream = await client.streamFile('fileKey', { chunkSize: 100 });
   *
   * stream.on('progress', (progress) => {
   *   console.log(`Progress: ${progress.percent}%`);
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(`Chunk ${chunk.index}: ${chunk.nodes.length} nodes`);
   * }
   * ```
   */
  async streamFile(
    fileKey: string,
    config: FileStreamConfig = {}
  ): Promise<
    AsyncGenerator<StreamChunk, FileStreamResult, unknown> & {
      progress: ProgressEmitter;
    }
  > {
    info(`Streaming file: ${fileKey}`, { chunkSize: config.chunkSize || 50 });

    try {
      // Try standard streaming first
      return await this.streamFileStandard(fileKey, config);
    } catch (error) {
      if (this.isSizeRelatedError(error)) {
        info(`File too large, using paginated streaming`);
        console.log(`[DEBUG] Falling back to paginated streaming...`);
        return await this.streamFilePaginated(fileKey, config);
      }
      throw error;
    }
  }

  /**
   * Stream file using standard single-request approach
   */
  private async streamFileStandard(
    fileKey: string,
    config: FileStreamConfig = {}
  ): Promise<
    AsyncGenerator<StreamChunk, FileStreamResult, unknown> & {
      progress: ProgressEmitter;
    }
  > {
    const response = await this.rateLimiter.execute(() =>
      this.request<{
        name: string;
        document: Node;
        components?: Record<string, Component>;
        componentSets?: Record<string, ComponentSet>;
      }>(`/files/${fileKey}`, {
        cacheKey: ["file", fileKey],
      })
    );

    // Get extractors from options or use default allExtractors
    const extractors = config.extractors || allExtractors;

    // Create progress emitter
    const progress = new ProgressEmitter();

    // Create async generator with progress emitter attached
    const generator = streamFile(
      [response.document],
      extractors,
      {
        chunkSize: config.chunkSize || 50,
        maxDepth: config.maxDepth,
        nodeFilter: config.nodeFilter,
        afterChildren: config.afterChildren,
        includeComponents: config.includeComponents,
        includeComponentSets: config.includeComponentSets,
      },
      progress
    );

    // Attach progress emitter to the generator
    (generator as unknown as { progress: ProgressEmitter }).progress = progress;

    return generator as typeof generator & { progress: ProgressEmitter };
  }

  /**
   * Stream file using paginated approach for large files
   */
  private async streamFilePaginated(
    fileKey: string,
    config: FileStreamConfig = {}
  ): Promise<
    AsyncGenerator<StreamChunk, FileStreamResult, unknown> & {
      progress: ProgressEmitter;
    }
  > {
    // Import paginated fetcher
    const { fetchPaginatedFile } =
      await import("@/streaming/paginated-fetcher");

    // Create progress emitter
    const progress = new ProgressEmitter();

    // Create async generator
    const generator = fetchPaginatedFile(
      fileKey,
      (endpoint) => this.request<Node>(endpoint),
      {
        extractors: config.extractors || allExtractors,
        chunkSize: config.chunkSize || 50,
        maxDepth: config.maxDepth,
        nodeFilter: config.nodeFilter,
        afterChildren: config.afterChildren,
      },
      progress
    );

    // Attach progress emitter to the generator
    (generator as unknown as { progress: ProgressEmitter }).progress = progress;

    return generator as typeof generator & { progress: ProgressEmitter };
  }

  /**
   * Stream specific nodes from a Figma file with chunk-based processing
   *
   * @param fileKey - The Figma file key
   * @param ids - Array of node IDs to stream
   * @param config - Streaming configuration options
   * @returns Async iterator of chunks with progress events
   *
   * @example
   * ```typescript
   * const stream = await client.streamNodes('fileKey', ['id1', 'id2'], { chunkSize: 50 });
   *
   * for await (const chunk of stream) {
   *   console.log(`Chunk: ${chunk.nodes.length} nodes`);
   * }
   * ```
   */
  async streamNodes(
    fileKey: string,
    ids: string[],
    config: NodeStreamConfig = {}
  ): Promise<
    AsyncGenerator<StreamChunk, NodeStreamResult, unknown> & {
      progress: ProgressEmitter;
    }
  > {
    info(`Streaming nodes for file: ${fileKey}`, {
      ids,
      chunkSize: config.chunkSize || 50,
    });

    const idsString = ids.join(",");
    const response = await this.rateLimiter.execute(() =>
      this.request<{
        name: string;
        nodes: Record<string, Node>;
      }>(`/files/${fileKey}/nodes?ids=${idsString}`, {
        cacheKey: ["nodes", fileKey, idsString],
      })
    );

    // Get extractors from options or use default allExtractors
    const extractors = config.extractors || allExtractors;

    // Create progress emitter
    const progress = new ProgressEmitter();

    // Create async generator with progress emitter attached
    const generator = streamNodesUtil(
      Object.values(response.nodes),
      extractors,
      {
        chunkSize: config.chunkSize || 50,
        maxDepth: config.maxDepth,
        nodeFilter: config.nodeFilter,
        afterChildren: config.afterChildren,
      },
      progress
    );

    // Attach progress emitter to the generator
    (generator as unknown as { progress: ProgressEmitter }).progress = progress;

    return generator as typeof generator & { progress: ProgressEmitter };
  }
}
