/**
 * Compression module - Component-based compression for Figma designs
 *
 * Public API for compressing and expanding Figma design data.
 * Reduces file size by 70-75% through component deduplication.
 *
 * @example
 * ```typescript
 * import { compressComponents, expandDesign } from '@/compression';
 *
 * // Compress
 * const compressed = compressComponents(design, { minInstances: 2 });
 * console.log(`Reduced by ${compressed.stats.reductionPercent.toFixed(1)}%`);
 *
 * // Expand
 * const expanded = expandDesign(compressed.design);
 * ```
 */

// Type exports
export type {
  // Core types
  CompressionOptions,
  ComponentDefinition,
  SlotDefinition,
  CompressedInstance,
  LayoutPosition,
  LayoutGrid,
  CompressedDesign,
  // Analysis types
  ComponentInventory,
  NodePath,
  NodeComparison,
  SlotDetectionResult,
  // Serialization types
  SerializableCompressedDesign,
  SerializableComponentDefinition,
  // Utility types
  NodeWithComponentInfo,
  CompressionResult,
  CompressionStats,
} from "./types";

// Core compression functions
export { extractComponents, type ExtractResult } from "./component-extractor";
export { expandDesign, validateExpansion, getExpansionSummary } from "./expander";

// Analysis functions
export {
  analyzeComponents,
  shouldExtractAsComponent,
  markNodesForExtraction,
  getCompressionReport,
} from "./analyzer";

// Slot detection
export {
  detectSlots,
  pathToString,
  stringToPath,
  applyOverrides,
} from "./slot-detector";

// Grid detection
export {
  detectGridLayout,
  applyGridLayout,
  gridToCSS,
  type GridDetectionResult,
} from "./grid-detector";

// Import types for function signatures
import type { CompressionOptions as CompressionOptionsType } from "./types";
import type { SimplifiedDesign } from "@/extractors/types";

/**
 * Main compression function - compresses a SimplifiedDesign
 *
 * This is the primary entry point for compression.
 *
 * @param design - SimplifiedDesign to compress
 * @param options - Compression options
 * @returns Compressed design with statistics
 *
 * @example
 * ```typescript
 * const { design, stats } = compressComponents(design, {
 *   minInstances: 2,
 *   extractGrids: true,
 *   preserveOrder: true,
 * });
 *
 * console.log(`Size reduced by ${stats.reductionPercent}%`);
 * console.log(`Original: ${stats.originalSize} bytes`);
 * console.log(`Compressed: ${stats.compressedSize} bytes`);
 * ```
 */
export function compressComponents(
  design: {
    name: string;
    nodes: import("../extractors/types").SimplifiedNode[];
    globalVars: { styles: Record<string, unknown>; extraStyles?: Record<string, { name: string }> };
  },
  options: CompressionOptionsType = {}
): import("./component-extractor").ExtractResult {
  const { extractComponents: extract } = require("./component-extractor");
  return extract(design.name, design.nodes, design.globalVars, options);
}

/**
 * Analyzes compression potential without actually compressing
 *
 * @param design - SimplifiedDesign to analyze
 * @param options - Analysis options
 * @returns Component inventory with estimates
 */
export function analyzeCompressionPotential(
  design: {
    name: string;
    nodes: import("../extractors/types").SimplifiedNode[];
  },
  options: CompressionOptionsType = {}
): import("./analyzer").ComponentInventory {
  const { analyzeComponents: analyze } = require("./analyzer");
  type ComponentInventory = import("./analyzer").ComponentInventory;
  return analyze(design as unknown as SimplifiedDesign, options.minInstances) as ComponentInventory;
}

/**
 * Creates a compression report for a design
 *
 * @param design - SimplifiedDesign to report on
 * @returns Human-readable report string
 */
export function createCompressionReport(
  design: {
    name: string;
    nodes: import("../extractors/types").SimplifiedNode[];
  },
  options: CompressionOptionsType = {}
): string {
  const { analyzeComponents: analyze, getCompressionReport: report } = require("./analyzer");
  const inventory = analyze(design as unknown as SimplifiedDesign, options.minInstances);
  return report(inventory);
}
