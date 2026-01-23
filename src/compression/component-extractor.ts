/**
 * Component extractor - Extracts component definitions and creates compressed instances
 *
 * Core logic:
 * 1. Groups instances by componentId
 * 2. Detects slots across instances
 * 3. Creates component template from first instance
 * 4. Creates compressed instance references with overrides
 */

import type { SimplifiedNode } from "@/extractors/types";
import type {
  ComponentDefinition,
  CompressedInstance,
  CompressionOptions,
  LayoutPosition,
  SerializableCompressedDesign,
  SerializableComponentDefinition,
  CompressionStats,
  CodeHint,
  SlotDefinition,
  ComponentHierarchy,
} from "./types";
import { detectSlots, applyOverrides } from "./slot-detector";

/**
 * Extract result containing compressed design and statistics
 */
export interface ExtractResult {
  /** Compressed design ready for serialization */
  design: SerializableCompressedDesign;
  /** Compression statistics */
  stats: CompressionStats;
}

/**
 * Estimates the serialized size of data in bytes
 */
function estimateSerializedSize(data: unknown): number {
  return JSON.stringify(data).length;
}

/**
 * Validates that compression will actually reduce size
 * Returns true if compression provides minimum savings
 *
 * @param originalNodes - Original node tree
 * @param componentDefinitions - Component definitions
 * @param compressedInstances - Compressed instance references
 * @param remainingNodes - Non-component nodes
 * @param minSavings - Minimum required savings (default: 0.10 = 10%)
 * @returns True if compression provides adequate benefit
 */
function validateCompressionBenefit(
  originalNodes: SimplifiedNode[],
  componentDefinitions: Map<string, ComponentDefinition>,
  compressedInstances: CompressedInstance[],
  remainingNodes: SimplifiedNode[],
  minSavings: number = 0.10
): boolean {
  const originalSize = estimateSerializedSize(originalNodes);

  // Calculate compressed size
  const componentsSize = estimateSerializedSize(
    mapToRecord(componentDefinitions, serializeComponentDefinition)
  );
  const instancesSize = estimateSerializedSize(compressedInstances);
  const remainingSize = estimateSerializedSize(remainingNodes);
  const compressedSize = componentsSize + instancesSize + remainingSize;

  const savings = 1 - (compressedSize / originalSize);

  console.log(`[Compression Validation] Original: ${originalSize}, Compressed: ${compressedSize}, Savings: ${(savings * 100).toFixed(1)}%`);

  return savings >= minSavings;
}

/**
 * Extracts components from a node array and creates compressed design
 *
 * @param name - Design name
 * @param nodes - Root level nodes to process
 * @param globalVars - Global style variables
 * @param options - Compression options
 * @returns Extract result with compressed design and stats
 */
export function extractComponents(
  name: string,
  nodes: SimplifiedNode[],
  globalVars: { styles: Record<string, unknown>; extraStyles?: Record<string, { name: string }> },
  options: CompressionOptions = {}
): ExtractResult {
  const minInstances = options.minInstances ?? 2;

  // Group instances by componentId
  const instancesByComponent = groupByComponentId(nodes);

  // Filter by minimum instances
  const validComponents = filterByMinInstances(instancesByComponent, minInstances);

  // Extract component definitions and create compressed instances
  const componentDefinitions = new Map<string, ComponentDefinition>();
  const compressedInstances: CompressedInstance[] = [];
  const remainingNodes: SimplifiedNode[] = [];

  // Get all known component IDs for nested reference detection
  const knownComponents = new Set<string>(Array.from(validComponents.keys()));

  for (const [componentId, instances] of validComponents) {
    // Detect slots
    const slotResult = detectSlots(instances, {
      minSimilarity: options.minSlotSimilarity,
    });

    // Create component template with known components for nested reference detection
    const template = createComponentTemplateWithKnown(
      componentId,
      instances[0],
      slotResult.slots,
      knownComponents
    );
    componentDefinitions.set(componentId, template);

    // Create compressed instances
    for (const instance of instances) {
      const compressed = createCompressedInstance(
        instance,
        componentId,
        template.slots
      );
      compressedInstances.push(compressed);
    }
  }

  // Collect non-component nodes, properly filtering out compressed instances
  for (const node of nodes) {
    const filtered = filterComponentInstances(node, validComponents);
    if (filtered) {
      remainingNodes.push(filtered);
    }
  }


  // NEW: Validate before committing to compression
  if (!validateCompressionBenefit(nodes, componentDefinitions, compressedInstances, remainingNodes)) {
    console.log('[Compression] Skipping - would not reduce size enough');
    // Return uncompressed format
    const design = buildSerializableDesign(
      name,
      new Map(),  // No component definitions
      [],         // No compressed instances
      nodes,      // Original nodes pass-through
      globalVars
    );

    const stats = calculateStats(nodes, design, 0);
    return { design, stats };
  }

  // Build component hierarchy (NEW!)
  const componentHierarchy = buildComponentHierarchy(componentDefinitions);

  // Build serializable design
  const design = buildSerializableDesign(
    name,
    componentDefinitions,
    compressedInstances,
    remainingNodes,
    globalVars,
    componentHierarchy  // NEW: include hierarchy
  );

  // Calculate stats
  const stats = calculateStats(nodes, design, componentDefinitions.size);


  return { design, stats };
}

