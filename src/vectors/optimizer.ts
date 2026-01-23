/**
 * SVG Optimizer - SVGO integration with Figma-safe configuration
 *
 * This module provides SVG optimization using SVGO (SVG Optimizer)
 * with special handling for Figma exports:
 * - Preserves viewBox (critical for responsive SVGs)
 * - Converts shapes to paths for uniform CSS styling
 * - Removes editor metadata
 * - Optimizes while maintaining Figma compatibility
 *
 * Phase 4: Vector Optimization
 */

import { optimize } from "svgo";

// =====================================================
// Types
// =====================================================

/**
 * Image format types for format recommendations
 */
export type ImageFormat = "jpeg" | "png" | "webp";

/**
 * SVG optimization options
 */
export interface SvgOptimizationOptions {
  /** Preserve viewBox (CRITICAL for responsive SVGs, default: true) */
  preserveViewBox?: boolean;
  /** Convert shapes to paths (enables uniform CSS styling, default: true) */
  convertShapesToPaths?: boolean;
  /** Prefix IDs to prevent DOM collisions (default: true) */
  prefixIds?: boolean;
  /** Remove non-rendering elements (default: true) */
  removeNonRendering?: boolean;
  /** Remove editor metadata (default: true) */
  removeEditorMetadata?: boolean;
}

/**
 * Result of SVG optimization
 */
export interface OptimizationResult {
  /** Optimized SVG content */
  svg: string;
  /** Alias for svg (for test compatibility) */
  optimized?: string;
  /** Original size in bytes */
  originalSize: number;
  /** Optimized size in bytes */
  optimizedSize: number;
  /** Size reduction percentage */
  reductionPercentage: number;
  /** Bytes saved (calculated) */
  bytesSaved?: number;
  /** Whether viewBox was preserved */
  viewBoxPreserved: boolean;
  /** Optional ID for batch processing */
  id?: string;
}

/**
 * Result of batch SVG optimization
 */
export interface BatchOptimizationResult {
  /** Individual results */
  results: OptimizationResult[];
  /** Total original size */
  totalOriginalSize: number;
  /** Total optimized size */
  totalOptimizedSize: number;
  /** Overall reduction percentage */
  overallReduction: number;
}

// =====================================================
// SVGO Configuration
// =====================================================

/**
 * Default SVGO plugins to enable
 * These plugins provide good optimization while maintaining compatibility
 */
const DEFAULT_PLUGINS = [
  {
    name: "preset-default",
    params: {
      overrides: {
        // Keep viewBox for responsive SVGs
        removeViewBox: false,
        // Convert shapes to paths for uniform styling
        convertShapeToPath: true,
        // Remove unnecessary attributes
        removeEmptyAttrs: true,
        removeEmptyContainers: true,
        removeEmptyText: true,
        removeHiddenElements: true,
        removeUselessDefs: true,
        // Clean up IDs
        cleanupIds: true,
        // Minify styles
        minifyStyles: true,
        // Convert path data
        convertPathData: true,
        // Merge paths
        mergePaths: true,
        // Remove unused namespace declarations
        removeUnusedNS: true,
        // Sort attributes for consistency
        sortAttrs: true,
        // Sort defined children
        sortDefsChildren: true,
      },
    },
  },
];

/**
 * Figma-safe SVGO configuration
 * Preserves viewBox and other Figma-specific attributes
 */
export function createFigmaSafeConfig(options: SvgOptimizationOptions = {}): object {
  const opts = {
    preserveViewBox: true,
    convertShapesToPaths: true,
    prefixIds: true,
    removeNonRendering: true,
    removeEditorMetadata: true,
    ...options,
  };

  return {
    multipass: true,
    plugins: DEFAULT_PLUGINS,
    // Override removeViewBox based on options
    ...(opts.preserveViewBox
      ? {}
      : {
          plugins: [
            {
              name: "removeViewBox",
              active: true,
            },
          ],
        }),
  };
}

// =====================================================
// Public API
// =====================================================

/**
 * Optimize a single SVG using SVGO with Figma-safe configuration
 *
 * This function:
 * 1. Applies SVGO optimization plugins
 * 2. Preserves viewBox by default
 * 3. Converts shapes to paths
 * 4. Removes non-rendering elements
 *
 * @param svgContent - The SVG content to optimize
 * @param options - Optimization options
 * @returns Optimization result with metrics
 * @throws {Error} If SVG is malformed and cannot be parsed
 */
