/**
 * Design Pattern Detection
 *
 * Detects design patterns across components including
 * common naming patterns, prop patterns, and component families.
 */
import type { ComponentAnalysis } from "./types";
import type { AtomicHierarchy, DesignPattern } from "./types";

/**
 * Detect design patterns across components
 * @param components - All analyzed components
 * @param relationships - Component relationships (optional)
 * @param usage - Component usage statistics (optional)
 * @returns Array of detected design patterns
 */
export function detectPatterns(
  components: Record<string, ComponentAnalysis>,
  relationships?: Record<string, unknown>,
  usage?: Record<string, unknown>
): DesignPattern[] {
  const patterns: DesignPattern[] = [];
  const componentValues = Object.values(components);

  // Detect button patterns
  const buttonComponents = componentValues.filter((c) => isButtonComponent(c));
  if (buttonComponents.length > 0) {
    patterns.push({
      name: "Button System",
      description: "Consistent button variations across the design",
      components: buttonComponents.map((c) => c.key),
      usage: "Use appropriate button variant based on hierarchy and context",
      implementation:
        "Implement with variant prop system for different styles (primary, secondary, ghost, etc.)",
    });
  }

  // Detect card patterns
  const cardComponents = componentValues.filter((c) =>
    c.name.toLowerCase().includes("card")
  );
  if (cardComponents.length > 0) {
    patterns.push({
      name: "Card Pattern",
      description: "Reusable card components for content display",
      components: cardComponents.map((c) => c.key),
      usage: "Use for displaying grouped content with consistent styling",
      implementation:
        "Implement as flexible container with configurable content slots",
    });
  }

  // Detect form input patterns
  const inputComponents = componentValues.filter(
    (c) =>
      c.name.toLowerCase().includes("input") ||
      c.name.toLowerCase().includes("field") ||
      c.name.toLowerCase().includes("textbox")
  );
  if (inputComponents.length > 0) {
    patterns.push({
      name: "Form Input System",
      description: "Consistent form input components",
      components: inputComponents.map((c) => c.key),
      usage: "Use for user input with consistent validation and styling",
      implementation: "Implement with label, error, and helper text support",
    });
  }

  // Detect navigation patterns
  const navComponents = componentValues.filter(
    (c) =>
      c.name.toLowerCase().includes("nav") ||
      c.name.toLowerCase().includes("menu") ||
      c.name.toLowerCase().includes("header")
  );
  if (navComponents.length > 0) {
    patterns.push({
      name: "Navigation Pattern",
      description: "Navigation and menu components",
      components: navComponents.map((c) => c.key),
      usage: "Use for site navigation and menu structures",
      implementation: "Implement with active state and hierarchical support",
    });
  }

  // Detect size scale patterns
  const sizeScalePatterns = detectSizeScalePatterns(componentValues);
  for (const pattern of sizeScalePatterns) {
    patterns.push(pattern);
  }

  // Detect color variant patterns
  const colorVariantPatterns = detectColorVariantPatterns(componentValues);
  for (const pattern of colorVariantPatterns) {
    patterns.push(pattern);
  }

  return patterns;
}

/**
 * Build atomic hierarchy from analyzed components
 */
export function buildAtomicHierarchy(
  components: Record<string, ComponentAnalysis>
): AtomicHierarchy {
  const hierarchy: AtomicHierarchy = {
    atoms: [],
    molecules: [],
    organisms: [],
    templates: [],
    pages: [],
  };

  for (const [key, component] of Object.entries(components)) {
    hierarchy[component.atomicLevel].push(key);
  }

  return hierarchy;
}

/**
 * Check if a component is a button
 */
function isButtonComponent(component: ComponentAnalysis): boolean {
  const name = component.name.toLowerCase();
  return (
    name.includes("button") ||
    name.includes("btn") ||
    (name.includes("cta") && component.tags.includes("interactive"))
  );
}

/**
 * Detect size scale patterns across components
 */
function detectSizeScalePatterns(
  components: ComponentAnalysis[]
): DesignPattern[] {
  const patterns: DesignPattern[] = [];
  const sizeProps = new Map<string, Set<string>>();

  // Group size values by prop name
  for (const component of components) {
    for (const prop of component.props) {
      if (
        (prop.name === "size" || prop.name.endsWith("Size")) &&
        prop.enumValues
      ) {
        if (!sizeProps.has(prop.name)) {
          sizeProps.set(prop.name, new Set());
        }
        for (const value of prop.enumValues) {
          sizeProps.get(prop.name)!.add(value);
        }
      }
    }
  }

  // Detect common size scales
  for (const [propName, values] of sizeProps.entries()) {
    const sortedValues = Array.from(values).sort();
    if (sortedValues.length >= 2) {
      const componentsWithSize = components.filter((c) =>
        c.props.some(
          (p) => p.name === propName && p.enumValues && p.enumValues.length > 0
        )
      );

      patterns.push({
        name: `Size Scale: ${propName}`,
        description: `Consistent ${propName} scale across components`,
        components: componentsWithSize.map((c) => c.key),
        usage: `Use ${propName} prop with values: ${sortedValues.join(", ")}`,
        implementation: "Define size scale as shared constants or enum type",
      });
    }
  }

  return patterns;
}

/**
 * Detect color variant patterns across components
 */
function detectColorVariantPatterns(
  components: ComponentAnalysis[]
): DesignPattern[] {
  const patterns: DesignPattern[] = [];
  const variantProps = new Map<string, Set<string>>();

  // Group variant values by prop name
  for (const component of components) {
    for (const prop of component.props) {
      if (
        (prop.name === "variant" ||
          prop.name === "color" ||
          prop.name === "theme") &&
        prop.enumValues
      ) {
        if (!variantProps.has(prop.name)) {
          variantProps.set(prop.name, new Set());
        }
        for (const value of prop.enumValues) {
          variantProps.get(prop.name)!.add(value);
        }
      }
    }
  }

  // Detect common variant scales
  for (const [propName, values] of variantProps.entries()) {
    const sortedValues = Array.from(values).sort();
    if (sortedValues.length >= 2) {
      const componentsWithVariant = components.filter((c) =>
        c.props.some(
          (p) => p.name === propName && p.enumValues && p.enumValues.length > 0
        )
      );

      patterns.push({
        name: `Color Variant: ${propName}`,
        description: `Consistent ${propName} variants across components`,
        components: componentsWithVariant.map((c) => c.key),
        usage: `Use ${propName} prop with values: ${sortedValues.join(", ")}`,
        implementation:
          "Define variants as shared constants or enum type with semantic naming",
      });
    }
  }

  return patterns;
}