/**
 * Filters out component instances from a node tree
 * Returns the filtered node, or null if the entire node should be removed
 * Component instances that are being compressed are removed from the tree
 */
function filterComponentInstances(
  node: SimplifiedNode,
  validComponents: Map<string, SimplifiedNode[]>
): SimplifiedNode | null {
  // If this is a valid component instance, return null (remove it)
  if (node.componentId && validComponents.has(node.componentId)) {
    return null;
  }

  // Clone the node and filter its children
  const result: SimplifiedNode = { ...node };

  if (node.children && node.children.length > 0) {
    const filteredChildren: SimplifiedNode[] = [];
    for (const child of node.children) {
      const filtered = filterComponentInstances(child, validComponents);
      if (filtered) {
        filteredChildren.push(filtered);
      }
    }
    result.children = filteredChildren;
  }

  return result;
}

/**
 * Groups nodes by their componentId
 */
function groupByComponentId(
  nodes: SimplifiedNode[]
): Map<string, SimplifiedNode[]> {
  const groups = new Map<string, SimplifiedNode[]>();

  function group(node: SimplifiedNode): void {
    if (node.componentId) {
      const componentId = node.componentId;
      if (!groups.has(componentId)) {
        groups.set(componentId, []);
      }
      groups.get(componentId)!.push(node);
    }

    if (node.children) {
      for (const child of node.children) {
        group(child);
      }
    }
  }

  for (const node of nodes) {
    group(node);
  }

  return groups;
}

/**
 * Filters component groups by minimum instance count
 */
function filterByMinInstances(
  groups: Map<string, SimplifiedNode[]>,
  minInstances: number
): Map<string, SimplifiedNode[]> {
  const filtered = new Map<string, SimplifiedNode[]>();

  for (const [componentId, instances] of groups) {
    if (instances.length >= minInstances) {
      filtered.set(componentId, instances);
    }
  }

  return filtered;
}

/**
 * Creates a minimal component template from an instance
 * Only preserves structure, marks variable content as slots
 */
function createComponentTemplate(
  componentId: string,
  instance: SimplifiedNode,
  slots: Map<string, import("./types").SlotDefinition>
): ComponentDefinition {
  // Create minimal template from first instance
  const template = createMinimalTemplate(instance, slots, new Set());

  return {
    id: componentId,
    name: instance.name || "unnamed",
    type: instance.type === "COMPONENT" ? "COMPONENT" : "INSTANCE",
    componentProperties: instance.componentProperties as Record<string, unknown> | undefined,
    template,  // Minimal template instead of full children
    slotIds: Array.from(slots.keys()),
    slots,
  };
}

/**
 * Creates a minimal component template with known component IDs
 * Preserves nested component references without expanding them
 */
function createComponentTemplateWithKnown(
  componentId: string,
  instance: SimplifiedNode,
  slots: Map<string, import("./types").SlotDefinition>,
  knownComponents: Set<string>
): ComponentDefinition {
  // Create minimal template with known components for nested reference detection
  const template = createMinimalTemplate(instance, slots, knownComponents);

  return {
    id: componentId,
    name: instance.name || "unnamed",
    type: instance.type === "COMPONENT" ? "COMPONENT" : "INSTANCE",
    componentProperties: instance.componentProperties as Record<string, unknown> | undefined,
    template,
    slotIds: Array.from(slots.keys()),
    slots,
  };
}

/**
 * Creates a minimal template from an instance
 * Only preserves structure, marks variable content as slots
 * Preserves nested component references without expanding them
 * Phase 2: Uses structured slot references instead of inline string markers
 * Phase 3: Always expands to full object syntax (no compact notation)
 */
