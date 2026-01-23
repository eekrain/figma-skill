/**
 * Component Analysis
 *
 * Main entry point for component intelligence.
 * Analyzes Figma components for variants, props, relationships,
 * usage patterns, and implementation readiness.
 *
 * Leverages the compression system for intelligent slot-based
 * prop inference, avoiding the duplicate work that Framelink's
 * approach requires.
 */
import type { CompressedDesign } from "@/compression/types";
import type { SimplifiedNode } from "@/extractors/types";

import { analyzeIndividualComponents } from "./analyze";
import { buildAtomicHierarchy, detectPatterns } from "./patterns";
import {
  assessImplementationReadiness,
  generateAnalysisSummary,
} from "./readiness";
import { analyzeRelationships } from "./relationships";
import type {
  ComponentAnalysis,
  ComponentAnalysisOptions,
  DesignSystemAnalysis,
} from "./types";
import { analyzeUsage } from "./usage";

// Re-export types for public API
export type * from "./types";

/**
 * Main entry point for component analysis
 *
 * Uses compression output as input for intelligent slot-based
 * prop inference, then optionally computes relationships and usage.
 *
 * @param compressed - Compressed design output from compressComponents()
 * @param allNodes - Original SimplifiedNode[] for relationship/usage analysis
 * @param options - Analysis options
 * @returns Complete design system analysis
 *
 * @example
 * import { compressComponents } from 'figma-skill/compression';
 * import { analyzeComponents } from 'figma-skill/analysis';
 *
 * const compressed = compressComponents(design);
 * const analysis = analyzeComponents(compressed, design.nodes, {
 *   includeCodeHints: true,
 *   includeRelationships: true,
 *   includeUsage: true,
 * });
 */
export function analyzeComponents(
  compressed: CompressedDesign,
  allNodes: SimplifiedNode[],
  options: ComponentAnalysisOptions = {}
): DesignSystemAnalysis {
  const {
    includeCodeHints = true,
    frameworks = ["react"],
    includeRelationships = true,
    includeUsage = true,
    includeStyling = false,
  } = options;

  // 1. Analyze individual components (using compression output)
  const components = analyzeIndividualComponents(
    compressed,
    allNodes,
    includeCodeHints,
    frameworks
  );

  // 2. Analyze relationships (optional, computationally expensive)
  const relationships = includeRelationships
    ? analyzeRelationships(compressed, allNodes)
    : {};

  // 3. Analyze usage statistics (optional, computationally expensive)
  const usage = includeUsage ? analyzeUsage(compressed, allNodes) : {};

  // 4. Detect design patterns
  const patterns = detectPatterns(components, relationships, usage);

  // 5. Build atomic hierarchy
  const atomicHierarchy = buildAtomicHierarchy(components);

  // 6. Assess implementation readiness
  const implementationReadiness = assessImplementationReadiness(components);

  // 7. Generate analysis summary
  const summary = generateAnalysisSummary(
    components,
    patterns,
    implementationReadiness
  );

  return {
    components,
    relationships,
    usage,
    patterns,
    atomicHierarchy,
    implementationReadiness,
    summary,
  };
}

// Re-export from submodules (for advanced users)
export { analyzeRelationships } from "./relationships";
export { analyzeUsage } from "./usage";
export { detectPatterns, buildAtomicHierarchy } from "./patterns";
export {
  assessImplementationReadiness,
  generateAnalysisSummary,
} from "./readiness";
export { generateCodeHints } from "./code-hints";
