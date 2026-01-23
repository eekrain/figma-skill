/**
 * Node walker - traverses Figma node tree and applies extractors
 */
import type { Node } from "@figma/rest-api-spec";

import type {
  ExtractorFn,
  GlobalVars,
  SimplifiedNode,
  TraversalContext,
  TraversalOptions,
} from "@/extractors/types";
import { hasValue, isVisible } from "@/utils/common";

/**
 * Extract data from Figma nodes using a flexible, single-pass approach.
 */
export function extractFromDesign(
  nodes: Node[],
  extractors: ExtractorFn[],
  options: TraversalOptions = {},
  globalVars: GlobalVars = { styles: {} }
): { nodes: SimplifiedNode[]; globalVars: GlobalVars } {
  console.log(
    `[DEBUG] extractFromDesign: Starting with ${nodes.length} root nodes`
  );
  const startTime = Date.now();

  const context: TraversalContext = {
    globalVars,
    currentDepth: 0,
    maxDepth: options.maxDepth ?? Number.POSITIVE_INFINITY,
    extraStyles: globalVars.extraStyles ?? {},  // CRITICAL: Pass through extraStyles from API
  };

  const processedNodes = nodes
    .filter((node) => shouldProcessNode(node, options))
    .map((node) => {
      console.log(
        `[DEBUG] Processing node: ${node.type} - ${node.name} (${node.id})`
      );
      return processNodeWithExtractors(node, extractors, context, options);
    })
    .filter((node): node is SimplifiedNode => node !== null);

  const elapsed = Date.now() - startTime;
  console.log(
    `[DEBUG] extractFromDesign: Complete in ${elapsed}ms, produced ${processedNodes.length} nodes`
  );

  return {
    nodes: processedNodes,
    globalVars: context.globalVars,
  };
}

/**
 * Process a single node with all provided extractors in one pass.
 */
function processNodeWithExtractors(
  node: Node,
  extractors: ExtractorFn[],
  context: TraversalContext,
  options: TraversalOptions
): SimplifiedNode | null {
  if (!shouldProcessNode(node, options)) {
    return null;
  }

  // Check if this node is at or beyond maxDepth
  // currentDepth represents the depth of this node (parent's depth + 1)
  // Root nodes are at depth 0, so we check currentDepth >= maxDepth
  if (context.currentDepth >= context.maxDepth) {
    return null;
  }

  // Always include base metadata
  const result: SimplifiedNode = {
    id: node.id,
    name: node.name,
    type: node.type === "VECTOR" ? "IMAGE-SVG" : node.type,
    visible: node.visible ?? true,
  };

  // Apply all extractors to this node in a single pass
  for (const extractor of extractors) {
    const resultOrPromise = extractor(node, result, context);
    // Handle both sync and async extractors
    if (resultOrPromise instanceof Promise) {
      // For async extractors, we need to await them
      // In production, we'd batch these for better performance
      resultOrPromise.catch((err) => {
        console.error("Extractor error:", err);
      });
    }
  }

  // Handle children recursively
  if (shouldTraverseChildren(node, context, options)) {
    const childContext: TraversalContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      parent: node,
    };

    if (hasValue("children", node) && node.children.length > 0) {
      const children = node.children
        .filter((child) => shouldProcessNode(child, options))
        .map((child) =>
          processNodeWithExtractors(child, extractors, childContext, options)
        )
        .filter((child): child is SimplifiedNode => child !== null);

      if (children.length > 0) {
        // Allow custom logic to modify parent and control which children to include
        const childrenToInclude = options.afterChildren
          ? options.afterChildren(node, result, children)
          : children;

        if (childrenToInclude.length > 0) {
          result.children = childrenToInclude;
        }
      }
    }
  }

  return result;
}

/**
 * Determine if a node should be processed based on filters.
 */
function shouldProcessNode(node: Node, options: TraversalOptions): boolean {
  // Skip invisible nodes
  if (!isVisible(node)) {
    return false;
  }

  // Apply custom node filter if provided
  if (options.nodeFilter && !options.nodeFilter(node)) {
    return false;
  }

  return true;
}

/**
 * Determine if we should traverse into a node's children.
 */
function shouldTraverseChildren(
  node: Node,
  context: TraversalContext,
  _options: TraversalOptions
): boolean {
  // Check depth limit
  if (context.currentDepth >= context.maxDepth) {
    return false;
  }

  return true;
}
