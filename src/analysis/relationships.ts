/**
 * Component Relationship Analysis
 *
 * Analyzes component relationships including parent, children, siblings,
 * dependencies, and usage contexts.
 *
 * Implements what Framelink left as TODO items.
 */
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

import type { ComponentRelationship } from "./types";

/**
 * Analyze component relationships
 * Implements what Framelink left as TODO items
 *
 * @param compressed - Compressed design output from compressComponents()
 * @param allNodes - Original SimplifiedNode[] for relationship analysis
 * @returns Record mapping component keys to their relationships
 */
export function analyzeRelationships(
  compressed: CompressedDesign,
  allNodes: SimplifiedNode[]
): Record<string, ComponentRelationship> {
  const relationships: Record<string, ComponentRelationship> = {};

  // Build a map of componentId -> instances
  const componentInstances = groupInstancesByComponent(allNodes);

  // Build parent map for efficient lookups
  const parentMap = buildParentMap(allNodes);

  // For each component, find relationships
  // Use for...of to properly iterate over Map entries
  for (const [componentKey, component] of compressed.components.entries()) {
    relationships[componentKey] = {
      parent: findParentComponent(
        componentKey,
        component.id,
        componentInstances,
        parentMap
      ),
      children: findChildComponents(
        component.id,
        componentInstances,
        parentMap,
        allNodes
      ),
      siblings: findSiblingComponents(
        componentKey,
        componentInstances,
        parentMap
      ),
      dependsOn: findDependencies(
        component.id,
        componentInstances,
        parentMap,
        allNodes
      ),
      usedBy: findUsageContexts(component.id, componentInstances, parentMap),
    };
  }

  return relationships;
}

/**
 * Find parent component that contains this component
 */
function findParentComponent(
  componentKey: string,
  componentId: string,
  instances: Map<string, SimplifiedNode[]>,
  parentMap: Map<string, SimplifiedNode>
): string {
  const componentInstances = instances.get(componentId) || [];

  for (const instance of componentInstances) {
    let parent = parentMap.get(instance.id);
    while (parent) {
      if (parent.componentId) {
        return parent.componentId;
      }
      parent = parentMap.get(parent.id);
    }
  }

  return "";
}

/**
 * Find child components nested within this component
 */
function findChildComponents(
  componentId: string,
  instances: Map<string, SimplifiedNode[]>,
  parentMap: Map<string, SimplifiedNode>,
  allNodes: SimplifiedNode[]
): string[] {
  const childComponents = new Set<string>();

  // Also check the component definition (template) itself for children
  // Instances may have empty children, but the component definition shows what it contains
  const componentDef = allNodes.find((n) => n.id === componentId);
  if (componentDef) {
    findComponentsInNodeTree(componentDef, childComponents);
  }

  // Also check instances for any child components added at instance level
  const componentInstances = instances.get(componentId) || [];
  for (const instance of componentInstances) {
    findComponentsInNodeTree(instance, childComponents);
  }

  // Remove self from children
  childComponents.delete(componentId);

  return Array.from(childComponents);
}

/**
 * Recursively find all component IDs in a node tree
 */
function findComponentsInNodeTree(
  node: SimplifiedNode,
  found: Set<string>
): void {
  if (node.componentId) {
    found.add(node.componentId);
  }
  if (node.children) {
    for (const child of node.children) {
      findComponentsInNodeTree(child, found);
    }
  }
}

/**
 * Find sibling components (same parent)
 */
function findSiblingComponents(
  componentKey: string,
  instances: Map<string, SimplifiedNode[]>,
  parentMap: Map<string, SimplifiedNode>
): string[] {
  const siblings = new Set<string>();

  // Get all component IDs from instances
  for (const [componentId, componentInstances] of instances.entries()) {
    for (const instance of componentInstances) {
      const parent = parentMap.get(instance.id);
      if (!parent) continue;

      if (parent.children) {
        for (const sibling of parent.children) {
          if (sibling.componentId && sibling.componentId !== componentId) {
            siblings.add(sibling.componentId);
          }
        }
      }
    }
  }

  return Array.from(siblings);
}

/**
 * Find components this component depends on
 * (components used within this component's definition)
 */
function findDependencies(
  componentId: string,
  instances: Map<string, SimplifiedNode[]>,
  parentMap: Map<string, SimplifiedNode>,
  allNodes: SimplifiedNode[]
): string[] {
  const dependencies = new Set<string>();

  // Check the component definition (template) itself for dependencies
  // Instances may have empty children, but the component definition shows what it uses
  const componentDef = allNodes.find((n) => n.id === componentId);
  if (componentDef) {
    findComponentsInNodeTree(componentDef, dependencies);
  }

  // Also check instances for any dependencies added at instance level
  const componentInstances = instances.get(componentId) || [];
  for (const instance of componentInstances) {
    findComponentsInNodeTree(instance, dependencies);
  }

  // Remove self from dependencies
  dependencies.delete(componentId);

  return Array.from(dependencies);
}

/**
 * Find where this component is used
 * (components or contexts that contain instances of this component)
 */
function findUsageContexts(
  componentId: string,
  instances: Map<string, SimplifiedNode[]>,
  parentMap: Map<string, SimplifiedNode>
): string[] {
  const contexts = new Set<string>();

  const componentInstances = instances.get(componentId) || [];

  for (const instance of componentInstances) {
    let parent = parentMap.get(instance.id);
    while (parent) {
      // If parent is a component, add it
      if (parent.componentId) {
        contexts.add(parent.componentId);
      }
      // If parent is a named frame/page, add it as context
      else if (parent.type === "FRAME" || parent.type === "COMPONENT") {
        contexts.add(parent.name || "unnamed");
      }
      parent = parentMap.get(parent.id);
    }
  }

  return Array.from(contexts);
}

/**
 * Group component instances by their component ID
 */
function groupInstancesByComponent(
  allNodes: SimplifiedNode[]
): Map<string, SimplifiedNode[]> {
  const grouped = new Map<string, SimplifiedNode[]>();

  function traverse(node: SimplifiedNode) {
    if (node.componentId) {
      if (!grouped.has(node.componentId)) {
        grouped.set(node.componentId, []);
      }
      grouped.get(node.componentId)!.push(node);
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

  return grouped;
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
