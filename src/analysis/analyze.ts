/**
 * Core Component Analysis
 *
 * Analyzes individual components using compression output.
 * Leverages existing slot detection instead of re-implementing.
 */
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

import { generateCodeHints } from "./code-hints";
import { assessComponentReadiness } from "./readiness";
import type {
  AtomicLevel,
  CodeHints,
  ComponentAnalysis,
  ComponentVariant,
  InferredProp,
} from "./types";

/**
 * Analyze individual components using compression output
 * Leverages existing slot detection instead of re-implementing
 */
export function analyzeIndividualComponents(
  compressed: CompressedDesign,
  allNodes: SimplifiedNode[],
  includeCodeHints: boolean,
  frameworks: Array<"react" | "vue">
): Record<string, ComponentAnalysis> {
  const components: Record<string, ComponentAnalysis> = {};

  // Use for...of to properly iterate over Map entries
  for (const [key, componentTemplate] of compressed.components.entries()) {
    // Find component node (for structure analysis)
    const componentNode = findComponentNode(componentTemplate.id, allNodes);

    // Analyze variants from compression instances
    const variants = analyzeVariantsFromCompression(
      key,
      componentTemplate.id,
      compressed
    );

    // Convert slots Map to array for analysis
    const slotsArray = Array.from(componentTemplate.slots.values());

    // Build component template object with properties for inferPropsFromSlots
    // Handle both test mock structure (with 'properties') and real structure (with 'componentProperties')
    const componentTemplateWithProps = {
      properties:
        (componentTemplate as any).properties ||
        componentTemplate.componentProperties ||
        {},
    };

    // Infer props from compression slots (KEY INNOVATION!)
    const props = inferPropsFromSlots(slotsArray, componentTemplateWithProps);

    // Classify atomic level
    const atomicLevel = classifyAtomicLevel(componentNode, variants);

    // Assess readiness
    const readiness = assessComponentReadiness(
      componentNode,
      props,
      variants,
      slotsArray
    );

    // Generate code hints
    const codeHints = includeCodeHints
      ? generateCodeHints(componentTemplate.name, props, frameworks)
      : {};

    // Generate tags
    const tags = generateTags(componentTemplate.name, atomicLevel, props);

    // Handle both test mock structure (with 'description') and real structure
    const description = (componentTemplate as any).description;

    components[key] = {
      key,
      id: componentTemplate.id,
      name: componentTemplate.name,
      description,
      atomicLevel,
      tags,
      variants,
      props,
      slots: slotsArray,
      readiness,
      codeHints,
    };
  }

  return components;
}

/**
 * Analyze variants from compression instances
 * Uses the already-grouped instances from compression
 */
function analyzeVariantsFromCompression(
  componentKey: string,
  componentId: string,
  compressed: CompressedDesign
): ComponentVariant[] {
  const variants: ComponentVariant[] = [];

  // Get all instances for this component (instances is already an array)
  const instances = (compressed.instances || []).filter(
    (inst) => inst.componentId === componentId
  );

  // Build variant set from instance overrides
  const variantMap = new Map<string, ComponentVariant>();

  for (const instance of instances) {
    // Extract variant properties from instance overrides
    const variantProps = instance.overrides || {};

    // Determine variant name from instance properties or naming
    const variantName =
      instance.name || Object.values(variantProps).join(" / ") || "Default";

    // Determine property type from instance structure
    const property = inferVariantProperty(instance, compressed);

    const variant: ComponentVariant = {
      name: variantName,
      property,
      value: variantName,
      componentId: instance.id,
      instanceCount: (variantMap.get(variantName)?.instanceCount || 0) + 1,
    };

    variantMap.set(variantName, variant);
  }

  return Array.from(variantMap.values());
}

/**
 * Infer props from compression slots (KEY INNOVATION over Framelink)
 * The compression system already detected what varies across instances
 * We just need to map slots to props intelligently
 */
