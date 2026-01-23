/**
 * Component analyzer - Detects components and estimates compression potential
 *
 * Scans a SimplifiedNode tree to identify:
 * - Component instances by componentId
 * - Instance counts per component
 * - Estimated size reduction
 */
import type { SimplifiedDesign, SimplifiedNode } from "@/extractors/types";

import type { ComponentInventory, NodeWithComponentInfo } from "./types";

// Re-export for other modules
export type { ComponentInventory };

/**
 * Analyzes a design for component compression opportunities
 *
 * @param design - The simplified design to analyze
 * @param minInstances - Minimum instances required (default: 2)
 * @returns Component inventory with compression estimates
 */
export function analyzeComponents(
  design: SimplifiedDesign,
  minInstances: number = 2
): ComponentInventory {
  const instancesByComponent = new Map<string, SimplifiedNode[]>();
  const componentCounts = new Map<string, number>();

  // Collect all instances by componentId
  for (const node of design.nodes) {
    scanForComponents(node, instancesByComponent);
  }

  // Count instances per component
  for (const [componentId, instances] of instancesByComponent) {
    componentCounts.set(componentId, instances.length);
  }

  // Filter by minimum instances
  for (const [componentId, instances] of instancesByComponent) {
    if (instances.length < minInstances) {
      instancesByComponent.delete(componentId);
      componentCounts.delete(componentId);
    }
  }

  // Calculate size estimates
  const originalSize = estimateSize(design.nodes);
  const compressedSize = estimateCompressedSize(
    instancesByComponent,
    design.nodes
  );
  const estimatedSavings = originalSize - compressedSize;

  return {
    instancesByComponent,
    componentCounts,
    estimatedSavings,
    originalSize,
    compressedSize,
  };
}

/**
 * Scans a node tree for component instances
 */
function scanForComponents(
  node: SimplifiedNode,
  instancesByComponent: Map<string, SimplifiedNode[]>
): void {
  // Check if this node is a component instance
  if (node.componentId) {
    const componentId = node.componentId;
    if (!instancesByComponent.has(componentId)) {
      instancesByComponent.set(componentId, []);
    }
    instancesByComponent.get(componentId)!.push(node);
  }

  // Recursively scan children
  if (node.children) {
    for (const child of node.children) {
      scanForComponents(child, instancesByComponent);
    }
  }
}

/**
 * Estimates the size of nodes in bytes (rough JSON serialization)
 */
function estimateSize(nodes: SimplifiedNode[]): number {
  return JSON.stringify(nodes).length;
}

/**
 * Estimates compressed size based on component extraction
 *
 * Assumes:
 * - Component definition stored once
 * - Each instance stored as minimal reference
 * - 70% reduction for repeated structures
 */
function estimateCompressedSize(
  instancesByComponent: Map<string, SimplifiedNode[]>,
  originalNodes: SimplifiedNode[]
): number {
  let compressedSize = 0;

  // Size for component definitions (stored once each)
  for (const [componentId, instances] of instancesByComponent) {
    const template = instances[0];
    const templateSize = JSON.stringify(template).length;
    compressedSize += templateSize; // One definition
  }

  // Size for compressed instances (references only)
  for (const [componentId, instances] of instancesByComponent) {
    const instanceRefSize = 100; // Rough estimate for reference
    compressedSize += instances.length * instanceRefSize;
  }

  // Non-component nodes pass through
  const nonComponentNodes = filterNonComponentNodes(originalNodes);
  compressedSize += estimateSize(nonComponentNodes);

  return compressedSize;
}

/**
 * Filters out component instance nodes from a node list
 */
function filterNonComponentNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  const result: SimplifiedNode[] = [];

  function filter(node: SimplifiedNode): SimplifiedNode | null {
    if (node.componentId) {
      return null; // Skip component instances
    }

    const filtered: SimplifiedNode = { ...node };
    if (node.children) {
      const filteredChildren = node.children
        .map(filter)
        .filter((n): n is SimplifiedNode => n !== null);
      if (filteredChildren.length > 0) {
        filtered.children = filteredChildren;
      }
    }
    return filtered;
  }

  for (const node of nodes) {
    const filtered = filter(node);
    if (filtered) {
      result.push(filtered);
    }
  }

  return result;
}

/**
 * Checks if a node should be extracted as a component
 */
export function shouldExtractAsComponent(
  node: SimplifiedNode,
  inventory: ComponentInventory,
  minInstances: number
): boolean {
  if (!node.componentId) {
    return false;
  }

  const count = inventory.componentCounts.get(node.componentId) || 0;
  return count >= minInstances;
}

/**
 * Marks nodes that should be extracted
 */
export function markNodesForExtraction(
  nodes: SimplifiedNode[],
  inventory: ComponentInventory,
  minInstances: number
): NodeWithComponentInfo[] {
  return nodes.map((node) => markNode(node, inventory, minInstances));
}

function markNode(
  node: SimplifiedNode,
  inventory: ComponentInventory,
  minInstances: number
): NodeWithComponentInfo {
  const result: NodeWithComponentInfo = { ...node };
  result.shouldExtract = shouldExtractAsComponent(
    node,
    inventory,
    minInstances
  );

  if (node.children) {
    result.children = node.children.map((child) =>
      markNode(child, inventory, minInstances)
    );
  }

  return result;
}

/**
 * Gets compression report as human-readable string
 */
export function getCompressionReport(inventory: ComponentInventory): string {
  const lines: string[] = [];

  lines.push("=== Component Compression Analysis ===");
  lines.push("");

  const totalComponents = inventory.instancesByComponent.size;
  const totalInstances = Array.from(
    inventory.instancesByComponent.values()
  ).reduce((sum, instances) => sum + instances.length, 0);

  lines.push(`Components detected: ${totalComponents}`);
  lines.push(`Total instances: ${totalInstances}`);
  lines.push("");

  if (totalComponents > 0) {
    lines.push("Components by usage:");
    const sorted = Array.from(inventory.componentCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    for (const [componentId, count] of sorted) {
      const instances = inventory.instancesByComponent.get(componentId)!;
      const name = instances[0]?.name || "unnamed";
      const savings = estimateSize(instances) * (1 - 1 / count);
      lines.push(
        `  - ${name} (${componentId}): ${count} instances (~${Math.round(
          savings
        )} bytes savings)`
      );
    }
    lines.push("");
  }

  lines.push(`Original size: ${inventory.originalSize} bytes`);
  lines.push(`Compressed size: ${inventory.compressedSize} bytes`);
  lines.push(
    `Estimated savings: ${inventory.estimatedSavings} bytes (${Math.round(
      (inventory.estimatedSavings / inventory.originalSize) * 100
    )}%)`
  );

  return lines.join("\n");
}
