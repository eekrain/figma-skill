/**
 * SVG Sprite Generator - Generate sprite sheets using <symbol> syntax
 *
 * This module provides functionality to generate SVG sprites from multiple SVGs,
 * reducing HTTP requests from N to 1.
 *
 * Phase 4: Vector Optimization
 */

import { promises as fs } from "node:fs";
import type { CanonicalizedSVG } from "./canonicalizer.js";

// =====================================================
// Types
// =====================================================

/**
 * Sprite generation options
 */
export interface SpriteOptions {
  /** Output sprite file path */
  outputPath: string;
  /** Symbol ID prefix (default: "icon") */
  idPrefix?: string;
  /** Include aria-label for accessibility (default: true) */
  includeAriaLabels?: boolean;
  /** Add title elements (default: false) */
  includeTitles?: boolean;
  /** Custom header comment */
  headerComment?: string;
  /** Optional: Path to write documentation file */
  docsPath?: string;
  /** Optional: Whether to generate documentation */
  generateDocs?: boolean;
}

/**
 * Symbol in a sprite
 */
export interface SpriteSymbol {
  /** Symbol ID */
  id: string;
  /** ViewBox attribute */
  viewBox: string;
  /** Symbol content */
  content: string;
  /** Original node ID */
  originalId: string;
}

/**
 * Result of sprite generation
 */
export interface SpriteGenerationResult {
  /** Whether sprite generation was successful */
  success: boolean;
  /** Output file path */
  outputPath: string;
  /** Number of symbols generated */
  symbolCount: number;
  /** Sprite file size in bytes */
  fileSize?: number;
  /** Symbols generated */
  symbols: SpriteSymbol[];
  /** Symbol IDs (for easy access) */
  symbolIds: string[];
  /** Documentation markdown */
  documentation?: string;
  /** Error message if failed */
  error?: string;
}

// =====================================================
// Public API
// =====================================================

/**
 * Simple SVG input for sprite generation (for testing)
 */
export interface SimpleSvgInput {
  id: string;
  content: string;
  viewBox?: string;
}

/**
 * Generate SVG sprite from canonicalized SVGs or simple SVG inputs
 *
 * This function:
 * 1. Extracts viewBox and content from each SVG
 * 2. Wraps each SVG in a <symbol> element
 * 3. Combines all symbols into a single sprite file
 * 4. Generates usage documentation
 *
 * @param svgs - Array of canonicalized SVGs or simple SVG inputs
 * @param options - Sprite generation options
 * @returns Sprite generation result
 */
