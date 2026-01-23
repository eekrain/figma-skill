/**
 * Slot detector - Identifies variable content across component instances
 *
 * Algorithm:
 * 1. Traverse instance node trees in parallel
 * 2. Compare node values at each path
 * 3. Identify variations (text, fills, visibility, properties)
 * 4. Mark varying nodes as slots
 * 5. Extract default value from most common instance
 */

import type { SimplifiedNode } from "@/extractors/types";
import type {
  SlotDefinition,
  SlotDetectionResult,
  NodePath,
  NodeComparison,
  CodeHint,
} from "./types";

/**
 * Default properties to always check for slots regardless of similarity
 */
const DEFAULT_PROPERTY_SLOTS = [
  'text',           // Text content varies
  'fills',          // Colors vary
  'strokes',        // Stroke colors vary
  'opacity',        // Opacity varies
  'layout',         // Position varies
];

/**
 * Configuration for slot detection
 */
interface SlotDetectionConfig {
  /** Minimum similarity ratio (default: 0.6 - lowered from 0.8 for better detection) */
  minSimilarity?: number;
  /** Paths to always treat as slots */
  alwaysSlots?: string[];
  /** Paths to never treat as slots */
  neverSlots?: string[];
  /** NEW: Properties to always check for slots regardless of similarity */
  propertySlots?: string[];
  /** Use structural detection algorithm (default: true) */
  useStructuralDetection?: boolean;
  /** Maximum number of slots per component (default: 15) */
  maxSlots?: number;
  /** Maximum path depth for slot detection (default: 3) */
  maxDepth?: number;
}

/**
 * Detects slots across multiple component instances
 *
 * @param instances - Array of component instances to compare
 * @param config - Detection configuration
 * @returns Slot detection result with slot definitions
 */
export function detectSlots(
  instances: SimplifiedNode[],
  config: SlotDetectionConfig = {}
): SlotDetectionResult {
  if (instances.length < 2) {
    return {
      slots: new Map(),
      similarityScore: 1,
      totalPaths: 0,
      matchingPaths: 0,
    };
  }

  const minSimilarity = config.minSimilarity ?? 0.6;
  const alwaysSlots = new Set(config.alwaysSlots ?? []);
  const neverSlots = new Set(config.neverSlots ?? []);
  const propertySlots = new Set(config.propertySlots ?? DEFAULT_PROPERTY_SLOTS);
  const useStructural = config.useStructuralDetection ?? true;
  const maxSlots = config.maxSlots ?? 15;  // Limit slots per component
  const maxDepth = config.maxDepth ?? 3;    // Limit path depth for slots

  // Collect all node paths across instances
  const allPaths = collectAllPaths(instances);

  // Compare values at each path
  const comparisons: NodeComparison[] = [];
  for (const pathStr of allPaths) {
    const path = stringToPath(pathStr);
    const comparison = comparePath(instances, path);
    comparisons.push(comparison);
  }

  // Calculate similarity score
  const matchingPaths = comparisons.filter((c) => c.equal).length;
  const similarityScore = comparisons.length > 0
    ? matchingPaths / comparisons.length
    : 1;

  // Detect slots based on differences
  const slotCandidates: Array<{comparison: NodeComparison, priority: number}> = [];

  for (const comparison of comparisons) {
    const pathStr = pathToString(comparison.path);

    // Skip paths in neverSlots
    if (neverSlots.has(pathStr)) {
      continue;
    }

    // Check path depth - skip if too deep
    const depth = comparison.path.length;
    if (depth > maxDepth) {
      continue;
    }

    // Only include paths in alwaysSlots OR if values differ
    // (isPropertySlot now only affects priority, not slot creation)
    if (alwaysSlots.has(pathStr) || !comparison.equal) {
      // Calculate priority: higher for shallower paths and high-value properties
      const priority = calculateSlotPriority(comparison, propertySlots);
      slotCandidates.push({ comparison, priority });
    }
  }

  // Sort candidates by priority (highest first) and take top maxSlots
  slotCandidates.sort((a, b) => b.priority - a.priority);

  const slots = new Map<string, SlotDefinition>();
  for (let i = 0; i < Math.min(slotCandidates.length, maxSlots); i++) {
    const slot = createSlotFromComparison(slotCandidates[i].comparison, instances);
    if (slot) {
      slots.set(slot.slotId, slot);
    }
  }

  // If no slots detected and structural detection is enabled, use it as fallback
  if (slots.size === 0 && useStructural) {
    return detectSlotsStructural(instances, config);
  }

  return {
    slots,
    similarityScore,
    totalPaths: comparisons.length,
    matchingPaths,
  };
}

