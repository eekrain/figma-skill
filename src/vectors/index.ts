/**
 * Vectors module - SVG optimization, deduplication, and sprite generation
 *
 * This module provides comprehensive SVG handling for Figma designs:
 * - Canonicalization for content-addressable storage
 * - SVGO-based optimization with Figma-safe configuration
 * - SHA-256 based deduplication
 * - SVG sprite generation for reduced HTTP requests
 *
 * Phase 4: Vector Optimization
 */

// =====================================================
// Convenience wrappers for testing (synchronous API)
// =====================================================

export {
  canonicalizeSvg,
  deduplicateSvgs,
} from "./integrations/optimization-pipeline.js";

// =====================================================
// Canonicalization
// =====================================================

export {
  canonicalizeSvg as canonicalizeSvgAsync,
  parseSvg,
  normalizeAttributes,
  removeNonRenderingAttributes,
  sortAttributes,
  serializeCanonical,
  computeHash,
  isNonRenderingAttribute,
  isPreservedAttribute,
  type CanonicalizedSVG,
  type CanonicalizerOptions,
  type ParsedSVG,
} from "./canonicalizer.js";

// =====================================================
// Optimization
// =====================================================

export {
  optimizeSvg,
  optimizeSvgBatch,
  createFigmaSafeConfig,
  verifyViewBoxPreserved,
  calculateBytesSaved,
  meetsReductionTarget,
  getRecommendedOptions,
  type SvgOptimizationOptions,
  type OptimizationResult,
  type BatchOptimizationResult,
} from "./optimizer.js";

// =====================================================
// Deduplication
// =====================================================

export {
  deduplicateSvgs as deduplicateSvgsAsync,
  findDuplicateGroups,
  groupByHash,
  calculateSpaceSavings,
  getDeduplicationStats,
  areDuplicates,
  type DeduplicationInput,
  type DeduplicationResult as DeduplicationResultAsync,
  type DeduplicationOptions,
  type DuplicateGroup,
} from "./deduplicator.js";

// Export the simplified deduplication result type from integrations
export type { SimpleDeduplicationResult as DeduplicationResult } from "./integrations/optimization-pipeline.js";

// =====================================================
// Sprite Generation
// =====================================================

export {
  generateSprite,
  extractSymbolContent,
  generateSymbolId,
  generateSpriteUsageDocumentation,
  generateHtmlExample,
  getSymbolIds,
  isValidSpriteFile,
  type SpriteOptions,
  type SpriteSymbol,
  type SpriteGenerationResult,
} from "./sprite-generator.js";
