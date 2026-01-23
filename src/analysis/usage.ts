/**
 * Component Usage Analysis
 *
 * Analyzes component usage statistics including frequency,
 * contexts, common pairings, and layout roles.
 *
 * Implements what Framelink left as simplified/TODO.
 */
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

import type { ComponentUsage } from "./types";

/**
 * Analyze component usage statistics
 * Implements what Framelink left as simplified
 *
 * @param compressed - Compressed design output from compressComponents()
 * @param allNodes - Original SimplifiedNode[] for usage analysis
 * @returns Record mapping component keys to their usage statistics
 */
export function analyzeUsage(
  compressed: CompressedDesign,
  allNodes: SimplifiedNode[]
): Record<string, ComponentUsage> {
  const usage: Record<string, ComponentUsage> = {};

  // Build parent map for efficient lookups
  const parentMap = buildParentMap(allNodes);

  // Build component instance map
  const componentInstances = buildComponentInstanceMap(allNodes);

  // Use for...of to properly iterate over Map entries
  for (const [componentKey, component] of compressed.components.entries()) {
    // Find all instances of this component
    const instances = componentInstances.get(component.id) || [];

    // Find contexts (parent frame/page names)
    const contexts = new Set<string>();
    const pairings = new Map<string, number>();

    for (const instance of instances) {
      // Get context
      const context = findInstanceContext(instance, parentMap);
      if (context) {
        contexts.add(context);
      }

      // Find pairings
      const siblings = findSiblingNodes(instance, parentMap);
      for (const sibling of siblings) {
        if (sibling.componentId && sibling.componentId !== component.id) {
          pairings.set(
            sibling.componentId,
            (pairings.get(sibling.componentId) || 0) + 1
          );
        }
      }
    }

    // Sort pairings by frequency
    const commonPairings = Array.from(pairings.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([compId]) => compId);

    usage[componentKey] = {
      frequency: instances.length,
      contexts: Array.from(contexts),
      commonPairings,
      layoutRoles: inferLayoutRoles(instances, parentMap, allNodes),
    };
  }

  return usage;
}

/**
 * Find all instances of a component across the design
 */
function buildComponentInstanceMap(
  allNodes: SimplifiedNode[]
): Map<string, SimplifiedNode[]> {
  const map = new Map<string, SimplifiedNode[]>();

  function traverse(node: SimplifiedNode) {
    if (node.componentId) {
      if (!map.has(node.componentId)) {
        map.set(node.componentId, []);
      }
      map.get(node.componentId)!.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of allNodes) {
    traverse(node);
  }

  return map;
}

/**
 * Find the context name for an instance (parent frame/page)
 */
function findInstanceContext(
  instance: SimplifiedNode,
  parentMap: Map<string, SimplifiedNode>
): string | null {
  let parent = parentMap.get(instance.id);

  while (parent) {
    // If we find a frame with a meaningful name, use it as context
    if (
      (parent.type === "FRAME" || parent.type === "COMPONENT") &&
      parent.name &&
      !parent.name.startsWith("/") &&
      parent.name.toLowerCase() !== "page 1"
    ) {
      return parent.name;
    }
    parent = parentMap.get(parent.id);
  }

  return null;
}

/**
 * Find sibling nodes (nodes with the same parent)
 */
function findSiblingNodes(
  instance: SimplifiedNode,
  parentMap: Map<string, SimplifiedNode>
): SimplifiedNode[] {
  const parent = parentMap.get(instance.id);
  if (!parent || !parent.children) {
    return [];
  }

  return parent.children.filter((child) => child.id !== instance.id);
}

/**
 * Infer layout roles from instance contexts
 * Based on parent layout mode and instance characteristics
 */
function inferLayoutRoles(
  instances: SimplifiedNode[],
  parentMap: Map<string, SimplifiedNode>,
  allNodes: SimplifiedNode[]
): string[] {
  const roles = new Set<string>();

  for (const instance of instances) {
    const parent = parentMap.get(instance.id);
    if (!parent) continue;

    // Check parent layout for role hints
    const parentLayout = (parent as any).layout;
    if (parentLayout) {
      switch (parentLayout.mode) {
        case "HORIZONTAL":
        case "Horizontal":
          roles.add("list-item");
          roles.add("row-item");
          break;
        case "VERTICAL":
        case "Vertical":
          roles.add("list-item");
          roles.add("column-item");
          break;
        case "GRID":
          roles.add("grid-item");
          break;
      }

      // Check for specific layout patterns
      if (parentLayout.primaryAxisSizingMode === "SPACE_BETWEEN") {
        roles.add("spaced-item");
      }
    }

    // Check instance for text descendants (including nested)
    if (hasTextDescendant(instance)) {
      roles.add("label");
    }

    // Also check component definition for text descendants
    // when instance is empty but references a component with text
    if (
      instance.type === "INSTANCE" &&
      instance.componentId &&
      (!instance.children || instance.children.length === 0)
    ) {
      const componentDef = allNodes.find((n) => n.id === instance.componentId);
      if (componentDef && hasTextDescendant(componentDef)) {
        roles.add("label");
      }
    }

    // Check for interactive elements
    if (
      instance.type === "INSTANCE" &&
      instance.name?.toLowerCase().includes("button")
    ) {
      roles.add("button");
      roles.add("interactive");
    }

    // Check for icon patterns
    if (instance.name?.toLowerCase().includes("icon")) {
      roles.add("icon");
    }
  }

  return Array.from(roles);
}

/**
 * Recursively search for TEXT nodes in a node tree
 * Returns true if any descendant is a TEXT node
 */
function hasTextDescendant(node: SimplifiedNode): boolean {
  if (node.type === "TEXT") {
    return true;
  }
  if (node.children) {
    for (const child of node.children) {
      if (hasTextDescendant(child)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Build a parent mapping for efficient parent lookups
 * Maps child node ID to parent node
 */
function buildParentMap(
  allNodes: SimplifiedNode[]
): Map<string, SimplifiedNode> {
  const parentMap = new Map<string, SimplifiedNode>();

  function traverse(node: SimplifiedNode, parent: SimplifiedNode | null) {
    if (parent) {
      parentMap.set(node.id, parent);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child, node);
      }
    }
  }

  for (const node of allNodes) {
    traverse(node, null);
  }

  return parentMap;
}