function createMinimalTemplate(
  instance: SimplifiedNode,
  slots: Map<string, import("./types").SlotDefinition>,
  knownComponents: Set<string>,
  currentPath: string[] = []
): import("./types").MinimalTemplateNode {
  const template: import("./types").MinimalTemplateNode = {
    id: instance.id,
    name: instance.name,
    type: instance.type,
    visible: instance.visible ?? true,
  };

  const pathStr = currentPath.join(".");

  // Mark individual properties as slots using STRUCTURED REFERENCES (Phase 2)
  // Instead of "__SLOT:slot_id__" use { $slot: "slot_id" }
  for (const prop of ['text', 'fills', 'strokes', 'opacity']) {
    const propPath = [...currentPath, prop].join(".");
    const propSlot = findSlotAtPath(propPath, slots);
    if (propSlot && (instance as any)[prop] !== undefined) {
      // Phase 2: Use structured slot reference
      (template as any)[prop] = { $slot: propSlot.slotId };
    } else if ((instance as any)[prop] !== undefined) {
      (template as any)[prop] = (instance as any)[prop];
    }
  }

  // Handle layout with structured slot reference
  if (instance.layout) {
    const layoutPath = [...currentPath, "layout"].join(".");
    const layoutSlot = findSlotAtPath(layoutPath, slots);
    if (layoutSlot) {
      // Phase 2: Use structured slot reference
      template.layout = { $slot: layoutSlot.slotId };
    } else {
      // Keep minimal layout info (dimensions only, no position)
      if (instance.layout && typeof instance.layout === 'object') {
        const layout = instance.layout as unknown as Record<string, unknown>;
        const dims = layout.dimensions as Record<string, unknown> | undefined;
        const layoutObj: Record<string, unknown> = {
          dimensions: dims ? {
            width: dims.width as number | undefined,
            height: dims.height as number | undefined,
            aspectRatio: dims.aspectRatio as number | undefined,
          } : undefined,
          mode: layout.mode as string | undefined,
        };
        // Phase 5: Add inline layout summary as readable hint
        // (Note: Using a regular field since YAML comments aren't easily supported)
        const summary = generateLayoutSummary(instance.layout as unknown as Record<string, unknown>);
        if (summary) {
          (template as any).layoutHint = summary;
        }
        template.layout = layoutObj;
      }
    }
  }

  // Handle visibility slot with structured reference
  const visiblePath = [...currentPath, "visible"].join(".");
  const visibleSlot = findSlotAtPath(visiblePath, slots);
  if (visibleSlot && instance.visible !== undefined) {
    // Phase 2: Use structured slot reference
    template.visible = { $slot: visibleSlot.slotId } as any;
  }

  // Phase 6: Handle nested component references (preserve but don't expand)
  // If this is a known component, mark it as a reference and don't expand children
  if (instance.componentId && knownComponents.has(instance.componentId)) {
    template.componentId = instance.componentId;
    // Phase 6: Don't expand children for known component references
    // The component's template is stored separately, so we just reference it
    return template;
  }

  // Phase 3: ALWAYS include full children structure with expanded syntax
  // No compact object notation - always full object form
  if (instance.children && instance.children.length > 0) {
    template.children = instance.children.map((child, index) =>
      createMinimalTemplate(
        child,
        slots,
        knownComponents,
        [...currentPath, "children", String(index)]
      )
    );
  }

  return template;
}

/**
 * Checks if a given path corresponds to a slot position
 * Now handles bracket notation (children[0].fills vs children.0.fills)
 */
function isSlotPosition(
  path: string,
  slots: Map<string, import("./types").SlotDefinition>
): boolean {
  for (const [slotId, slot] of slots) {
    if (slot.nodePath === path || path.startsWith(slot.nodePath + ".") ||
        path.startsWith(slot.nodePath + "[") || slot.nodePath.startsWith(path + ".") ||
        slot.nodePath.startsWith(path + "[")) {
      return true;
    }
  }
  return false;
}

/**
 * Generates code generation hints for AI coding agents
 * Maps Figma properties to TypeScript/React/CSS equivalents
 */
