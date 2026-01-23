/**
 * Transform: SimplifiedDesign → Toon format
 *
 * Standalone transform function per API Redesign plan.
 * Converts Figma design data to compact Toon string format.
 *
 * @module transform/toToon
 */
import { encode, encodeLines } from "@toon-format/toon";

import { compressComponents } from "@/compression";
import type { CompressionOptions } from "@/compression/types";
import type { SimplifiedDesign } from "@/extractors/types";

/**
 * Toon encode options matching plan specification
 * - indent: 2 for multi-line, readable output
 * - delimiter: "," for standard array formatting
 * - keyFolding: "off" to preserve nested structure
 */
const TOON_ENCODE_OPTIONS = {
  indent: 2,
  delimiter: "," as const,
  keyFolding: "off" as const,
};

/**
 * Options for toToon transform
 */
export interface ToonTransformOptions {
  /** Enable component compression (default: false) */
  compress?: boolean;
  /** Compression options (when compress is true) */
  compressionOptions?: CompressionOptions;
}

/**
 * Transform SimplifiedDesign to Toon format string
 *
 * Standalone transform function that converts Figma design data
 * to compact, readable Toon string format.
 *
 * @param design - The simplified design to transform
 * @param options - Transform options including compression
 * @returns Toon formatted string with 2-space indentation
 *
 * @example
 * // Basic transform
 * const toon = toToon(design);
 *
 * // With compression
 * const compressed = toToon(design, { compress: true });
 */
export function toToon(
  design: SimplifiedDesign,
  options?: ToonTransformOptions
): string {
  const outputDesign = options?.compress
    ? compressComponents(design, options.compressionOptions).design
    : design;

  return encode(outputDesign, TOON_ENCODE_OPTIONS);
}

/**
 * Stream transform: SimplifiedDesign → Toon lines
 *
 * Memory-efficient for large outputs. Yields lines one at a time.
 *
 * @param design - The simplified design to transform
 * @param options - Transform options including compression
 * @returns Iterable of Toon format lines
 *
 * @example
 * // Stream lines
 * for (const line of toToonLines(design)) {
 *   console.log(line);
 * }
 *
 * // Collect to array
 * const lines = Array.from(toToonLines(design));
 * const toonString = lines.join('\n');
 */
export function* toToonLines(
  design: SimplifiedDesign,
  options?: ToonTransformOptions
): Iterable<string> {
  const outputDesign = options?.compress
    ? compressComponents(design, options.compressionOptions).design
    : design;

  return encodeLines(outputDesign, TOON_ENCODE_OPTIONS);
}