export async function generateSprite(
  svgs: CanonicalizedSVG[] | SimpleSvgInput[],
  options: SpriteOptions
): Promise<SpriteGenerationResult> {
  const {
    outputPath,
    idPrefix = "icon",
    includeAriaLabels = true,
    includeTitles = false,
    headerComment,
  } = options;

  // Ensure output directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf("/"));
  await fs.mkdir(dir, { recursive: true });

  // Step 1: Extract symbol content from each SVG
  const symbols: SpriteSymbol[] = [];
  const usedIds = new Set<string>();

  for (const svg of svgs) {
    let svgContent: string;
    let viewBoxStr: string;
    let originalId: string;

    // Detect input type
    if ("svg" in svg) {
      // CanonicalizedSVG
      const { viewBox, content } = extractSymbolContent(svg.svg);
      svgContent = content;
      viewBoxStr = viewBox;
      originalId = svg.originalId;
    } else {
      // SimpleSvgInput
      const { viewBox, content } = extractSymbolContent(svg.content);
      svgContent = content;
      viewBoxStr = svg.viewBox || viewBox;
      originalId = svg.id;
    }

    // Generate unique symbol ID
    const canonicalSvg: CanonicalizedSVG = {
      svg: svgContent,
      hash: "",
      originalId,
      sizeReduction: 0,
    };
    const symbolId = generateSymbolId(canonicalSvg, idPrefix, usedIds);

    symbols.push({
      id: symbolId,
      viewBox: viewBoxStr,
      content: svgContent,
      originalId,
    });
  }

  // Step 2: Build sprite SVG
  let spriteSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n`;

  // Add header comment if provided
  if (headerComment) {
    spriteSvg = `<!-- ${headerComment} -->\n${spriteSvg}`;
  }

  // Add each symbol
  for (const symbol of symbols) {
    let attrs = `id="${symbol.id}" viewBox="${symbol.viewBox}"`;

    if (includeAriaLabels) {
      attrs += ` aria-label="${symbol.originalId}"`;
    }

    spriteSvg += `  <symbol ${attrs}>\n    ${symbol.content}\n  </symbol>\n`;
  }

  spriteSvg += `</svg>`;

  // Step 3: Write sprite file
  await fs.writeFile(outputPath, spriteSvg, "utf8");
  const stats = await fs.stat(outputPath);

  // Step 4: Generate documentation
  const documentation = generateSpriteUsageDocumentation(
    { symbols, filePath: outputPath, spriteSvg },
    { includeTitles }
  );

  return {
    success: true,
    outputPath,
    symbolCount: symbols.length,
    fileSize: stats.size,
    symbols,
    symbolIds: symbols.map((s) => s.id),
    documentation,
  };
}

/**
 * Extract viewBox and content from SVG for symbol creation
 *
 * @param svg - SVG content
 * @returns Object with viewBox and content
 */
export function extractSymbolContent(svg: string): {
  viewBox: string;
  content: string;
} {
  // Extract viewBox attribute
  const viewBoxMatch = svg.match(/viewBox="([^"]*)"/i);

  if (viewBoxMatch) {
    // Use existing viewBox
    const viewBox = viewBoxMatch[1];

    // Extract content between <svg> tags
    const openTagMatch = svg.match(/<svg[^>]*>/i);
    if (!openTagMatch) {
      throw new Error("Invalid SVG: Could not find opening tag");
    }

    const closeTagIndex = svg.lastIndexOf("</svg>");
    if (closeTagIndex === -1) {
      throw new Error("Invalid SVG: Could not find closing tag");
    }

    const contentStart = openTagMatch.index! + openTagMatch[0].length;
    const content = svg.substring(contentStart, closeTagIndex).trim();

    return { viewBox, content };
  }

  // No viewBox - try to derive from width/height
  const widthMatch = svg.match(/width="([^"]*)"/i);
  const heightMatch = svg.match(/height="([^"]*)"/i);

  const width = widthMatch ? widthMatch[1] : "24";
  const height = heightMatch ? heightMatch[1] : "24";
  const viewBox = `0 0 ${width} ${height}`;

  // Extract content
  const openTagMatch = svg.match(/<svg[^>]*>/i);
  if (!openTagMatch) {
    throw new Error("Invalid SVG: Could not find opening tag");
  }

  const closeTagIndex = svg.lastIndexOf("</svg>");
  if (closeTagIndex === -1) {
    throw new Error("Invalid SVG: Could not find closing tag");
  }

  const contentStart = openTagMatch.index! + openTagMatch[0].length;
  const content = svg.substring(contentStart, closeTagIndex).trim();

  return { viewBox, content };
}

/**
 * Generate symbol ID from canonicalized SVG
 *
 * @param svg - Canonicalized SVG
 * @param prefix - ID prefix
 * @param usedIds - Set of already used IDs
 * @returns Unique symbol ID
 */
export function generateSymbolId(
  svg: CanonicalizedSVG,
  prefix: string,
  usedIds: Set<string>
): string {
  // Use original ID if available, otherwise use hash
  let baseId = svg.originalId || svg.hash.substring(0, 8);

  // Remove any non-alphanumeric characters
  baseId = baseId.replace(/[^a-zA-Z0-9]/g, "-");

  // Always add prefix for consistency
  baseId = `${prefix}-${baseId}`;

  let symbolId = baseId;
  let counter = 1;

  // Ensure uniqueness
  while (usedIds.has(symbolId)) {
    symbolId = `${baseId}-${counter}`;
    counter++;
  }

  // Add to usedIds set
  usedIds.add(symbolId);

  return symbolId;
}

/**
 * Generate sprite usage documentation
 *
 * @param sprite - Sprite information
 * @param options - Documentation options
 * @returns Markdown documentation
 */
export function generateSpriteUsageDocumentation(
  sprite: {
    symbols: SpriteSymbol[];
    filePath: string;
    spriteSvg: string;
  },
  options: { includeTitles?: boolean } = {}
): string {
  const { symbols, filePath } = sprite;
  const { includeTitles = false } = options;

  let doc = `# SVG Sprite Documentation\n\n`;
  doc += `**File**: \`${filePath}\`\n`;
  doc += `**Symbols**: ${symbols.length}\n\n`;
  doc += `## Usage\n\n`;
  doc += `Include the sprite in your HTML:\n\n`;
  doc += `\`\`\`html\n`;
  doc += `<svg style="display: none;">\n`;
  doc += `  <use xlink:href="${filePath}#symbol-id"></use>\n`;
  doc += `</svg>\n`;
  doc += `\`\`\`\n\n`;
  doc += `## Symbols\n\n`;

  for (const symbol of symbols) {
    doc += `### ${symbol.id}\n\n`;
    doc += `- **ViewBox**: ${symbol.viewBox}\n`;
    doc += `- **Original ID**: ${symbol.originalId}\n\n`;
    doc += `**Usage**:\n\n`;
    doc += `\`\`\`html\n`;
    doc += `<svg><use xlink:href="${filePath}#${symbol.id}"/></svg>\n`;
    doc += `\`\`\`\n\n`;
  }

  if (includeTitles) {
    doc += `## Accessibility\n\n`;
    doc += `Each symbol includes an \`aria-label\` attribute for screen readers.\n`;
    doc += `Update the labels as needed for your specific use case.\n\n`;
  }

  return doc;
}