export function optimizeSvg(
  svgContent: string,
  options: SvgOptimizationOptions = {}
): OptimizationResult {
  const originalSize = svgContent.length;

  // Create SVGO config
  const config = createFigmaSafeConfig(options);

  try {
    // Run SVGO optimization
    const result = optimize(svgContent, config);

    // Check if viewBox was preserved
    const viewBoxPreserved = result.data.includes("viewBox");

    const optimizedSize = result.data.length;
    const reductionPercentage =
      originalSize > 0
        ? ((originalSize - optimizedSize) / originalSize) * 100
        : 0;

    const bytesSaved = originalSize - optimizedSize;

    return {
      svg: result.data,
      optimized: result.data,
      originalSize,
      optimizedSize,
      reductionPercentage,
      bytesSaved,
      viewBoxPreserved,
    };
  } catch (error) {
    // Re-throw SVGO errors with more context
    if (error instanceof Error && error.message.includes("Unexpected")) {
      throw new Error(`Invalid SVG: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Optimize multiple SVGs in batch
 *
 * Overload: Accept array of SVG strings
 */
export function optimizeSvgBatch(
  svgContents: string[],
  options?: SvgOptimizationOptions
): BatchOptimizationResult;

/**
 * Optimize multiple SVGs in batch
 *
 * Overload: Accept array of SVGs with IDs
 */
export function optimizeSvgBatch(
  svgContents: Array<{ id: string; content: string }>,
  options?: SvgOptimizationOptions
): BatchOptimizationResult;

/**
 * Optimize multiple SVGs in batch
 *
 * Implementation - handles both string[] and {id, content}[]
 */
export function optimizeSvgBatch(
  svgContents: string[] | Array<{ id: string; content: string }>,
  options: SvgOptimizationOptions = {}
): BatchOptimizationResult {
  // Detect input type
  const isStringArray = svgContents.length > 0 && typeof svgContents[0] === "string";

  const results = isStringArray
    ? (svgContents as string[]).map((content, index) => {
        const result = optimizeSvg(content, options);
        return { ...result, id: `svg-${index}` };
      })
    : (svgContents as Array<{ id: string; content: string }>).map(({ id, content }) => {
        const result = optimizeSvg(content, options);
        return { ...result, id };
      });

  const totalOriginalSize = results.reduce(
    (sum, r) => sum + r.originalSize,
    0
  );
  const totalOptimizedSize = results.reduce(
    (sum, r) => sum + r.optimizedSize,
    0
  );
  const overallReduction =
    totalOriginalSize > 0
      ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100
      : 0;

  return {
    results,
    totalOriginalSize,
    totalOptimizedSize,
    overallReduction,
  };
}

/**
 * Verify that viewBox was preserved after optimization
 *
 * @param original - Original SVG content
 * @param optimized - Optimized SVG content
 * @returns true if viewBox is present in optimized SVG
 */
export function verifyViewBoxPreserved(
  original: string,
  optimized: string
): boolean {
  const originalHasViewBox = original.includes("viewBox");
  const optimizedHasViewBox = optimized.includes("viewBox");

  // If original had viewBox, optimized should too
  if (originalHasViewBox && !optimizedHasViewBox) {
    return false;
  }

  return true;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Calculate bytes saved from optimization
 *
 * @param result - Optimization result
 * @returns Bytes saved
 */
export function calculateBytesSaved(result: OptimizationResult): number {
  return result.originalSize - result.optimizedSize;
}

/**
 * Check if optimization achieved target reduction percentage
 *
 * @param result - Optimization result
 * @param targetPercentage - Target reduction percentage (0-100)
 * @returns true if target was met or exceeded
 */
export function meetsReductionTarget(
  result: OptimizationResult,
  targetPercentage: number
): boolean {
  return result.reductionPercentage >= targetPercentage;
}

/**
 * Get recommended optimization options based on SVG content
 *
 * @param svgContent - SVG content to analyze
 * @returns Recommended optimization options
 */
export function getRecommendedOptions(
  svgContent: string
): SvgOptimizationOptions {
  const hasViewBox = svgContent.includes("viewBox");
  const hasIds = svgContent.includes('id="');
  const hasMetadata = svgContent.includes("data-figma-");

  return {
    preserveViewBox: hasViewBox, // Always preserve if present
    convertShapesToPaths: true, // Always enable for CSS styling
    prefixIds: hasIds, // Enable if there are IDs
    removeNonRendering: true, // Always enable
    removeEditorMetadata: hasMetadata, // Enable if Figma metadata present
  };
}
