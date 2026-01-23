/**
 * Sync type definitions for Tailwind v3 integration
 * Phase 3: Multi-Format Token Export - Tailwind Sync
 */
import type { DesignTokens } from "@/tokens/types";

// =====================================================
// Sync Types
// =====================================================

/**
 * Direct token-to-class map for AI agents
 *
 * Each token maps directly to what the AI should use:
 * - Tailwind class name (safe match): "primary-500"
 * - Arbitrary value (no good match): "[#176CF7]"
 */
export type TokenToClassMap = Record<string, string>;

/**
 * Statistics about the sync result
 */
export interface SyncStats {
  /** Total Figma tokens analyzed */
  totalTokens: number;
  /** Tokens that can use Tailwind classes */
  mappedToClasses: number;
  /** Tokens that need arbitrary values */
  needsArbitrary: number;
  /** Percentage of tokens using classes */
  classCoverage: number;
}

/**
 * Tailwind v3 config type (simplified for sync purposes)
 */
export interface TailwindConfig {
  /** Content paths */
  content?: string[];
  /** Presets to merge */
  presets?: Array<unknown>;
  /** Theme configuration */
  theme?: {
    /** Root level colors */
    colors?: Record<string, string | Record<string, string>>;
    /** Extended theme values */
    extend?: {
      colors?: Record<string, string | Record<string, string>>;
      fontSize?: Record<string, string | [string, string]>;
      spacing?: Record<string, string>;
      borderRadius?: Record<string, string>;
      boxShadow?: Record<string, string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  /** Plugins */
  plugins?: unknown[];
}

/**
 * Options for syncing to Tailwind v3
 */
export interface SyncToTailwindV3Options {
  /** Path to tailwind.config.js or tailwind.config.ts */
  configPath: string;
  /** Similarity threshold for "safe to use class" (0-1, default: 0.90) */
  threshold?: number;
  /** Fallback strategy for unmatched tokens */
  fallback?: "arbitrary" | "closest";
  /** Working directory for resolving monorepo paths (default: process.cwd()) */
  cwd?: string;
}

// =====================================================
// Re-exports
// =====================================================

export type { DesignTokens };