/**
 * Calculates priority for a slot candidate
 * Higher priority for:
 * - Shallower paths (closer to root)
 * - High-value properties (text, fills, etc.)
 * - Direct property paths (not nested children)
 */
function calculateSlotPriority(
  comparison: NodeComparison,
  propertySlots: Set<string>
): number {
  const pathStr = pathToString(comparison.path);
  const depth = comparison.path.length;

  // Base priority: higher for shallower paths
  let priority = 100 - (depth * 10);

  // Boost for direct properties (not nested in children)
  if (!pathStr.includes('children')) {
    priority += 50;
  }

  // Boost for high-value properties
  if (pathStr.includes('text')) priority += 30;
  if (pathStr.includes('fills')) priority += 25;
  if (pathStr.includes('strokes')) priority += 20;

  // Penalize very deep paths
  if (depth > 4) priority -= 30;
  if (depth > 5) priority -= 50;

  return Math.max(0, priority);
}

/**
 * Checks if a path ends in a property that should always be a slot
 */
function isPropertySlotPath(pathStr: string, propertySlots: Set<string>): boolean {
  // Only check direct properties, not nested children
  for (const prop of propertySlots) {
    if ((pathStr === prop) || (pathStr.endsWith(`.${prop}`) && !pathStr.includes('.children.'))) {
      return true;
    }
  }
  return false;
}

/**
 * Detects slots using structural analysis (ignores values, focuses on paths)
 * This is a fallback when value-based similarity fails
 *
 * @param instances - Array of component instances to compare
 * @param config - Detection configuration
 * @returns Slot detection result with slot definitions
 */
export function detectSlotsStructural(
  instances: SimplifiedNode[],
  config: SlotDetectionConfig = {}
): SlotDetectionResult {
  if (instances.length < 2) {
    return {
      slots: new Map(),
      similarityScore: 1,
      totalPaths: 0,
      matchingPaths: 0,
    };
  }

  const slots = new Map<string, SlotDefinition>();
  const structuralPaths = new Set<string>();
  const propertySlots = new Set(config.propertySlots ?? DEFAULT_PROPERTY_SLOTS);
  const maxSlots = config.maxSlots ?? 15;
  const maxDepth = config.maxDepth ?? 3;

  // Step 1: Build structural template (collect all paths, ignore values)
  for (const instance of instances) {
    collectPaths(instance, [], structuralPaths);
  }

  // Step 2: Collect slot candidates with priority
  const slotCandidates: Array<{pathStr: string, priority: number}> = [];

  for (const pathStr of structuralPaths) {
    const path = stringToPath(pathStr);
    const depth = path.length;

    // Skip paths that are too deep
    if (depth > maxDepth) {
      continue;
    }

    // Check if this path ends in a property slot
    const lastPathPart = path[path.length - 1];
    const isPropertySlot = typeof lastPathPart === 'string' &&
      propertySlots.has(lastPathPart);

    if (isPropertySlot) {
      // Calculate priority
      const priority = calculateStructuralSlotPriority(pathStr, path);
      slotCandidates.push({ pathStr, priority });
    }
  }

  // Step 3: Sort by priority and create top N slots
  slotCandidates.sort((a, b) => b.priority - a.priority);

  for (let i = 0; i < Math.min(slotCandidates.length, maxSlots); i++) {
    const { pathStr } = slotCandidates[i];
    const path = stringToPath(pathStr);
    const values = instances.map(i => getValueAtPath(i, path));
    // Use bracket-notation-safe slot ID
    const slotId = `slot_${pathStr.replace(/[\.\[\]]/g, "_")}`;
    const valueType = determineValueTypeFromPath(pathStr);
    const defaultValue = getMostCommonValue(values);

    const variations = new Map<string, unknown>();
    for (const value of values) {
      variations.set(JSON.stringify(value), value);
    }

    // NEW: Only create slot if values actually vary (more than 1 variation)
    // This ensures identical structures don't get unnecessary slots
    if (variations.size <= 1) {
      continue; // Skip - all instances have the same value
    }

    // Phase 2: Generate semantic name
    const semanticName = generateSemanticName(pathStr, valueType as SlotDefinition["valueType"]);

    slots.set(slotId, {
      slotId,
      nodePath: pathStr,
      valueType: valueType as SlotDefinition["valueType"],
      defaultValue,
      variations,
      instanceCount: instances.length,
      codeHint: generateCodeHint(valueType as SlotDefinition["valueType"], defaultValue, pathStr),
      semanticName,  // NEW: Semantic name for better LLM comprehension
    });
  }

  // Calculate similarity score
  const matchingPaths = structuralPaths.size - slots.size;
  const similarityScore = structuralPaths.size > 0
    ? matchingPaths / structuralPaths.size
    : 1;

  return {
    slots,
    similarityScore,
    totalPaths: structuralPaths.size,
    matchingPaths,
  };
}

