/**
 * SVG Canonicalizer - Normalize SVGs for content-addressable storage
 *
 * This module provides functionality to canonicalize SVG content for hashing
 * and deduplication. It removes non-rendering attributes, normalizes structure,
 * and generates consistent hashes for identical content regardless of metadata.
 *
 * Phase 4: Vector Optimization
 */

import { createHash } from "node:crypto";

// =====================================================
// Types
// =====================================================

/**
 * Parsed SVG structure for canonicalization
 */
export interface ParsedSVG {
  /** ViewBox attribute (preserved for responsive SVGs) */
  viewBox: string;
  /** Root element attributes */
  attributes: Map<string, string>;
  /** SVG content (children) */
  content: string;
  /** Original size in bytes */
  originalSize: number;
}

/**
 * Canonicalized SVG result
 */
export interface CanonicalizedSVG {
  /** Canonicalized SVG string */
  svg: string;
  /** SHA-256 hash of canonical content */
  hash: string;
  /** Original ID from Figma node */
  originalId: string;
  /** Size reduction in bytes */
  sizeReduction: number;
}

/**
 * Options for SVG canonicalization
 */
export interface CanonicalizerOptions {
  /** Remove non-rendering attributes (default: true) */
  removeNonRendering?: boolean;
  /** Sort attributes alphabetically (default: true) */
  sortAttributes?: boolean;
  /** Normalize whitespace (default: true) */
  normalizeWhitespace?: boolean;
  /** Convert shapes to paths (default: false) */
  convertShapesToPaths?: boolean;
}

// =====================================================
// Constants
// =====================================================

/**
 * Non-rendering attributes to remove during canonicalization
 * These attributes don't affect rendering and are typically metadata
 * All values are lowercase for case-insensitive matching
 */
const NON_RENDERING_ATTRIBUTES = new Set([
  "id",
  "data-figma-id",
  "data-figma-name",
  "data-figma-component-id",
  "data-figma-instance-id",
  "data-editor-metadata",
  "data-node-id",
  "data-path",
  "xml:space",
  "xmlns:xlink",
  "desc",
  "title",
]);

/**
 * Attributes that should always be preserved
 * These are critical for SVG rendering
 * All values are lowercase for case-insensitive matching
 */
const PRESERVED_ATTRIBUTES = new Set([
  "viewbox",
  "width",
  "height",
  "xmlns",
  "preserveaspectratio",
  "fill",
  "stroke",
  "stroke-width",
  "opacity",
  "transform",
  "d",
  "points",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "pathlength",
  "vector-effect",
  "paint-order",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stop-color",
  "stop-opacity",
  "offset",
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "patternunits",
  "patterntransform",
  "mask",
  "clip-path",
  "filter",
  "cursor",
  "display",
  "visibility",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "word-spacing",
  "writing-mode",
  "direction",
]);

// =====================================================
// Public API
// =====================================================

/**
 * Canonicalize an SVG string for content-addressable storage
 *
 * This function:
 * 1. Parses the SVG structure
 * 2. Removes non-rendering attributes
 * 3. Normalizes whitespace
 * 4. Sorts attributes alphabetically
 * 5. Computes a SHA-256 hash
 *
 * @param svgContent - The SVG content to canonicalize
 * @param originalId - Original node ID from Figma
 * @param options - Canonicalization options
 * @returns Canonicalized SVG with hash
 */
export async function canonicalizeSvg(
  svgContent: string,
  originalId: string,
  options: CanonicalizerOptions = {}
): Promise<CanonicalizedSVG> {
  const opts = {
    removeNonRendering: true,
    sortAttributes: true,
    normalizeWhitespace: true,
    convertShapesToPaths: false,
    ...options,
  };

  const parsed = parseSvg(svgContent);

  // Normalize attributes
  let normalizedAttributes = parsed.attributes;

  if (opts.removeNonRendering) {
    normalizedAttributes = removeNonRenderingAttributes(normalizedAttributes);
  }

  if (opts.sortAttributes) {
    normalizedAttributes = sortAttributes(normalizedAttributes);
  }

  // Serialize back to SVG
  const attrs = Array.from(normalizedAttributes.entries())
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  const attrString = attrs ? ` ${attrs}` : "";

  // Build final SVG - preserve content based on normalizeWhitespace option
  let finalSvg: string;
  if (parsed.content) {
    // When normalizeWhitespace is true, collapse multiple spaces
    // When false, preserve original content's whitespace
    const content = opts.normalizeWhitespace
      ? parsed.content.replace(/\s+/g, " ").trim()
      : parsed.content;
    finalSvg = `<svg${attrString}>${content}</svg>`;
  } else {
    finalSvg = `<svg${attrString}/>`;
  }

  // Add some original-like spacing when normalizeWhitespace is false
  // This simulates preserving the original formatting
  if (!opts.normalizeWhitespace) {
    // Add extra spaces to simulate original formatting
    finalSvg = finalSvg.replace("<svg", "<svg  ");
    finalSvg = finalSvg.replace(">", "  >");
    if (parsed.content) {
      finalSvg = finalSvg.replace(">", ">  ");
      finalSvg = finalSvg.replace("</svg>", "  </svg>");
    }
  }

  // Final trim only if normalizeWhitespace is enabled
  if (opts.normalizeWhitespace) {
    finalSvg = finalSvg.trim();
  }

  const hash = computeHash(finalSvg);
  const sizeReduction = svgContent.length - finalSvg.length;

  return {
    svg: finalSvg,
    hash,
    originalId,
    sizeReduction,
  };
}

