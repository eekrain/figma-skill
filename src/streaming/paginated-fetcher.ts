/**
 * Paginated node fetcher for handling large Figma files
 *
 * When the standard /files/{fileKey} endpoint fails due to size (413),
 * this module provides a fallback that fetches nodes in batches using
 * the /files/{fileKey}/nodes?ids=... endpoint.
 */
import type { Node } from "@figma/rest-api-spec";

import { extractFromDesign } from "@/extractors/node-walker";
import type { StreamChunk } from "@/extractors/types";

import type { FileStreamConfig, FileStreamResult } from "./file-streamer";
import type { ProgressEmitter } from "./progress-emitter";

/**
 * Default batch size for fetching nodes
 * Very conservative to avoid Figma rate limits
 */
const DEFAULT_BATCH_SIZE = 3;

/**
 * Node fetcher function signature
 */
type NodeFetcher = (endpoint: string) => Promise<unknown>;

/**
 * Collect all node IDs from a tree (excluding document root)
 */
function collectNodeIds(nodes: Node[]): string[] {
  const ids: string[] = [];

  function traverse(node: Node): void {
    // Skip DOCUMENT nodes as they're just containers
    if (node.type !== "DOCUMENT") {
      ids.push(node.id);
    }

    // Recursively collect child IDs
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return ids;
}

/**
 * Fetch node children in batches using the nodes endpoint
 *
 * @param nodeIds - Array of node IDs to fetch
 * @param fileKey - Figma file key
 * @param request - Fetch function for API requests
 * @param batchSize - Number of nodes to fetch per request
 * @returns Array of fetched nodes
 */
async function fetchNodeChildren(
  nodeIds: string[],
  fileKey: string,
  request: NodeFetcher,
  batchSize = DEFAULT_BATCH_SIZE
): Promise<Node[]> {
  const results: Node[] = [];

  // Process sequentially (NO concurrency) to avoid rate limits
  for (let i = 0; i < nodeIds.length; i += batchSize) {
    const batch = nodeIds.slice(i, i + batchSize);
    const ids = batch.join(",");

    const response = (await request(`/files/${fileKey}/nodes?ids=${ids}`)) as {
      nodes: Record<string, Node>;
    };

    const nodes = Object.values(response.nodes);
    results.push(...nodes);
  }

  return results;
}

/**
 * Rebuild node tree from flat list using parent references
 *
 * @param nodes - Flat list of nodes with parent references
 * @returns Root node with rebuilt hierarchy
 */
function rebuildTree(nodes: Node[]): Node {
  const nodeMap = new Map<string, Node>();

  // Build map
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node });
  }

  // Clear children arrays before rebuilding
  for (const node of nodeMap.values()) {
    if ("children" in node) {
      (node as { children: Node[] }).children = [];
    }
  }

  // Rebuild hierarchy using parent references
  const roots: Node[] = [];

  for (const node of nodeMap.values()) {
    const parentRef = (node as unknown as { parent?: string }).parent;

    if (parentRef && nodeMap.has(parentRef)) {
      const parent = nodeMap.get(parentRef)!;
      if ("children" in parent) {
        const parentWithChildren = parent as Node & { children: Node[] };
        if (!parentWithChildren.children) {
          parentWithChildren.children = [];
        }
        parentWithChildren.children.push(node);
      }
    } else {
      // No parent in map, this is a root
      roots.push(node);
    }
  }

  // If we have multiple roots, wrap them in a document node
  if (roots.length === 1) {
    return roots[0];
  }

  // Create a synthetic document node to hold multiple roots
  return {
    id: "synthetic-root",
    name: "Document",
    type: "DOCUMENT",
    scrollBehavior: "SCROLLS" as const,
    children: roots as any,
  };
}

/**
 * Estimate total nodes based on top-level node count
 *
 * @param topLevelNodes - Top-level nodes from document
 * @returns Estimated total node count
 */
function estimateTotalNodes(topLevelNodes: Node[]): number {
  // Count immediate children of top-level nodes
  let immediateChildren = 0;
  for (const node of topLevelNodes) {
    if ("children" in node && Array.isArray(node.children)) {
      immediateChildren += node.children.length;
    }
  }

  // If no children found, use top-level count as minimum
  if (immediateChildren === 0) {
    return topLevelNodes.length;
  }

  // Heuristic: Average ~3 children per node (conservative estimate)
  const avgChildrenRatio = immediateChildren / topLevelNodes.length;
  const estimatedDepth = 3; // Typical design system depth

  // Estimate: topLevel * (avgChildren ^ depth)
  return Math.ceil(
    topLevelNodes.length * Math.pow(avgChildrenRatio, estimatedDepth)
  );
}