/**
 * Calculates priority for a structural slot candidate
 */
function calculateStructuralSlotPriority(pathStr: string, path: NodePath): number {
  const depth = path.length;

  // Base priority: higher for shallower paths
  let priority = 100 - (depth * 10);

  // Boost for direct properties (not nested in children)
  if (!pathStr.includes('children')) {
    priority += 50;
  }

  // Boost for high-value properties
  if (pathStr.includes('text')) priority += 30;
  if (pathStr.includes('fills')) priority += 25;
  if (pathStr.includes('strokes')) priority += 20;

  // Penalize very deep paths
  if (depth > 4) priority -= 30;
  if (depth > 5) priority -= 50;

  return Math.max(0, priority);
}

/**
 * Collects all unique paths from a node tree
 */
function collectPaths(
  node: SimplifiedNode,
  currentPath: NodePath,
  paths: Set<string>
): void {
  // Add current path
  paths.add(pathToString(currentPath));

  // Collect property paths
  if (node.text !== undefined) {
    paths.add(pathToString([...currentPath, 'text']));
  }
  if (node.fills !== undefined) {
    paths.add(pathToString([...currentPath, 'fills']));
  }
  if (node.strokes !== undefined) {
    paths.add(pathToString([...currentPath, 'strokes']));
  }
  if (node.opacity !== undefined) {
    paths.add(pathToString([...currentPath, 'opacity']));
  }
  if (node.layout !== undefined) {
    paths.add(pathToString([...currentPath, 'layout']));
  }
  if (node.visible !== undefined) {
    paths.add(pathToString([...currentPath, 'visible']));
  }

  // Recurse into children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      collectPaths(node.children[i], [...currentPath, 'children', i], paths);
    }
  }
}

/**
 * Determines value type based on path
 */
function determineValueTypeFromPath(pathStr: string): string {
  if (pathStr.includes('text')) return 'text';
  if (pathStr.includes('fills')) return 'fills';
  if (pathStr.includes('strokes')) return 'strokes';
  if (pathStr.includes('opacity')) return 'opacity';
  if (pathStr.includes('visible')) return 'visibility';
  if (pathStr.includes('layout')) return 'property';
  return 'property';
}

/**
 * Gets the most common value from an array
 */
function getMostCommonValue(values: unknown[]): unknown {
  const counts = new Map<unknown, number>();
  let maxCount = 0;
  let mostCommon: unknown = values[0];

  for (const value of values) {
    const count = (counts.get(value) || 0) + 1;
    counts.set(value, count);
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  }

  return mostCommon;
}

/**
 * Collects all unique node paths across instances
 * Now includes property paths (text, fills, opacity, etc.)
 */
