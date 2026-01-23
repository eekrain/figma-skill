/**
 * Design expander - Expands compressed format back to full node tree
 *
 * Decompression logic:
 * 1. Expands instances using component definitions
 * 2. Applies overrides to slots
 * 3. Combines with non-component nodes
 */

import type {
  SimplifiedNode,
  SimplifiedDesign,
} from "@/extractors/types";
import type {
  SerializableCompressedDesign,
  SerializableComponentDefinition,
  CompressedInstance,
  ComponentDefinition,
  SlotDefinition,
  MinimalTemplateNode,
} from "./types";
import { applyOverrides } from "./slot-detector";

/**
 * Expands a compressed design back to full SimplifiedDesign
 *
 * @param compressed - Compressed design to expand
 * @returns Full SimplifiedDesign with all nodes expanded
 */
export function expandDesign(
  compressed: SerializableCompressedDesign
): SimplifiedDesign {
  // Convert Records back to Maps
  const components = recordToMap(
    compressed.components,
    deserializeComponentDefinition
  );

  // Expand all instances
  const expandedInstances: SimplifiedNode[] = [];
  for (const instance of compressed.instances) {
    const component = components.get(instance.componentId);
    if (!component) {
      continue; // Skip instances with missing components
    }

    const expanded = expandInstance(instance, component);
    expandedInstances.push(expanded);
  }

  // Combine with non-component nodes
  const allNodes = [...expandedInstances, ...compressed.nodes];

  return {
    name: compressed.name,
    nodes: allNodes,
    components: {}, // Component definitions not preserved in expansion
    componentSets: {},
    globalVars: compressed.globalVars as unknown as {
      styles: Record<string, import("../extractors/types").StyleTypes>;
      extraStyles?: Record<string, { name: string }>;
    },
  };
}

/**
 * Expands a single compressed instance with minimal template support
 */
function expandInstance(
  instance: CompressedInstance,
  component: ComponentDefinition
): SimplifiedNode {
  // Use the minimal template instead of full children
  const { template } = component;

  // Expand the minimal template to full node
  const expanded = expandMinimalTemplate(template, instance.overrides || {});

  // Wrap in instance node
  const result: SimplifiedNode = {
    id: instance.id,
    name: instance.name,
    type: component.type,
    visible: instance.visible ?? true,
    componentId: instance.componentId,
    children: Array.isArray(expanded) ? expanded as SimplifiedNode[] : [expanded as SimplifiedNode],
  };

  // Apply layout data if present
  if (instance.layoutData) {
    result.layout = {
      mode: "none",
      locationRelativeToParent: {
        x: instance.layoutData.x,
        y: instance.layoutData.y,
      },
      dimensions: {
        width: instance.layoutData.width,
        height: instance.layoutData.height,
      },
    } as import("../transformers/layout").SimplifiedLayout;
  }

  return result;
}

/**
 * Expands a minimal template by applying overrides
 * Handles slot positions and nested component references
 * Phase 2: Resolves structured slot references { $slot: "slot_id" } → actual value
 */
function expandMinimalTemplate(
  template: MinimalTemplateNode,
  overrides: Record<string, unknown>
): SimplifiedNode | SimplifiedNode[] {
  const node: SimplifiedNode = {
    id: template.id,
    name: template.name,
    type: template.type,
    visible: typeof template.visible === 'object' && template.visible !== null && '$slot' in template.visible
      ? true  // Will be resolved from slot
      : (template.visible ?? true),
  };

  // Handle component references - preserve without expansion
  if (template.componentId) {
    (node as any).componentId = template.componentId;
    return node;  // Will be expanded separately if needed
  }

  // Phase 2: Resolve structured slot references { $slot: "slot_id" } → actual value
  const resolveValue = (val: unknown): unknown => {
    if (val && typeof val === 'object' && '$slot' in val) {
      const slotRef = val as { $slot: string };
      return overrides[slotRef.$slot];
    }
    return val;
  };

  // Copy properties, resolving slot references
  for (const key of ['text', 'fills', 'strokes', 'opacity', 'visible']) {
    if ((template as any)[key] !== undefined) {
      (node as any)[key] = resolveValue((template as any)[key]);
    }
  }

  // Resolve layout slot reference or keep layout
  if (template.layout !== undefined) {
    const resolvedLayout = resolveValue(template.layout);
    if (resolvedLayout !== template.layout) {
      // Was a slot reference, use resolved value
      (node as any).layout = resolvedLayout;
    } else {
      // Regular layout, keep as is
      node.layout = template.layout as any;
    }
  }

  // Recursively expand children
  if (template.children && template.children.length > 0) {
    node.children = template.children.map((child) =>
      expandMinimalTemplate(child, overrides)
    ) as SimplifiedNode[];
  }

  return node;
}

/**
 * Converts a Record to a Map
 */
function recordToMap<T, U>(
  record: Record<string, T>,
  transform: (value: T) => U
): Map<string, U> {
  const map = new Map<string, U>();

  for (const [key, value] of Object.entries(record)) {
    map.set(key, transform(value));
  }

  return map;
}

/**
 * Deserializes a component definition
 */
function deserializeComponentDefinition(
  def: SerializableComponentDefinition
): ComponentDefinition {
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    componentProperties: def.componentProperties,
    template: def.template,  // Use template instead of children
    slotIds: def.slotIds,
    slots: recordToMap(def.slots, (slot) => slot),
  };
}

/**
 * Validates that an expansion matches the original structure
 *
 * @param original - Original node tree
 * @param expanded - Expanded node tree
 * @returns True if structures match
 */
export function validateExpansion(
  original: SimplifiedNode[],
  expanded: SimplifiedNode[]
): boolean {
  if (original.length !== expanded.length) {
    return false;
  }

  for (let i = 0; i < original.length; i++) {
    if (!validateNode(original[i], expanded[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that two nodes have matching structure
 */
function validateNode(
  original: SimplifiedNode,
  expanded: SimplifiedNode
): boolean {
  // Check basic properties
  if (
    original.id !== expanded.id ||
    original.name !== expanded.name ||
    original.type !== expanded.type
  ) {
    return false;
  }

  // Check children
  if (original.children && expanded.children) {
    if (original.children.length !== expanded.children.length) {
      return false;
    }
    for (let i = 0; i < original.children.length; i++) {
      if (!validateNode(original.children[i], expanded.children[i])) {
        return false;
      }
    }
  } else if (original.children || expanded.children) {
    return false;
  }

  return true;
}

/**
 * Gets a summary of what would be expanded
 *
 * @param compressed - Compressed design
 * @returns Summary string
 */
export function getExpansionSummary(
  compressed: SerializableCompressedDesign
): string {
  const lines: string[] = [];

  lines.push("=== Expansion Summary ===");
  lines.push("");
  lines.push(`Design: ${compressed.name}`);
  lines.push("");

  const componentCount = Object.keys(compressed.components).length;
  const instanceCount = compressed.instances.length;
  const nodeCount = compressed.nodes.length;

  lines.push(`Components: ${componentCount}`);
  lines.push(`Instances to expand: ${instanceCount}`);
  lines.push(`Non-component nodes: ${nodeCount}`);
  lines.push("");

  // Component details
  for (const [id, component] of Object.entries(compressed.components)) {
    const instanceCount = compressed.instances.filter(
      (i) => i.componentId === id
    ).length;
    lines.push(
      `  - ${component.name} (${id}): ${instanceCount} instances, ${component.slotIds.length} slots`
    );
  }

  return lines.join("\n");
}