function generateCodeHint(
  valueType: SlotDefinition["valueType"],
  defaultValue: unknown,
  nodePath: string
): CodeHint {
  // Extract property name from path (e.g., "children[0].fills" → "fills")
  const propName = nodePath.split('.').pop() || nodePath.split('[').pop() || '';

  switch (valueType) {
    case "text":
      return {
        tsType: "string",
        reactProp: "children",
        example: defaultValue || "Text",
      };
    case "fills":
      return {
        tsType: "string",
        reactProp: "style.backgroundColor",
        cssProperty: "background-color",
        isStyleProp: true,
        example: defaultValue || "#FFFFFF",
      };
    case "strokes":
      return {
        tsType: "string",
        reactProp: "style.borderColor",
        cssProperty: "border-color",
        isStyleProp: true,
        example: defaultValue || "#000000",
      };
    case "opacity":
      return {
        tsType: "number",
        reactProp: "style.opacity",
        cssProperty: "opacity",
        isStyleProp: true,
        example: defaultValue ?? 1,
      };
    case "visibility":
      return {
        tsType: "boolean",
        reactProp: "hidden",
        example: defaultValue ?? true,
      };
    case "property":
      if (nodePath.includes("layout")) {
        return {
          tsType: "CSSProperties",
          reactProp: "style",
          isStyleProp: true,
          example: "{ width, height, x, y }",
        };
      }
      return {
        tsType: "unknown",
        reactProp: propName,
      };
    default:
      return {
        tsType: "unknown",
        reactProp: propName,
      };
  }
}

/**
 * Finds the slot definition at a given path
 */
function findSlotAtPath(
  path: string,
  slots: Map<string, import("./types").SlotDefinition>
): import("./types").SlotDefinition | undefined {
  for (const [slotId, slot] of slots) {
    if (slot.nodePath === path) {
      return slot;
    }
  }
  return undefined;
}

/**
 * Phase 5: Generate a concise layout summary for inline hints
 * Helps LLMs understand layout without cross-referencing
 */
function generateLayoutSummary(layout: Record<string, unknown>): string {
  const parts: string[] = [];

  if (layout.mode) {
    parts.push(`mode:${layout.mode}`);
  }

  const dims = layout.dimensions as Record<string, unknown> | undefined;
  if (dims) {
    if (dims.width) parts.push(`w:${dims.width}`);
    if (dims.height) parts.push(`h:${dims.height}`);
  }

  if (layout.padding) {
    parts.push(`pad:${layout.padding}`);
  }

  if (layout.gap) {
    parts.push(`gap:${layout.gap}`);
  }

  return parts.join(' ');
}

/**
 * Creates a compressed instance reference
 */
function createCompressedInstance(
  instance: SimplifiedNode,
  componentId: string,
  slots: Map<string, import("./types").SlotDefinition>
): CompressedInstance {
  const compressed: CompressedInstance = {
    id: instance.id,
    componentId,
    name: instance.name || "unnamed",
    visible: instance.visible ?? true,
  };

  // Extract layout data
  if (instance.layout && typeof instance.layout === "object") {
    compressed.layoutData = extractLayoutPosition(instance.layout as unknown as Record<string, unknown>);
  }

  // Extract overrides
  const overrides: Record<string, unknown> = {};
  for (const [slotId, slot] of slots) {
    const value = getSlotValue(instance, slot.nodePath);
    const defaultValue = slot.defaultValue;

    if (!deepEqual(value, defaultValue)) {
      overrides[slotId] = value;
    }
  }

  if (Object.keys(overrides).length > 0) {
    compressed.overrides = overrides;
  }

  return compressed;
}

/**
 * Extracts layout position from layout object
 */
function extractLayoutPosition(
  layout: Record<string, unknown>
): LayoutPosition {
  return {
    x: (layout.x as number) ?? 0,
    y: (layout.y as number) ?? 0,
    width: (layout.width as number) ?? 0,
    height: (layout.height as number) ?? 0,
  };
}

/**
 * Gets a value at a specific path in a node tree
 * Now uses stringToPath to handle bracket notation
 */