function collectAllPaths(instances: SimplifiedNode[]): Set<string> {
  const paths = new Set<string>();

  function collectPaths(node: SimplifiedNode, currentPath: NodePath): void {
    // Add current path (structural path to this node)
    paths.add(pathToString(currentPath));

    // Add property paths for this node
    if (node.text !== undefined) {
      paths.add(pathToString([...currentPath, 'text']));
    }
    if (node.fills !== undefined) {
      paths.add(pathToString([...currentPath, 'fills']));
    }
    if (node.strokes !== undefined) {
      paths.add(pathToString([...currentPath, 'strokes']));
    }
    if (node.opacity !== undefined) {
      paths.add(pathToString([...currentPath, 'opacity']));
    }
    if (node.layout !== undefined) {
      paths.add(pathToString([...currentPath, 'layout']));
    }
    if (node.visible !== undefined) {
      paths.add(pathToString([...currentPath, 'visible']));
    }

    // Recurse into children
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        collectPaths(node.children[i], [...currentPath, "children", i]);
      }
    }
  }

  for (const instance of instances) {
    collectPaths(instance, []);
  }

  return paths;
}

/**
 * Compares values at a specific path across instances
 */
function comparePath(
  instances: SimplifiedNode[],
  path: NodePath
): NodeComparison {
  const values: unknown[] = [];

  for (const instance of instances) {
    const value = getValueAtPath(instance, path);
    values.push(value);
  }

  // Compare all values
  const firstValue = values[0];
  const allEqual = values.every((v) => deepEqual(v, firstValue));

  return {
    path,
    equal: allEqual,
    value1: values[0],
    value2: values[1],
    differenceType: allEqual ? undefined : getDifferenceType(values),
  };
}

/**
 * Gets a value at a specific path in a node tree
 */