function inferPropsFromSlots(
  slots: unknown[],
  componentTemplate: { properties?: Record<string, unknown> }
): InferredProp[] {
  const props: InferredProp[] = [];

  for (const slot of slots as Array<{
    semanticName?: string;
    nodePath?: string;
    valueType?: string;
    variations?: Map<string, unknown>;
  }>) {
    // Skip slots with no variations (not props)
    if (!slot.variations || slot.variations.size <= 1) continue;

    const prop = inferPropFromSlot(slot);
    props.push(prop);
  }

  // Also include component properties from Figma
  if (componentTemplate.properties) {
    for (const [propName, propDef] of Object.entries(
      componentTemplate.properties
    )) {
      props.push(inferFigmaProperty(propName, propDef));
    }
  }

  return props;
}

/**
 * Infer a single prop from a compression slot
 * Maps slot valueType to appropriate prop type
 */
function inferPropFromSlot(slot: {
  semanticName?: string;
  nodePath?: string;
  valueType?: string;
  variations?: Map<string, unknown>;
}): InferredProp {
  const { semanticName, nodePath, valueType, variations } = slot;

  // valueType: "property" - direct Figma component property
  if (valueType === "property") {
    return inferFigmaProperty(semanticName || nodePath || "", slot);
  }

  // valueType: "text" - content slot
  if (valueType === "text") {
    return {
      name: toCamelCase(semanticName || nodePath || "content"),
      type: "ReactNode",
      required: false,
      description: semanticName || `Content for ${nodePath}`,
    };
  }

  // valueType: "fills" | "strokes" - color slot
  if (valueType === "fills" || valueType === "strokes") {
    const values = Array.from(variations?.values() || []);
    const uniqueColors = new Set(values);

    return {
      name: toCamelCase(semanticName || "color"),
      type:
        uniqueColors.size > 1 && uniqueColors.size <= 10 ? "enum" : "string",
      enumValues:
        uniqueColors.size <= 10
          ? (Array.from(uniqueColors) as string[])
          : undefined,
      required: false,
      description: `${valueType} color for ${semanticName || nodePath}`,
    };
  }

  // valueType: "visibility" - boolean slot
  if (valueType === "visibility") {
    return {
      name: `show${toPascalCase(semanticName || nodePath || "")}`,
      type: "boolean",
      defaultValue: String(
        variations?.get("true") !== undefined ? true : false
      ),
      required: false,
      description: `Show/hide ${semanticName || nodePath}`,
    };
  }

  // valueType: "opacity" - opacity slot
  if (valueType === "opacity") {
    const values = Array.from(variations?.values() || []);
    const uniqueValues = new Set(values);

    return {
      name: `${toCamelCase(semanticName || nodePath || "")}Opacity`,
      type:
        uniqueValues.size > 1 && uniqueValues.size <= 10 ? "enum" : "string",
      enumValues:
        uniqueValues.size <= 10
          ? (Array.from(uniqueValues) as string[])
          : undefined,
      required: false,
      description: `Opacity for ${semanticName || nodePath}`,
    };
  }

  // Default fallback
  return {
    name: toCamelCase(semanticName || nodePath || "prop"),
    type: "string",
    required: false,
    description: `Property for ${semanticName || nodePath}`,
  };
}

/**
 * Infer prop from Figma component property definition
 */
function inferFigmaProperty(propName: string, propDef: unknown): InferredProp {
  const def = propDef as {
    type?: string;
    defaultValue?: unknown;
    description?: string;
    variantOptions?: string[];
  };

  const propType = def.type || "string";

  switch (propType) {
    case "BOOLEAN":
      return {
        name: propName,
        type: "boolean",
        defaultValue: String(def.defaultValue || false),
        required: false,
        description: def.description,
      };

    case "TEXT":
      return {
        name: propName,
        type: "string",
        defaultValue: def.defaultValue as string | undefined,
        required: false,
        description: def.description,
      };

    case "VARIANT":
      return {
        name: propName,
        type: "enum",
        enumValues: def.variantOptions || [],
        defaultValue: def.defaultValue as string | undefined,
        required: false,
        description: def.description,
      };

    default:
      return {
        name: propName,
        type: "string",
        required: false,
        description: def.description || `Component property: ${propName}`,
      };
  }
}