function getSlotValue(node: SimplifiedNode, path: string): unknown {
  // Import stringToPath from slot-detector
  const { stringToPath } = require("./slot-detector");
  const parts = stringToPath(path);
  let current: unknown = node;

  for (const part of parts) {
    if (typeof part === "string") {
      current = (current as Record<string, unknown>)[part];
    } else if (typeof part === "number") {
      current = (current as unknown[])[part];
    }
    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    const aObj = a as object;
    const bObj = b as object;

    if (Array.isArray(aObj) !== Array.isArray(bObj)) return false;
    if (Array.isArray(aObj)) {
      const aArr = aObj as unknown[];
      const bArr = bObj as unknown[];
      if (aArr.length !== bArr.length) return false;
      for (let i = 0; i < aArr.length; i++) {
        if (!deepEqual(aArr[i], bArr[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(aObj as Record<string, unknown>);
    const keysB = Object.keys(bObj as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (
        !deepEqual(
          (aObj as Record<string, unknown>)[key],
          (bObj as Record<string, unknown>)[key]
        )
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Builds component hierarchy metadata
 * Analyzes which components contain which other components
 */
function buildComponentHierarchy(
  componentDefinitions: Map<string, ComponentDefinition>
): Record<string, ComponentHierarchy> {
  const hierarchy: Record<string, ComponentHierarchy> = {};
  const childToParents = new Map<string, string[]>();

  // Initialize hierarchy for all components
  for (const [compId, def] of componentDefinitions) {
    hierarchy[compId] = { children: [], parents: [], depth: 0 };
  }

  // Scan for component references in templates
  for (const [compId, def] of componentDefinitions) {
    const scanForComponents = (node: import("./types").MinimalTemplateNode): void => {
      if (node.componentId && node.componentId !== compId && hierarchy[node.componentId]) {
        // This component contains another component
        if (!hierarchy[compId].children) {
          hierarchy[compId].children = [];
        }
        if (!hierarchy[compId].children!.includes(node.componentId)) {
          hierarchy[compId].children!.push(node.componentId);
        }

        // Track parent relationship
        if (!childToParents.has(node.componentId)) {
          childToParents.set(node.componentId, []);
        }
        if (!childToParents.get(node.componentId)!.includes(compId)) {
          childToParents.get(node.componentId)!.push(compId);
        }
      }
      if (node.children) {
        for (const child of node.children) {
          scanForComponents(child);
        }
      }
    };

    scanForComponents(def.template);
  }

  // Set parents from the childToParents mapping
  for (const [childId, parents] of childToParents) {
    hierarchy[childId].parents = parents;
  }

  // BFS to calculate depths (find root components with no parents first)
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start with root components (no parents or parents outside our set)
  for (const [id, info] of Object.entries(hierarchy)) {
    if (!info.parents || info.parents.length === 0) {
      queue.push(id);
      visited.add(id);
    }
  }

  // Calculate depths using BFS
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = hierarchy[current].depth || 0;

    // Update children's depth
    for (const child of hierarchy[current].children || []) {
      if (!visited.has(child)) {
        hierarchy[child].depth = currentDepth + 1;
        visited.add(child);
        queue.push(child);
      }
    }
  }

  return hierarchy;
}

/**
 * Builds a serializable compressed design
 */
function buildSerializableDesign(
  name: string,
  componentDefinitions: Map<string, ComponentDefinition>,
  instances: CompressedInstance[],
  nodes: SimplifiedNode[],
  globalVars: { styles: Record<string, unknown>; extraStyles?: Record<string, { name: string }> },
  componentHierarchy?: Record<string, ComponentHierarchy>
): SerializableCompressedDesign {
  return {
    name,
    components: mapToRecord(
      componentDefinitions,
      serializeComponentDefinition
    ),
    componentHierarchy,  // NEW: include component hierarchy
    instances,
    nodes,
    globalVars: {
      styles: globalVars.styles as Record<string, import("../extractors/types").StyleTypes>,
      extraStyles: globalVars.extraStyles,
    },
  };
}

/**
 * Serializes a component definition
 */
function serializeComponentDefinition(
  def: ComponentDefinition
): SerializableComponentDefinition {
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    componentProperties: def.componentProperties,
    template: def.template,  // Use template instead of children
    slotIds: def.slotIds,
    slots: mapToRecord(def.slots, (slot) => slot),
  };
}

/**
 * Converts a Map to a Record
 */
function mapToRecord<T, U>(
  map: Map<string, T>,
  transform: (value: T) => U
): Record<string, U> {
  const record: Record<string, U> = {};
  for (const [key, value] of map) {
    record[key] = transform(value);
  }
  return record;
}

/**
 * Calculates compression statistics
 */
function calculateStats(
  originalNodes: SimplifiedNode[],
  compressed: SerializableCompressedDesign,
  componentCount: number
): CompressionStats {
  const originalSize = JSON.stringify(originalNodes).length;
  const compressedSize = JSON.stringify({
    components: compressed.components,
    instances: compressed.instances,
    nodes: compressed.nodes,
  }).length;

  return {
    originalNodeCount: countNodes(originalNodes),
    instanceCount: compressed.instances.length,
    componentCount,
    originalSize,
    compressedSize,
    reductionPercent: ((originalSize - compressedSize) / originalSize) * 100,
    slotCount: Object.values(compressed.components).reduce(
      (sum, comp) => sum + comp.slotIds.length,
      0
    ),
    gridCount: 0, // Grid detection done separately
  };
}

/**
 * Counts total nodes in a tree
 */
function countNodes(nodes: SimplifiedNode[]): number {
  let total = 0;

  function count(node: SimplifiedNode): void {
    total++;
    if (node.children) {
      for (const child of node.children) {
        count(child);
      }
    }
  }

  for (const node of nodes) {
    count(node);
  }

  return total;
}
