/**
 * Documentation Generation Types
 * Phase 4: Design System Documentation
 *
 * Types for generating design system documentation from Figma data.
 */
import type { DesignSystemAnalysis } from "@/analysis/types";
import type { DesignTokens } from "@/tokens/types";

// =====================================================
// Core Documentation Types
// =====================================================

/**
 * Generated documentation file
 */
export interface DocFile {
  /** File path relative to output directory */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: "markdown" | "json" | "yaml";
}

/**
 * Documentation generation options
 */
export interface DocGenerationOptions {
  /** Output format */
  format?: "markdown" | "json" | "yaml";
  /** Whether to include usage examples */
  includeExamples?: boolean;
  /** Whether to include accessibility notes */
  includeAccessibility?: boolean;
  /** Whether to include component preview images */
  includePreviews?: boolean;
  /** Custom templates */
  templates?: DocTemplates;
}

/**
 * Custom documentation templates
 */
export interface DocTemplates {
  /** Overview template */
  overview?: (data: OverviewData) => string;
  /** Color token template */
  color?: (token: ColorTokenData) => string;
  /** Component template */
  component?: (data: ComponentDocData) => string;
}

// =====================================================
// Template Data Types
// =====================================================

/** Data passed to overview template */
export interface OverviewData {
  designName: string;
  totalTokens: number;
  totalComponents: number;
  colorFamilies: string[];
  fontFamilies: string[];
  componentStats: {
    ready: number;
    needsWork: number;
  };
}

/** Data passed to color token template */
export interface ColorTokenData {
  name: string;
  value: string;
  family?: string;
  scale?: number;
  contrast?: {
    onWhite: number;
    onBlack: number;
  };
  usage?: string[];
}

/** Data passed to component template */
export interface ComponentDocData {
  name: string;
  description?: string;
  atomicLevel: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: string;
  }>;
  variants: Array<{
    property: string;
    value: string;
  }>;
  readiness: {
    score: number;
    ready: boolean;
    warnings: string[];
    suggestions?: string[];
  };
  codeHints?: {
    react?: {
      componentName: string;
      propsInterface: string;
      usageExample: string;
      a11yProps?: string[];
    };
  };
  tags: string[];
}

// =====================================================
// Re-exports for convenience
// =====================================================

export type { DesignTokens, DesignSystemAnalysis };
