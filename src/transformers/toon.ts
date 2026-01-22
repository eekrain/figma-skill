/**
 * Toon format - Token-efficient design representation
 *
 * Uses the @toon-format/toon package for encoding/decoding.
 * This provides a standardized, well-tested implementation with
 * proper escaping, streaming support, and round-trip compatibility.
 *
 * Format: 2-space indentation, comma delimiter, no key folding
 */
import { decode, encode, encodeLines } from "@toon-format/toon";
import type { SimplifiedDesign } from "@/extractors/types";

/**
 * Toon encode options matching the plan specification
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
 * Toon decode options for parsing
 * - indent: 2 to match encoding
 * - strict: true for validation
 * - expandPaths: "off" to preserve dotted keys
 */
const TOON_DECODE_OPTIONS = {
  indent: 2,
  strict: true,
  expandPaths: "off" as const,
};

/**
 * Convert SimplifiedDesign to Toon format (compact string)
 * Uses @toon-format/toon package with indent: 2
 *
 * @param design - The simplified design to encode
 * @returns Toon formatted string with 2-space indentation
 */
export function toToon(design: SimplifiedDesign): string {
  return encode(design, TOON_ENCODE_OPTIONS);
}

/**
 * Stream SimplifiedDesign to Toon format lines
 * Memory-efficient for large outputs - yields lines one at a time
 * Uses @toon-format/toon package's encodeLines with indent: 2
 *
 * @param design - The simplified design to encode
 * @returns Iterable of Toon format lines (without trailing newlines)
 *
 * @example
 * ```typescript
 * // Stream to stdout
 * for (const line of toToonLines(design)) {
 *   console.log(line);
 * }
 *
 * // Collect to array
 * const lines = Array.from(toToonLines(design));
 * const toonString = lines.join('\n');
 * ```
 */
export function* toToonLines(
  design: SimplifiedDesign
): Iterable<string> {
  return encodeLines(design, TOON_ENCODE_OPTIONS);
}

/**
 * Parse Toon format back to SimplifiedDesign
 * Uses @toon-format/toon package with strict validation
 *
 * @param toon - Toon formatted string
 * @returns Parsed SimplifiedDesign
 */
export function fromToon(toon: string): SimplifiedDesign {
  return decode(toon, TOON_DECODE_OPTIONS) as unknown as SimplifiedDesign;
}

/**
 * Parse Toon format lines back to SimplifiedDesign
 * Convenience wrapper for when you already have lines split
 *
 * @param lines - Iterable of Toon format lines
 * @returns Parsed SimplifiedDesign
 */
export function fromToonLines(lines: Iterable<string>): SimplifiedDesign {
  // Rejoin lines and decode
  const toonString = Array.from(lines).join("\n");
  return fromToon(toonString);
}
