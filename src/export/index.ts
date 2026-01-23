/**
 * Design System Export - Public API
 * Phase 3: Multi-Format Token Export
 *
 * Export design tokens to various formats:
 * - Tailwind CSS v3
 * - Style Dictionary
 * - Sync with existing Tailwind configs
 */

// =====================================================
// Tailwind v3 Export
// =====================================================

export { toTailwindV3 } from "./tailwind-v3.js";
export type { TailwindV3Config, TailwindV3Options } from "./types.js";

// =====================================================
// Style Dictionary Export
// =====================================================

export { toStyleDictionary } from "./style-dictionary.js";
export type { StyleDictionary, ExportOptions } from "./types.js";

// =====================================================
// Tailwind Sync
// =====================================================

export { syncToTailwindV3 } from "./sync-tailwind-v3.js";
export type {
  TokenToClassMap,
  SyncStats,
  SyncToTailwindV3Options,
} from "./sync-types.js";
