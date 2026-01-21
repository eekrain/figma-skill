/**
 * Style transformer - convert Figma paints to CSS-compatible formats
 */
import type { Node, Paint } from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

export type CSSRGBAColor = string;
export type CSSHexColor = string;
export type SimplifiedFill = string | CSSRGBAColor | CSSHexColor;
export type SimplifiedStroke = {
  colors?: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};
export type SimplifiedStrokes = {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};

/**
 * Parse a single paint to simplified format
 */
export function parsePaint(
  paint: Paint,
  _forContainer: boolean
): SimplifiedFill {
  if (paint.type === "SOLID") {
    return formatRGBAColor(paint.color);
  }

  if (paint.type === "GRADIENT_LINEAR") {
    // Simplified - just note gradient type
    // Full implementation would convert handle positions to CSS gradient
    return "linear-gradient";
  }

  if (paint.type === "IMAGE") {
    return "image";
  }

  if (paint.type === "GRADIENT_RADIAL") {
    return "radial-gradient";
  }

  return "unknown";
}

/**
 * Build simplified strokes from a node
 */
export function buildSimplifiedStrokes(
  node: Node,
  _hasChildren: boolean
): SimplifiedStrokes {
  if (
    !hasValue("strokes", node) ||
    !Array.isArray(node.strokes) ||
    node.strokes.length === 0
  ) {
    return { colors: [] };
  }

  const colors = node.strokes
    .filter((p) => p.visible !== false)
    .map((p) => parsePaint(p, false));

  const result: SimplifiedStrokes = { colors };

  if (colors.length > 0) {
    if (
      hasValue("strokeWeight", node) &&
      typeof node.strokeWeight === "number"
    ) {
      result.strokeWeight = `${node.strokeWeight}px`;
    }

    if (hasValue("strokeDashes", node) && Array.isArray(node.strokeDashes)) {
      result.strokeDashes = node.strokeDashes;
    }

    // Individual stroke weights for rectangle nodes
    if (
      hasValue("strokeWeights", node) &&
      typeof node.strokeWeights === "object"
    ) {
      const weights = node.strokeWeights as {
        top: number;
        right: number;
        bottom: number;
        left: number;
      } | null;
      if (weights) {
        const { top, right, bottom, left } = weights;
        result.strokeWeights = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
  }

  return result;
}

/**
 * Format RGBA color to CSS string
 */
export function formatRGBAColor(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): CSSRGBAColor {
  const { r, g, b, a } = color;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
