/**
 * Text transformer - extract text content and typography styles
 */
import type { Node } from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

export type TextNode = Extract<Node, { type: "TEXT" }>;

export type SimplifiedTextStyle = Partial<{
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: string;
  letterSpacing: string;
  textCase: string;
  textAlignHorizontal: string;
  textAlignVertical: string;
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
    letterSpacing?: number;
    textCase?: string;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
    textDecoration?: string;
  };

  const textStyle: SimplifiedTextStyle = {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    lineHeight:
      style.lineHeightPx && style.fontSize
        ? `${style.lineHeightPx / style.fontSize}em`
        : undefined,
    letterSpacing:
      style.letterSpacing && style.letterSpacing !== 0 && style.fontSize
        ? `${(style.letterSpacing / style.fontSize) * 100}%`
        : undefined,
    textCase: style.textCase,
    textAlignHorizontal: style.textAlignHorizontal,
    textAlignVertical: style.textAlignVertical,
    textDecoration: style.textDecoration,
  };

  // Return undefined if all values are undefined
  if (Object.values(textStyle).every((v) => v === undefined)) {
    return undefined;
  }

  return textStyle;
}