function getValueAtPath(node: SimplifiedNode, path: NodePath): unknown {
  let current: unknown = node;

  for (const key of path) {
    if (typeof key === "string") {
      current = (current as Record<string, unknown>)[key];
    } else if (typeof key === "number") {
      current = (current as unknown[])[key];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Determines the type of difference between values
 */
function getDifferenceType(values: unknown[]): "value" | "type" | "missing" | "extra" {
  const types = values.map((v) => {
    if (v === undefined || v === null) return "missing";
    return typeof v;
  });

  const uniqueTypes = new Set(types);

  if (uniqueTypes.has("missing")) {
    return "missing";
  }

  if (uniqueTypes.size > 1) {
    return "type";
  }

  return "value";
}

/**
 * Creates a slot definition from a comparison result
 * Phase 2: Adds semantic name generation for better LLM understanding
 */
function createSlotFromComparison(
  comparison: NodeComparison,
  instances: SimplifiedNode[]
): SlotDefinition | null {
  const pathStr = pathToString(comparison.path);
  // Update slot ID to use bracket notation safely
  const slotId = `slot_${pathStr.replace(/[\.\[\]]/g, "_")}`;

  // Determine value type
  const valueType = determineSlotValueType(comparison, instances);

  if (!valueType) {
    return null;
  }

  // Collect all variations
  const variations = new Map<string, unknown>();
  const valueCounts = new Map<unknown, number>();

  for (const instance of instances) {
    const value = getValueAtPath(instance, comparison.path);
    const valueKey = JSON.stringify(value);
    variations.set(valueKey, value);
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  }

  // Find default (most common) value
  let defaultValue = comparison.value1;
  let maxCount = 0;

  for (const [value, count] of valueCounts) {
    if (count > maxCount) {
      maxCount = count;
      defaultValue = value;
    }
  }

  // Phase 2: Generate semantic name for LLM understanding
  const semanticName = generateSemanticName(pathStr, valueType);

  return {
    slotId,
    nodePath: pathStr,
    valueType,
    defaultValue,
    variations,
    instanceCount: instances.length,
    codeHint: generateCodeHint(valueType, defaultValue, pathStr),
    semanticName,  // NEW: Semantic name for better LLM comprehension
  };
}

/**
 * Generates a semantic name for a slot based on its path and type
 * Helps LLMs understand the purpose of the slot
 * Examples: "icon-color", "button-text", "card-opacity"
 */
function generateSemanticName(pathStr: string, valueType: SlotDefinition["valueType"]): string {
  // Extract the last part of the path (property name)
  const pathParts = pathStr.split(/[.\[\]]+/).filter(p => p);
  const lastPart = pathParts[pathParts.length - 1] || "";

  // Extract potential parent context (e.g., "icon", "button", "card")
  let context = "";
  if (pathParts.length >= 2) {
    // Look for common UI element names
    const parentPart = pathParts[pathParts.length - 2] || "";
    context = parentPart.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  // Map property names to semantic terms
  const propertyMap: Record<string, string> = {
    'text': 'Text',
    'fills': 'Color',
    'strokes': 'Stroke',
    'opacity': 'Opacity',
    'visible': 'Visibility',
  };

  const propertySemantic = propertyMap[lastPart] || lastPart;

  // Combine context and property
  if (context && context !== propertySemantic) {
    // "Icon" + "Color" → "iconColor" → "icon-color" for readability
    const combined = context + propertySemantic;
    // Insert hyphen before capital letters (except first)
    return combined.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  return propertySemantic.toLowerCase();
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
 * Determines the slot value type based on the path and values
 */
function determineSlotValueType(
  comparison: NodeComparison,
  instances: SimplifiedNode[]
): SlotDefinition["valueType"] | null {
  const pathStr = pathToString(comparison.path);
  const value = comparison.value1;

  // Check path hints
  if (pathStr.includes("text")) {
    return "text";
  }
  if (pathStr.includes("fills")) {
    return "fills";
  }
  if (pathStr.includes("strokes")) {
    return "strokes";
  }
  if (pathStr.includes("opacity")) {
    return "opacity";
  }
  if (pathStr.includes("visible")) {
    return "visibility";
  }

  // Infer from value type
  if (typeof value === "string") {
    return "text";
  }
  if (typeof value === "number") {
    return "opacity";
  }
  if (typeof value === "boolean") {
    return "visibility";
  }
  if (Array.isArray(value)) {
    return "fills";
  }

  return null;
}

/**
 * Deep equality check for values
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
 * Converts a path array to string representation using bracket notation
 * Example: ["children", 0, "fills"] → "children[0].fills"
 * This matches JavaScript syntax for easier code generation
 */
export function pathToString(path: NodePath): string {
  return path.map((part, index) => {
    if (typeof part === 'number') {
      return `[${part}]`;
    }
    // Add dot before property names that come after brackets
    // Example: after "[0]" we need ".text"
    if (index > 0 && typeof path[index - 1] === 'number') {
      return `.${part}`;
    }
    return part;
  }).join('');
}

/**
 * Converts a string path with bracket notation to path array
 * Example: "children[0].fills" → ["children", 0, "fills"]
 * Handles both bracket notation children[0] and legacy children.0 formats
 */
export function stringToPath(pathStr: string): NodePath {
  const parts: (string | number)[] = [];
  const regex = /(?:^|\.)([^.\[]+)|\[(\d+)\]/g;
  let match;

  while ((match = regex.exec(pathStr)) !== null) {
    if (match[2] !== undefined) {
      // Bracket notation: [0]
      parts.push(parseInt(match[2], 10));
    } else if (match[1]) {
      // Property name
      parts.push(match[1]);
    }
  }

  return parts;
}

/**
 * Applies slot overrides to a node template
 *
 * @param template - Component template node
 * @param overrides - Slot overrides to apply
 * @returns Node with overrides applied
 */
export function applyOverrides(
  template: SimplifiedNode,
  overrides: Record<string, unknown>
): SimplifiedNode {
  const result = { ...template };

  for (const [slotId, value] of Object.entries(overrides)) {
    const path = stringToPath(slotId.replace(/^slot_/, ""));
    setValueAtPath(result, path, value);
  }

  // Recursively apply to children
  if (template.children) {
    result.children = template.children.map((child) =>
      applyOverrides(child, overrides)
    );
  }

  return result;
}

/**
 * Sets a value at a specific path in a node tree
 */
function setValueAtPath(
  node: SimplifiedNode,
  path: NodePath,
  value: unknown
): void {
  if (path.length === 0) {
    return;
  }

  const [key, ...rest] = path;

  if (rest.length === 0) {
    (node as unknown as Record<string, unknown>)[key as string] = value;
  } else {
    const next = (node as unknown as Record<string, unknown>)[key as string];
    if (next && typeof next === "object") {
      setValueAtPath(next as SimplifiedNode, rest, value);
    }
  }
}
