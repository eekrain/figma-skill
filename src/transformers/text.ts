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

  const textStyle: SimplifiedTextStyle = {};

  // Only add properties that have values
  if (style.fontFamily !== undefined) textStyle.fontFamily = style.fontFamily;
  if (style.fontWeight !== undefined) textStyle.fontWeight = style.fontWeight;

  // Font size - only add if exists
  if (style.fontSize) textStyle.fontSize = `${style.fontSize}px`;

  // Line height - only add if we have a valid value
  if (style.lineHeightPx && style.fontSize) {
    textStyle.lineHeight = `${(style.lineHeightPx / style.fontSize).toFixed(2)}em`;
  } else if (style.lineHeightPercent) {
    textStyle.lineHeight = `${style.lineHeightPercent}%`;
  }

  // Letter spacing - only add if non-zero
  if (style.letterSpacing && style.fontSize) {
    if (style.letterSpacing !== 0) {
      textStyle.letterSpacing = `${((style.letterSpacing / style.fontSize) * 1000).toFixed(2)}em`;
    }
  } else if (style.letterSpacing) {
    textStyle.letterSpacing = `${style.letterSpacing}px`;
  }

  // Text align - omit if "left" (default)
  if (style.textAlignHorizontal?.toLowerCase() !== "left") {
    textStyle.textAlign = style.textAlignHorizontal?.toLowerCase();
  }

  // Text case - only add if exists
  if (style.textCase) {
    textStyle.textCase = style.textCase.toLowerCase();
  }

  // Text decoration - only add if exists
  if (style.textDecoration) {
    textStyle.textDecoration = style.textDecoration.toLowerCase();
  }

  // Return undefined if all values are undefined
  if (Object.values(textStyle).every((v) => v === undefined)) {
    return undefined;
  }

  return textStyle;
}
