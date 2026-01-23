/**
 * Design Token Extraction Module
 * Phase 1: Design Token Extraction
 *
 * Extract structured design tokens from Figma designs:
 * - Colors (semantic, families, with contrast ratios)
 * - Typography (fonts, sizes, weights, line heights)
 * - Spacing (paddings, margins, gaps)
 * - Effects (shadows, blurs)
 * - Border radius values
 *
 * @example
 * ```ts
 * import { extractTokens } from "figma-skill/tokens";
 * import { FigmaExtractor } from "figma-skill";
 *
 * const figma = new FigmaExtractor({ token });
 * const design = await figma.getFile(fileKey);
 *
 * const tokens = extractTokens(design, {
 *   calculateContrast: true,
 *   detectPatterns: true,
 * });
 *
 * console.log(tokens.colors.semantic);
 * console.log(tokens.typography.styles);
 * ```
 */

// Main extraction function
export { extractTokens } from "./extractor";

// Type exports
export type {
  // Core token types
  DesignToken,
  TokenMetadata,
  // Specific token types
  ColorToken,
  TypographyToken,
  TypographyValue,
  SpacingToken,
  EffectToken,
  EffectValue,
  BorderRadiusToken,
  // Complete token set
  DesignTokens,
  TokenStats,
  // Options
  TokenExtractionOptions,
} from "./types";

// Re-export SimplifiedDesign for convenience
export type { SimplifiedDesign } from "@/extractors/types";
