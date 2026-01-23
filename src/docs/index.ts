/**
 * Documentation Generation Module
 * Phase 4: Design System Documentation
 *
 * Public API for generating design system documentation.
 */

// Export types
export type {
  DocFile,
  DocGenerationOptions,
  DocTemplates,
  OverviewData,
  ColorTokenData,
  ComponentDocData,
  DesignTokens,
  DesignSystemAnalysis,
} from "./types";

// Export main function
export { generateDesignSystemDoc } from "./generator";
