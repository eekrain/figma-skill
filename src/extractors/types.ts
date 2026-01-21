/**
 * Extractor type definitions
 */
import type { Node } from "@figma/rest-api-spec";

import type { GlobalVars, SimplifiedNode } from "@/types";

/**
 * Traversal context passed to extractors
 */
export interface TraversalContext {
  /** Global variables being built during extraction */
  globalVars: GlobalVars;
  /** Current traversal depth */
  currentDepth: number;
  /** Maximum depth to traverse */
  maxDepth: number;
  /** Extra styles from API response */
  extraStyles: Record<string, unknown>;
  /** Parent node if available */
  parent?: Node;
}

/**
 * Traversal options for controlling extraction behavior
 */
export interface TraversalOptions {
  /** Maximum depth to traverse (default: unlimited) */
  maxDepth?: number;
  /** Custom node filter function */
  nodeFilter?: (node: Node) => boolean;
  /** Called after children are processed to modify parent or control which children to include */
  afterChildren?: (
    node: Node,
    result: SimplifiedNode,
    children: SimplifiedNode[]
  ) => SimplifiedNode[];
}

/**
 * Extractor function type
 * Extracts data from a Figma node and adds it to the result
 */
export type ExtractorFn = (
  node: Node,
  result: SimplifiedNode,
  context: TraversalContext
) => void | Promise<void>;
