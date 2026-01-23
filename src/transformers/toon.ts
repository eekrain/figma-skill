/**
 * Toon format - Token-efficient design representation
 *
 * Uses the @toon-format/toon package for encoding/decoding.
 * This provides a standardized, well-tested implementation with
 * proper escaping, streaming support, and round-trip compatibility.
 *
 * Format: 2-space indentation, comma delimiter, no key folding
 *
 * Compression support: When compress option is enabled, applies
 * component-based compression to reduce file size by 70-75%.
 */
import { decode, encode, encodeLines } from "@toon-format/toon";

import { compressComponents, expandDesign } from "@/compression";
import type { CompressionOptions } from "@/compression/types";
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
 * Options for toToon conversion
 */
export interface ToonOptions {
  /** Enable component compression (default: false) */
  compress?: boolean;
  /** Compression options (when compress is true) */
  compressionOptions?: CompressionOptions;
}

/**
 * Convert SimplifiedDesign to Toon format (compact string)
 * Uses @toon-format/toon package with indent: 2
 *
 * @param design - The simplified design to encode
 * @param options - Conversion options including compression
 * @returns Toon formatted string with 2-space indentation
 *
 * @example
 * // Without compression
 * const toon = toToon(design);
 *
 * // With compression
 * const compressedToon = toToon(design, { compress: true });
 */
export function toToon(
  design: SimplifiedDesign,
  options?: ToonOptions
): string {
  const outputDesign = options?.compress
    ? compressComponents(design, options.compressionOptions).design
    : design;

  return encode(outputDesign, TOON_ENCODE_OPTIONS);
}

/**
 * Stream SimplifiedDesign to Toon format lines
 * Memory-efficient for large outputs - yields lines one at a time
 * Uses @toon-format/toon package's encodeLines with indent: 2
 *
 * @param design - The simplified design to encode
 * @param options - Conversion options including compression
 * @returns Iterable of Toon format lines (without trailing newlines)
 *
 * @example
 * ```typescript
 * // Stream to stdout
 * for (const line of toToonLines(design)) {
 *   console.log(line);
 * }
 *
 * // Stream with compression
 * for (const line of toToonLines(design, { compress: true })) {
 *   console.log(line);
 * }
 *
 * // Collect to array
 * const lines = Array.from(toToonLines(design));
 * const toonString = lines.join('\n');
 * ```
 */
export function* toToonLines(
  design: SimplifiedDesign,
  options?: ToonOptions
): Iterable<string> {
  const outputDesign = options?.compress
    ? compressComponents(design, options.compressionOptions).design
    : design;

  return encodeLines(outputDesign, TOON_ENCODE_OPTIONS);
}

/**
 * Parse Toon format back to SimplifiedDesign
 * Uses @toon-format/toon package with strict validation
 *
 * If the toon contains compressed data (has 'components' and 'instances' keys),
 * it will be automatically expanded to full SimplifiedDesign.
 *
 * @param toon - Toon formatted string
 * @param options - Conversion options (autoExpand controls automatic decompression)
 * @returns Parsed SimplifiedDesign
 *
 * @example
 * ```typescript
 * // Parse regular toon
 * const design = fromToon(toonString);
 *
 * // Parse compressed toon (auto-expands)
 * const design = fromToon(compressedToonString);
 *
 * // Parse without auto-expanding (returns compressed format)
 * const compressed = fromToon(compressedToonString, { autoExpand: false });
 * ```
 */
export function fromToon(
  toon: string,
  options?: { autoExpand?: boolean }
): SimplifiedDesign {
  const decoded = decode(
    toon,
    TOON_DECODE_OPTIONS
  ) as unknown as SimplifiedDesign;

  // Check if this is a compressed format
  const isCompressed = "components" in decoded && "instances" in decoded;

  if (isCompressed && options?.autoExpand !== false) {
    // Auto-expand compressed format
    return expandDesign(
      decoded as unknown as import("../compression/types").SerializableCompressedDesign
    );
  }

  return decoded;
}

/**
 * Parse Toon format lines back to SimplifiedDesign
 * Convenience wrapper for when you already have lines split
 *
 * @param lines - Iterable of Toon format lines
 * @param options - Conversion options (autoExpand controls automatic decompression)
 * @returns Parsed SimplifiedDesign
 */
export function fromToonLines(
  lines: Iterable<string>,
  options?: { autoExpand?: boolean }
): SimplifiedDesign {
  // Rejoin lines and decode
  const toonString = Array.from(lines).join("\n");
  return fromToon(toonString, options);
}
