/**
 * Auto-batching nodeIds - API Redesign Feature
 *
 * Handles batching of multiple node IDs for efficient API calls.
 * Figma limits to ~20 nodes per request, so we chunk and parallelize.
 */
import type { GetFileOptions, NodeId } from "@/extractors/types";

// =====================================================
// Constants
// =====================================================

/**
 * Figma API limit for node_ids per request
 */
const FIGMA_BATCH_LIMIT = 20;

/**
 * Default batch size (conservative to stay under Figma limit)
 */
const DEFAULT_BATCH_SIZE = 20;

// =====================================================
// Helper Functions
// =====================================================

/**
 * Calculate batch size for node IDs
 */
export function calculateBatchSize(): number {
  return DEFAULT_BATCH_SIZE;
}

/**
 * Chunk node IDs into batches
 */
export function chunkNodeIds<T extends string>(
  nodeIds: T[],
  batchSize: number
): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < nodeIds.length; i += batchSize) {
    chunks.push(nodeIds.slice(i, i + batchSize));
  }

  return chunks;
}

/**
 * Generate batch ID from node IDs (semicolon-separated)
 */
export function generateBatchId(nodeIds: string[]): string {
  return nodeIds.join(";");
}

/**
 * Merge base options with single nodeId for batch processing
 */
export function mergeGetFileOptions(
  baseOptions: Omit<GetFileOptions, "nodeId" | "nodeIds">,
  nodeId: NodeId
): GetFileOptions {
  return {
    ...baseOptions,
    nodeId,
    // Explicitly exclude nodeIds when using single nodeId
    nodeIds: undefined,
  } as GetFileOptions;
}

/**
 * Check if options represent a batch request (multiple nodeIds)
 */
export function isBatchRequest(
  options: GetFileOptions
): options is GetFileOptions & { nodeIds: NodeId[] } {
  return (
    "nodeIds" in options &&
    Array.isArray(options.nodeIds) &&
    options.nodeIds.length > 0
  );
}

/**
 * Check if options represent a single node request
 */
export function isSingleNodeRequest(
  options: GetFileOptions
): options is GetFileOptions & { nodeId: NodeId } {
  return "nodeId" in options && !!options.nodeId && !isBatchRequest(options);
}

/**
 * Validate node IDs
 */
export function validateNodeId(nodeId: string): boolean {
  // Node ID format: "id:id" or "Iid:id" (instance)
  const validPattern = /^[Ii]?\d+[:-]\d+$/;
  return validPattern.test(nodeId);
}

/**
 * Validate array of node IDs
 */
export function validateNodeIds(nodeIds: string[]): boolean {
  return nodeIds.every(validateNodeId);
}

/**
 * Remove invalid node IDs from array
 */
export function sanitizeNodeIds(nodeIds: string[]): string[] {
  return nodeIds.filter(validateNodeId);
}

/**
 * Deduplicate node IDs
 */
export function deduplicateNodeIds(nodeIds: string[]): string[] {
  return Array.from(new Set(nodeIds));
}

/**
 * Prepare node IDs for batch processing (sanitize + deduplicate)
 */
export function prepareNodeIds(nodeIds: string[]): string[] {
  return deduplicateNodeIds(sanitizeNodeIds(nodeIds));
}

// =====================================================
// Batch Processing
// =====================================================

/**
 * Batch node IDs for processing
 */
export interface BatchPlan {
  /** Total number of nodes */
  totalNodes: number;
  /** Number of batches */
  batchCount: number;
  /** Batched node IDs */
  batches: string[][];
  /** Batch IDs for API requests */
  batchIds: string[];
}

/**
 * Create a plan for batching node IDs
 */
export function createBatchPlan(
  nodeIds: string[],
  batchSize?: number
): BatchPlan {
  const preparedIds = prepareNodeIds(nodeIds);
  const size = batchSize || calculateBatchSize();
  const batches = chunkNodeIds(preparedIds, size);
  const batchIds = batches.map(generateBatchId);

  return {
    totalNodes: preparedIds.length,
    batchCount: batches.length,
    batches,
    batchIds,
  };
}

/**
 * Calculate optimal parallelism for batch processing
 */
export function calculateParallelism(
  batchCount: number,
  maxParallel?: number
): number {
  const defaultMax = 5; // Default max parallel requests
  const limit = maxParallel || defaultMax;

  // Don't parallelize if only 1 batch
  if (batchCount <= 1) {
    return 1;
  }

  // Return the smaller of batch count or limit
  return Math.min(batchCount, limit);
}