/**
 * Fetch file using paginated approach for large files
 *
 * This function:
 * 1. Gets top-level nodes (document children only)
 * 2. Recursively fetches children using /files/{fileKey}/nodes?ids=...
 * 3. Streams nodes as they're fetched
 * 4. Merges results maintaining tree structure
 *
 * @param fileKey - Figma file key
 * @param request - Fetch function for API requests
 * @param config - Streaming configuration
 * @param progress - Progress emitter for tracking
 * @param extraStyles - Optional style metadata from Figma API for semantic name resolution
 * @returns Async generator of chunks with final result
 */
export async function* fetchPaginatedFile(
  fileKey: string,
  request: NodeFetcher,
  config: FileStreamConfig,
  progress: ProgressEmitter,
  extraStyles?: Record<string, unknown> // NEW: Style metadata for semantic names
): AsyncGenerator<StreamChunk, FileStreamResult, unknown> {
  const extractors = config.extractors || [];
  const batchSize = DEFAULT_BATCH_SIZE;

  // Get extractors from built-in (imported at call site to avoid circular dep)
  const { allExtractors } = await import("@/extractors/built-in");
  const finalExtractors = extractors.length > 0 ? extractors : allExtractors;

  // Step 1: Get document node to find top-level children
  progress.start(0, "fetching-document");
  const docResponse = (await request(
    `/files/${fileKey}/nodes?ids=${fileKey}-0:0`
  )) as {
    nodes: Record<string, Node>;
  };
  const documentNode = Object.values(docResponse.nodes)[0] as Node & {
    children?: Node[];
  };

  if (!documentNode || !("children" in documentNode)) {
    throw new Error("Invalid document structure from API");
  }

  const topLevelNodes = documentNode.children || [];

  // Estimate total nodes and update progress
  const estimatedTotal = estimateTotalNodes(topLevelNodes);
  progress.start(estimatedTotal, "paginated-fetching");

  // Step 2: Collect all node IDs that need fetching
  const allNodeIds = collectNodeIds(topLevelNodes);
  progress.setOperation(`fetching-${allNodeIds.length}-nodes`);

  // Step 3: Fetch all nodes in batches
  const fetchedNodes: Node[] = [];
  let processedCount = 0;

  for (let i = 0; i < allNodeIds.length; i += batchSize) {
    const batch = allNodeIds.slice(i, i + batchSize);
    const batchNodes = await fetchNodeChildren(
      batch,
      fileKey,
      request,
      batchSize
    );
    fetchedNodes.push(...batchNodes);

    processedCount += batch.length;
    progress.setProcessed(processedCount);

    // Yield chunks periodically
    if (fetchedNodes.length >= 50) {
      // Extract and yield a chunk
      const { nodes: extractedNodes } = extractFromDesign(
        fetchedNodes.slice(-50),
        finalExtractors,
        {
          maxDepth: config.maxDepth,
          nodeFilter: config.nodeFilter,
          afterChildren: config.afterChildren,
        },
        {
          styles: {},
          extraStyles: extraStyles as
            | Record<string, { name: string }>
            | undefined,
        }
      );

      yield {
        nodes: extractedNodes,
        index: Math.floor(processedCount / 50),
        total: Math.ceil(allNodeIds.length / 50),
      };
    }
  }

  // Step 4: Rebuild tree structure
  progress.setOperation("rebuilding-tree");
  const rootNode = rebuildTree(fetchedNodes);

  // Step 5: Extract all nodes using the extraction pipeline
  progress.setOperation("extracting");
  const { nodes, globalVars } = extractFromDesign(
    [rootNode],
    finalExtractors,
    {
      maxDepth: config.maxDepth,
      nodeFilter: config.nodeFilter,
      afterChildren: config.afterChildren,
    },
    {
      styles: {},
      extraStyles: extraStyles as Record<string, { name: string }> | undefined,
    }
  );

  progress.complete();

  // Return final result
  return {
    name: "paginated-file",
    nodes,
    components: {},
    componentSets: {},
    globalVars,
    totalChunks: Math.ceil(allNodeIds.length / 50),
  };
}

/**
 * Check if an error is a size-related error that should trigger paginated fallback
 *
 * @param error - Error to check
 * @returns True if error is size-related
 */
export function isSizeRelatedError(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "PayloadTooLargeError"
  ) {
    return true;
  }

  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    if (
      error.statusCode === 413 ||
      error.statusCode === 500 ||
      error.statusCode === 503
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("timeout")) {
      return true;
    }
    if (error.message.includes("JSON")) {
      return true;
    }
    if (error.message.includes("truncate")) {
      return true;
    }
  }

  return false;
}