/**
 * Infer variant property from instance/structure
 */
function inferVariantProperty(
  instance: { name?: string; overrides?: Record<string, unknown> },
  compressed: CompressedDesign
): string {
  const name = (instance.name || "").toLowerCase();

  // Size variants
  if (["xs", "sm", "md", "lg", "xl", "2xl"].includes(name)) {
    return "size";
  }
  if (["small", "medium", "large", "mini", "tiny"].includes(name)) {
    return "size";
  }

  // State variants
  if (
    ["default", "hover", "active", "pressed", "disabled", "focus"].includes(
      name
    )
  ) {
    return "state";
  }

  // Variant types
  if (["primary", "secondary", "tertiary", "ghost", "outline"].includes(name)) {
    return "variant";
  }

  // Icon variants
  if (["icon", "icon-only", "with-icon", "no-icon"].includes(name)) {
    return "icon";
  }

  return "variant";
}

/**
 * Classify component by atomic design level
 * Based on node depth, children count, and complexity
 */
function classifyAtomicLevel(
  node: SimplifiedNode | undefined,
  variants: ComponentVariant[]
): AtomicLevel {
  if (!node) return "molecules";

  const maxDepth = getMaxNodeDepth(node);
  const childCount = countChildren(node);
  const variantCount = variants.length;

  // Atoms: Simple, few/no children, basic elements
  if (childCount === 0 && maxDepth === 0) {
    return "atoms";
  }

  // Molecules: Simple composition, 2-5 children, shallow depth
  if (childCount <= 5 && maxDepth <= 2) {
    return "molecules";
  }

  // Organisms: Complex composition, more children
  if (childCount <= 20 && maxDepth <= 3) {
    return "organisms";
  }

  // Templates: Page-level structures
  if (childCount > 20 || maxDepth > 3) {
    return "templates";
  }

  return "organisms";
}

/**
 * Generate component tags for discovery
 */
function generateTags(
  componentName: string,
  atomicLevel: AtomicLevel,
  props: InferredProp[]
): string[] {
  const tags: string[] = [atomicLevel];

  const lowerName = componentName.toLowerCase();

  // Detect component types from name
  if (lowerName.includes("button")) {
    tags.push("button", "interactive");
  }
  if (lowerName.includes("input") || lowerName.includes("field")) {
    tags.push("input", "form");
  }
  if (lowerName.includes("card")) {
    tags.push("card", "container");
  }
  if (lowerName.includes("icon")) {
    tags.push("icon", "graphic");
  }
  if (lowerName.includes("link")) {
    tags.push("link", "navigation");
  }

  // Detect prop-based tags
  if (props.some((p) => p.name === "href" || p.name === "to")) {
    tags.push("link", "navigation");
  }
  if (props.some((p) => p.name === "onClick")) {
    tags.push("interactive");
  }

  return tags;
}

/**
 * Find component node by ID
 */
function findComponentNode(
  componentId: string,
  allNodes: SimplifiedNode[]
): SimplifiedNode | undefined {
  function traverse(nodes: SimplifiedNode[]): SimplifiedNode | undefined {
    for (const node of nodes) {
      if (node.id === componentId || node.componentId === componentId) {
        return node;
      }
      if (node.children) {
        const found = traverse(node.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  return traverse(allNodes);
}

/**
 * Get maximum depth of a node tree
 */
function getMaxNodeDepth(node: SimplifiedNode, currentDepth = 0): number {
  if (!node.children || node.children.length === 0) return currentDepth;
  return Math.max(
    ...node.children.map((child) => getMaxNodeDepth(child, currentDepth + 1))
  );
}

/**
 * Count all children in a node tree
 */
function countChildren(node: SimplifiedNode): number {
  if (!node.children) return 0;
  return (
    node.children.length +
    node.children.reduce((sum, child) => sum + countChildren(child), 0)
  );
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
