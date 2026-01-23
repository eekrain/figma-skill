/**
 * Node Helpers - API Redesign Feature
 *
 * Helper functions to find specific node types in a design.
 * Provides convenient methods for finding images, text, frames, and components.
 */
import type { SimplifiedDesign, SimplifiedNode } from "@/extractors/types";

// =====================================================
// Type Definitions
// =====================================================

/**
 * A node with its path in the hierarchy
 */
export interface NodeWithPath {
  /** The node */
  node: SimplifiedNode;
  /** Path to the node (e.g., ["Page", "Frame", "Button"]) */
  path: string[];
}

/**
 * Node finder function type
 */
export type NodeFinder = (design: SimplifiedDesign) => SimplifiedNode[];

// =====================================================
// Helper Functions
// =====================================================

/**
 * Recursively traverse nodes and find matches
 */
function traverseNodes(
  nodes: SimplifiedNode[],
  predicate: (node: SimplifiedNode) => boolean,
  results: SimplifiedNode[] = []
): SimplifiedNode[] {
  for (const node of nodes) {
    if (predicate(node)) {
      results.push(node);
    }
    if (node.children && node.children.length > 0) {
      traverseNodes(node.children, predicate, results);
    }
  }
  return results;
}

/**
 * Find path to a node in the design
 */
function findNodePath(
  nodes: SimplifiedNode[],
  targetId: string,
  currentPath: string[] = []
): string[] | null {
  for (const node of nodes) {
    const path = [...currentPath, node.name];

    if (node.id === targetId) {
      return path;
    }

    if (node.children && node.children.length > 0) {
      const result = findNodePath(node.children, targetId, path);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

// =====================================================
// Public API
// =====================================================

/**
 * Find all nodes with image fills
 *
 * @param design - The design to search
 * @returns Array of nodes with IMAGE type fills
 */
export function findImages(design: SimplifiedDesign): SimplifiedNode[] {
  return traverseNodes(design.nodes, (node) => {
    if (!node.fills || !Array.isArray(node.fills)) {
      return false;
    }
    return node.fills.some(
      (fill) =>
        typeof fill === "object" &&
        fill !== null &&
        "type" in fill &&
        fill.type === "IMAGE"
    );
  });
}

/**
 * Find all text nodes
 *
 * @param design - The design to search
 * @param filter - Optional text content filter (string or regex)
 * @returns Array of text nodes, optionally filtered by content
 */
export function findText(
  design: SimplifiedDesign,
  filter?: string | RegExp
): SimplifiedNode[] {
  const textNodes = traverseNodes(design.nodes, (node) => node.type === "TEXT");

  if (!filter) {
    return textNodes;
  }

  return textNodes.filter((node) => {
    const text = node.text || "";
    if (typeof filter === "string") {
      return text === filter;
    }
    return filter.test(text);
  });
}

/**
 * Find all frame nodes
 *
 * @param design - The design to search
 * @param name - Optional name filter
 * @returns Array of frame nodes, optionally filtered by name
 */
export function findFrames(
  design: SimplifiedDesign,
  name?: string
): SimplifiedNode[] {
  const frameTypes = ["FRAME", "GROUP"];

  const frames = traverseNodes(design.nodes, (node) =>
    frameTypes.includes(node.type)
  );

  if (!name) {
    return frames;
  }

  return frames.filter((node) => node.name === name);
}

/**
 * Find all component instances
 *
 * @param design - The design to search
 * @param componentKey - Optional component key to filter by
 * @returns Array of component instances, optionally filtered by component key
 */
export function findComponents(
  design: SimplifiedDesign,
  componentKey?: string
): SimplifiedNode[] {
  const components = traverseNodes(design.nodes, (node) => !!node.componentId);

  if (!componentKey) {
    return components;
  }

  return components.filter((node) => {
    // Find the component definition for this instance
    const def = design.components[node.componentId!];
    return def && def.key === componentKey;
  });
}

/**
 * Add path information to nodes
 *
 * @param nodes - Nodes to add paths to
 * @param design - Design to search for paths
 * @returns Array of nodes with path information
 */
export function withPath(
  nodes: SimplifiedNode[],
  design: SimplifiedDesign
): NodeWithPath[] {
  return nodes.map((node) => {
    const path = findNodePath(design.nodes, node.id) || [node.name];
    return { node, path };
  });
}
