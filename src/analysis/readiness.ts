/**
 * Component Readiness Assessment
 *
 * Assesses component readiness for implementation including
 * missing specifications, warnings, and suggestions.
 */
import type { SlotDefinition } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

import type {
  AnalysisSummary,
  ComponentAnalysis,
  ComponentReadiness,
  ComponentVariant,
  ImplementationReadiness,
  InferredProp,
} from "./types";

/**
 * Assess readiness for a single component
 */
export function assessComponentReadiness(
  node: SimplifiedNode | undefined,
  props: InferredProp[],
  variants: ComponentVariant[],
  slots: SlotDefinition[]
): ComponentReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for missing specifications
  if (props.length === 0) {
    warnings.push("No props inferred - component may not be configurable");
  }

  if (variants.length === 0) {
    suggestions.push(
      "Consider adding component variants for different states/sizes"
    );
  }

  // Check for missing accessibility
  const hasA11yProps = checkAccessibilityProps(node, props);
  if (!hasA11yProps) {
    warnings.push(
      "No accessibility properties detected (role, aria-label, etc.)"
    );
    suggestions.push("Add ARIA attributes for better accessibility");
  }

  // Check for missing interactive states
  if (node?.type === "INSTANCE" && !hasStateVariants(variants)) {
    suggestions.push(
      "Consider adding hover/active/disabled states for interactive components"
    );
  }

  // Check slot coverage
  if (slots.length > 0 && props.length === 0) {
    warnings.push(
      "Component has slots but no props - may be missing configuration options"
    );
  }

  // Check for semantic naming
  if (node && !hasSemanticName(node)) {
    suggestions.push("Consider using more semantic component naming");
  }

  // Calculate readiness score
  let score = 100;
  score -= missing.length * 25;
  score -= warnings.length * 10;
  score -= suggestions.length * 5;

  return {
    score: Math.max(0, score),
    ready: missing.length === 0 && score >= 70,
    missing,
    warnings,
    suggestions,
  };
}

/**
 * Assess implementation readiness for all components
 */
export function assessImplementationReadiness(
  components: Record<string, ComponentAnalysis>
): ImplementationReadiness {
  const readyToImplement: string[] = [];
  const needsSpecification: string[] = [];
  const hasIssues: string[] = [];
  const suggestions: string[] = [];

  for (const [key, component] of Object.entries(components)) {
    if (component.readiness.ready) {
      readyToImplement.push(key);
    } else if (component.readiness.missing.length > 0) {
      hasIssues.push(key);
    } else {
      needsSpecification.push(key);
    }

    // Collect unique suggestions
    for (const suggestion of component.readiness.suggestions) {
      if (!suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }
  }

  // Add overall suggestions
  if (needsSpecification.length > 0) {
    suggestions.push("Add more variant examples for better prop inference");
  }

  if (
    hasIssues.some((key) =>
      components[key].readiness.warnings.some((w) =>
        w.includes("accessibility")
      )
    )
  ) {
    suggestions.push(
      "Ensure all interactive components have proper accessibility attributes"
    );
  }

  const complexComponents = Object.values(components).filter(
    (c) => c.atomicLevel === "organisms" || c.atomicLevel === "templates"
  );

  if (complexComponents.length > 0) {
    suggestions.push(
      "Consider breaking down complex organisms into smaller molecules"
    );
  }

  return {
    readyToImplement,
    needsSpecification,
    hasIssues,
    suggestions,
  };
}

/**
 * Generate analysis summary with scores
 */
export function generateAnalysisSummary(
  components: Record<string, ComponentAnalysis>,
  patterns: unknown[],
  readiness: ImplementationReadiness
): AnalysisSummary {
  const componentValues = Object.values(components);

  const byCategory: Record<string, number> = {
    atoms: componentValues.filter((c) => c.atomicLevel === "atoms").length,
    molecules: componentValues.filter((c) => c.atomicLevel === "molecules")
      .length,
    organisms: componentValues.filter((c) => c.atomicLevel === "organisms")
      .length,
    templates: componentValues.filter((c) => c.atomicLevel === "templates")
      .length,
    pages: componentValues.filter((c) => c.atomicLevel === "pages").length,
  };

  const complexityScore = Math.min(
    100,
    componentValues.length * 5 + patterns.length * 10
  );

  const consistencyScore =
    componentValues.length > 0
      ? Math.min(
          100,
          (readiness.readyToImplement.length / componentValues.length) * 100
        )
      : 0;

  let implementationEffort: "low" | "medium" | "high" = "medium";
  if (componentValues.length < 10) {
    implementationEffort = "low";
  } else if (componentValues.length > 30 || complexityScore > 70) {
    implementationEffort = "high";
  }

  const keyRecommendations: string[] = [];

  keyRecommendations.push(
    `Found ${componentValues.length} components across ${patterns.length} design patterns`
  );

  keyRecommendations.push(
    `${readiness.readyToImplement.length} components are ready for implementation`
  );

  if (byCategory.atom > 0) {
    keyRecommendations.push(
      `Focus on implementing ${byCategory.atom} atoms first as building blocks`
    );
  }

  if (consistencyScore < 70) {
    keyRecommendations.push(
      "Consider standardizing component variants and properties"
    );
  } else {
    keyRecommendations.push("Component system shows good consistency");
  }

  if (readiness.needsSpecification.length > 0) {
    keyRecommendations.push(
      `${readiness.needsSpecification.length} components need more specification`
    );
  }

  return {
    totalComponents: componentValues.length,
    byCategory,
    complexityScore,
    consistencyScore,
    implementationEffort,
    keyRecommendations,
  };
}

/**
 * Check if node has accessibility properties
 */
function checkAccessibilityProps(
  node: SimplifiedNode | undefined,
  props: InferredProp[]
): boolean {
  if (!node) return false;

  // Check for accessibility-related props
  const a11yPropNames = [
    "role",
    "ariaLabel",
    "aria-describedby",
    "aria-labelledby",
  ];
  if (props.some((p) => a11yPropNames.includes(p.name))) {
    return true;
  }

  // Check for interactive elements that should have accessibility
  if (node.type === "INSTANCE" && isInteractiveComponent(node)) {
    return false;
  }

  return true;
}

/**
 * Check if variants include states
 */
function hasStateVariants(variants: ComponentVariant[]): boolean {
  return variants.some((v) => v.property === "state");
}

/**
 * Check if node has semantic name
 */
function hasSemanticName(node: SimplifiedNode): boolean {
  const name = node.name?.toLowerCase() || "";
  const semanticPatterns = [
    "button",
    "input",
    "card",
    "dialog",
    "modal",
    "navigation",
    "header",
    "footer",
  ];
  return semanticPatterns.some((pattern) => name.includes(pattern));
}

/**
 * Check if component is interactive
 */
function isInteractiveComponent(node: SimplifiedNode): boolean {
  const name = node.name?.toLowerCase() || "";
  const interactivePatterns = [
    "button",
    "link",
    "input",
    "checkbox",
    "radio",
    "switch",
    "slider",
  ];
  return interactivePatterns.some((pattern) => name.includes(pattern));
}