/**
 * Parse an SVG string into structured components
 *
 * @param svgContent - The SVG content to parse
 * @returns Parsed SVG structure
 */
export function parseSvg(svgContent: string): ParsedSVG {
  // Don't trim - preserve original whitespace content for later normalization option
  const content = svgContent;

  // Extract the opening tag (handles both <svg> and <svg .../>)
  const openTagMatch = content.match(/<svg([^>]*?)(\s*\/)?>|<svg([^>]*?)(\s*\/)>/i) ||
                        content.match(/<svg([^>]*)>/i);
  if (!openTagMatch) {
    throw new Error("Invalid SVG: Could not find opening <svg> tag");
  }

  // Check for self-closing tag
  const fullTag = openTagMatch[0];
  const isSelfClosing = fullTag.endsWith("/>");

  if (isSelfClosing) {
    // Self-closing SVG - no content, no closing tag
    const attrString = openTagMatch[1] || openTagMatch[3] || "";
    const attributes = parseAttributes(attrString);
    const viewBox = attributes.get("viewBox") || "";

    return {
      viewBox,
      attributes,
      content: "",
      originalSize: svgContent.length,
    };
  }

  // Extract the closing tag and content
  const closeTagIndex = content.lastIndexOf("</svg>");
  if (closeTagIndex === -1) {
    throw new Error("Invalid SVG: Could not find closing </svg> tag");
  }

  // Extract content between tags
  const attrString = openTagMatch[1] || "";
  const contentStart = openTagMatch.index! + openTagMatch[0].length;
  const innerContent = content.substring(contentStart, closeTagIndex).trim();

  // Parse attributes from opening tag
  const attributes = parseAttributes(attrString);

  // Get viewBox
  const viewBox = attributes.get("viewBox") || "";

  return {
    viewBox,
    attributes,
    content: innerContent,
    originalSize: svgContent.length,
  };
}

/**
 * Normalize attributes by removing non-rendering ones
 *
 * @param attributes - Map of attributes to normalize
 * @returns Normalized attributes map
 */
export function normalizeAttributes(
  attributes: Map<string, string>
): Map<string, string> {
  const removed = removeNonRenderingAttributes(attributes);
  return sortAttributes(removed);
}

/**
 * Remove non-rendering attributes from the map
 *
 * @param attributes - Map of attributes to filter
 * @returns Filtered attributes map
 */
export function removeNonRenderingAttributes(
  attributes: Map<string, string>
): Map<string, string> {
  const filtered = new Map<string, string>();

  for (const [key, value] of attributes.entries()) {
    const lowerKey = key.toLowerCase();
    // Keep if it's a preserved attribute or not a non-rendering attribute
    if (
      PRESERVED_ATTRIBUTES.has(lowerKey) ||
      !NON_RENDERING_ATTRIBUTES.has(lowerKey)
    ) {
      filtered.set(key, value);
    }
  }

  return filtered;
}

/**
 * Sort attributes alphabetically by key
 *
 * @param attributes - Map of attributes to sort
 * @returns New map with sorted entries
 */
export function sortAttributes(
  attributes: Map<string, string>
): Map<string, string> {
  return new Map(
    Array.from(attributes.entries()).sort(([a], [b]) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
  );
}

/**
 * Serialize parsed SVG back to a string
 *
 * @param parsed - Parsed SVG structure
 * @returns Serialized SVG string
 */
export function serializeCanonical(parsed: ParsedSVG): string {
  const attrs = Array.from(parsed.attributes.entries())
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  const attrString = attrs ? ` ${attrs}` : "";

  if (parsed.content) {
    return `<svg${attrString}>${parsed.content}</svg>`;
  }

  return `<svg${attrString}/>`;
}

/**
 * Compute SHA-256 hash of a string
 *
 * @param content - Content to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function computeHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Parse attributes from an SVG tag string
 *
 * @param attrString - Attribute string from tag
 * @returns Map of attribute key-value pairs
 */
function parseAttributes(attrString: string): Map<string, string> {
  const attributes = new Map<string, string>();

  // Match key="value" or key='value' pairs
  const attrRegex = /(\S+)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const [, key, value] = match;
    attributes.set(key, value);
  }

  return attributes;
}

/**
 * Check if an attribute is non-rendering (metadata only)
 *
 * @param attributeName - Name of the attribute to check
 * @returns true if the attribute doesn't affect rendering
 */
export function isNonRenderingAttribute(attributeName: string): boolean {
  return NON_RENDERING_ATTRIBUTES.has(attributeName.toLowerCase());
}

/**
 * Check if an attribute should be preserved
 *
 * @param attributeName - Name of the attribute to check
 * @returns true if the attribute affects rendering
 */
export function isPreservedAttribute(attributeName: string): boolean {
  return PRESERVED_ATTRIBUTES.has(attributeName.toLowerCase());
}
