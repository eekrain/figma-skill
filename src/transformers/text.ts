/**
 * Text transformer - extract text content and typography styles
 * Matches mcp-reference/src/transformers/text.ts
 */
import type { Node } from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

export type TextNode = Extract<Node, { type: "TEXT" }>;

/**
 * Simplified text style with CSS-ready values
 * Matches mcp-reference pattern
 */
export type SimplifiedTextStyle = Partial<{
  fontFamily: string;
  fontWeight: number;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textCase: string;
  textDecoration: string;
}>;

/**
 * Check if node is a text node
 */
export function isTextNode(n: Node): n is TextNode {
  return n.type === "TEXT";
}

/**
 * Check if node has text style properties
 */
export function hasTextStyle(
  n: Node
): n is Node & { style: Record<string, unknown> } {
  return hasValue("style", n) && Object.keys(n.style).length > 0;
}

/**
 * Extract text content from a node
 */
export function extractNodeText(n: Node): string | undefined {
  if (hasValue("characters", n)) {
    return (n as { characters: string }).characters;
  }
  return undefined;
}

/**
 * Extract text style from a node
 * Returns CSS-ready values matching mcp-reference
 */
export function extractTextStyle(n: Node): SimplifiedTextStyle | undefined {
  if (!hasTextStyle(n)) {
    return undefined;
  }

  const style = n.style as {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    letterSpacing?: number;
    textCase?: string;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    textDecoration?: string;
  };

  const textStyle: SimplifiedTextStyle = {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    // Font size in pixels
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    // Line height - convert to em or percent
    lineHeight: style.lineHeightPx && style.fontSize
      ? `${(style.lineHeightPx / style.fontSize).toFixed(2)}em`
      : style.lineHeightPercent
        ? `${style.lineHeightPercent}%`
        : undefined,
    // Letter spacing - convert to em or pixels
    letterSpacing: style.letterSpacing && style.fontSize
      ? style.letterSpacing !== 0
        ? `${((style.letterSpacing / style.fontSize) * 1000).toFixed(2)}em`
        : undefined
      : style.letterSpacing
        ? `${style.letterSpacing}px`
        : undefined,
    // Text align (horizontal) - convert to CSS text-align
    textAlign: style.textAlignHorizontal?.toLowerCase() === "left"
      ? undefined // default
      : style.textAlignHorizontal?.toLowerCase(),
    // Text case - convert to CSS text-transform
    textCase: style.textCase?.toLowerCase(),
    // Text decoration - convert to CSS text-decoration
    textDecoration: style.textDecoration?.toLowerCase(),
  };

  // Return undefined if all values are undefined
  if (Object.values(textStyle).every((v) => v === undefined)) {
    return undefined;
  }

  return textStyle;
}
