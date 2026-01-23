/**
 * Export type definitions for design system export formats
 * Phase 3: Multi-Format Token Export
 */
import type { DesignTokens } from "@/tokens/types";

// =====================================================
// Tailwind v3 Export Types
// =====================================================

/**
 * Tailwind CSS v3 configuration format
 */
export interface TailwindV3Config {
  /** Content paths for Tailwind to scan */
  content?: string[];
  /** Theme configuration */
  theme: {
    /** Color tokens (can be nested or flat) */
    colors?: Record<string, string | Record<string, string>>;
    /** Font family tokens */
    fontFamily?: Record<string, string | string[]>;
    /** Font size tokens (with optional line height) */
    fontSize?: Record<string, string | [string, string]>;
    /** Spacing scale tokens */
    spacing?: Record<string, string>;
    /** Border radius tokens */
    borderRadius?: Record<string, string>;
    /** Box shadow tokens */
    boxShadow?: Record<string, string>;
    /** Extend section for additional theme values */
    extend?: Record<string, unknown>;
  };
  /** Tailwind plugins */
  plugins?: unknown[];
}

/**
 * Options for Tailwind v3 export
 */
export interface TailwindV3Options {
  /** Whether to include comments/metadata */
  includeMetadata?: boolean;
  /** Prefix for CSS custom properties */
  cssPrefix?: string;
  /** Whether to nest color families (default: true) */
  nestColorFamilies?: boolean;
  /** Custom token name transformer */
  transformName?: (name: string) => string;
}

// =====================================================
// Style Dictionary Export Types
// =====================================================

/**
 * Style Dictionary format (simplified)
 * Token properties organized by category
 */
export interface StyleDictionary {
  /** Color tokens */
  color: Record<
    string,
    {
      value: string;
      type: string;
      comment?: string;
      originalValue?: string;
    }
  >;
  /** Typography tokens */
  typography: Record<
    string,
    {
      value: string;
      type: string;
      comment?: string;
    }
  >;
  /** Spacing tokens */
  spacing: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
  /** Border radius tokens */
  borderRadius: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
  /** Box shadow tokens */
  boxShadow: Record<
    string,
    {
      value: string;
      type: string;
    }
  >;
}

/**
 * Options for Style Dictionary export
 */
export interface ExportOptions {
  /** Whether to include comments/metadata */
  includeMetadata?: boolean;
  /** Prefix for CSS custom properties */
  cssPrefix?: string;
  /** Custom token name transformer */
  transformName?: (name: string) => string;
}

// =====================================================
// Re-exports
// =====================================================

export type { DesignTokens };
