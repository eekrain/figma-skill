/**
 * Token type definitions for design system extraction
 * Phase 1: Design Token Extraction
 */
import type { SimplifiedDesign } from "@/extractors/types";

// =====================================================
// Core Token Types
// =====================================================

/**
 * Design token - represents a design decision
 */
export interface DesignToken<T = unknown> {
  /** Token name (e.g., "primary-500", "text-lg") */
  name: string;
  /** Token value */
  value: T;
  /** Semantic category */
  category: "color" | "typography" | "spacing" | "effect" | "border";
  /** Original style ID from Figma */
  styleId?: string;
  /** Semantic name from Figma styles */
  semanticName?: string;
  /** Usage context (inferred) */
  usage?: string[];
  /** Token metadata */
  meta?: TokenMetadata;
}

/**
 * Token metadata
 */
export interface TokenMetadata {
  /** Description of usage */
  description?: string;
  /** Whether this is a deprecated token */
  deprecated?: boolean;
  /** Related tokens */
  related?: string[];
  /** CSS custom property name */
  cssVar?: string;
  /** Tailwind class name (if applicable) */
  tailwindClass?: string;
}

/**
 * Color token with additional color-specific properties
 */
export interface ColorToken extends DesignToken<string> {
  category: "color";
  value: string; // Hex format (#RRGGBB or #RRGGBBAA) or rgba()
  /** Color scale position (100-900) for systematic colors */
  scale?: number;
  /** Color family (primary, neutral, etc.) */
  family?: string;
  /** Contrast ratio against white/black for accessibility */
  contrast?: {
    onWhite: number;
    onBlack: number;
  };
}

/**
 * Typography value
 */
export interface TypographyValue {
  /** Font family */
  fontFamily: string;
  /** Font size (px or rem) */
  fontSize: string;
  /** Font weight */
  fontWeight: number | string;
  /** Line height */
  lineHeight: string;
  /** Letter spacing */
  letterSpacing?: string;
  /** Text transform */
  textTransform?: string;
}

/**
 * Typography token
 */
export interface TypographyToken extends DesignToken<TypographyValue> {
  category: "typography";
  value: TypographyValue;
}

/**
 * Spacing token
 */
export interface SpacingToken extends DesignToken<string> {
  category: "spacing";
  value: string; // px, rem, or unitless value
}

/**
 * Effect value (single effect in an array)
 */
export interface EffectValue {
  /** Effect type: "DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR" */
  type: string;
  /** Color (rgba or hex) */
  color?: string;
  /** Offset X */
  x?: number;
  /** Offset Y */
  y?: number;
  /** Blur radius */
  blur?: number;
  /** Spread radius */
  spread?: number;
}

/**
 * Effect token (shadows, blurs)
 */
export interface EffectToken extends DesignToken<EffectValue[]> {
  category: "effect";
  value: EffectValue[];
}

/**
 * Border radius token
 */
export interface BorderRadiusToken extends DesignToken<string> {
  category: "border";
  value: string; // px or %
}

// =====================================================
// Complete Design Token Set
// =====================================================

/**
 * Complete design token set extracted from a design
 */
export interface DesignTokens {
  /** Color tokens organized by family */
  colors: {
    /** Semantic color mapping (primary, secondary, etc.) */
    semantic: Record<string, ColorToken>;
    /** All color tokens by name */
    all: Record<string, ColorToken>;
    /** Color families for systematic colors */
    families: Record<string, Record<number, ColorToken>>;
  };
  /** Typography tokens */
  typography: {
    /** Text styles by name */
    styles: Record<string, TypographyToken>;
    /** Font families used */
    families: string[];
  };
  /** Spacing tokens */
  spacing: {
    /** Scale tokens (4px, 8px, 16px, etc.) */
    scale: Record<string, SpacingToken>;
  };
  /** Effect tokens */
  effects: {
    /** Shadow definitions by name */
    shadows: Record<string, EffectToken>;
    /** Blur definitions by name */
    blurs: Record<string, EffectToken>;
  };
  /** Border radius tokens */
  borders: {
    /** Radius tokens by name */
    radius: Record<string, BorderRadiusToken>;
  };
  /** Token statistics */
  stats: TokenStats;
}

/**
 * Token statistics
 */
export interface TokenStats {
  totalColorTokens: number;
  totalTypographyTokens: number;
  totalSpacingTokens: number;
  totalEffectTokens: number;
  totalBorderTokens: number;
  semanticColorCoverage: number; // % of colors with semantic names
}

// =====================================================
// Token Extraction Options
// =====================================================

/**
 * Options for token extraction
 */
export interface TokenExtractionOptions {
  /** Whether to infer semantic names from values */
  inferSemanticNames?: boolean;
  /** Whether to calculate contrast ratios for colors */
  calculateContrast?: boolean;
  /** Whether to detect patterns (scales, families) */
  detectPatterns?: boolean;
  /** Custom token name mapping function */
  nameMapper?: (styleId: string, styleValue: unknown) => string | undefined;
}

// =====================================================
// Re-exports for convenience
// =====================================================

export type { SimplifiedDesign };