/**
 * Generate HTML example for using a symbol
 *
 * @param spriteFilePath - Path to sprite file
 * @param symbolId - Symbol ID to use
 * @returns HTML example string
 */
export function generateHtmlExample(
  spriteFilePath: string,
  symbolId: string
): string {
  return `<svg><use xlink:href="${spriteFilePath}#${symbolId}"/></svg>`;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get all symbol IDs from a sprite file
 *
 * @param spritePath - Path to sprite file
 * @returns Array of symbol IDs
 */
export async function getSymbolIds(spritePath: string): Promise<string[]> {
  const content = await fs.readFile(spritePath, "utf8");
  const symbolIds: string[] = [];

  const symbolRegex = /<symbol[^>]*id="([^"]*)"[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = symbolRegex.exec(content)) !== null) {
    symbolIds.push(match[1]);
  }

  return symbolIds;
}

/**
 * Result of sprite validation
 */
export interface SpriteValidationResult {
  isValidSprite: boolean;
  symbolCount: number;
}

/**
 * Validate sprite file format
 *
 * Auto-detects whether input is a file path or SVG content.
 * If input contains '<svg', treats it as content.
 * Otherwise, treats it as a file path.
 *
 * @param spritePathOrContent - File path or SVG content
 * @returns Validation result with isValidSprite flag and symbol count
 */
export async function isValidSpriteFile(
  spritePathOrContent: string
): Promise<SpriteValidationResult> {
  // Auto-detect: if input contains <svg tag, treat it as content
  const isContent = spritePathOrContent.includes("<svg");

  const content = isContent
    ? spritePathOrContent
    : await fs.readFile(spritePathOrContent, "utf8");

  const isValidSprite =
    content.includes("<svg") &&
    content.includes("<symbol") &&
    content.includes("</symbol>") &&
    content.includes("</svg>");

  // Count symbol occurrences
  const symbolCount = (content.match(/<symbol/g) || []).length;

  return { isValidSprite, symbolCount };
}
