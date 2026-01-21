/**
 * Built-in extractor functions for common use cases
 *
 * These extractors provide convenient presets for common extraction scenarios.
 * Now wired up to the transformer functions.
 */
import type { Node } from "@figma/rest-api-spec";

import type { SimplifiedNode } from "@/types/index";

import { buildSimplifiedEffects } from "@/transformers/effects";
import { buildSimplifiedLayout } from "@/transformers/layout";
import { buildSimplifiedStrokes, parsePaint } from "@/transformers/style";
import {
  extractNodeText,
  extractTextStyle,
  isTextNode,
} from "@/transformers/text";
import { hasValue } from "@/utils/common";

import type { ExtractorFn } from "./types";

/**
 * Extract layout information from a node
 */
export const layoutExtractor: ExtractorFn = (node, result, context) => {
  const layout = buildSimplifiedLayout(node, context.parent);
  if (Object.keys(layout).length > 0) {
    result.layout = layout;
  }
};

/**
 * Extract text content and typography from a node
 */
export const textExtractor: ExtractorFn = (node, result, _context) => {
  // Extract text content
  if (isTextNode(node)) {
    const text = extractNodeText(node);
    if (text) {
      (result as { text?: string }).text = text;
    }
  }

  // Extract text style
  const textStyle = extractTextStyle(node);
  if (textStyle) {
    (result as { textStyle?: typeof textStyle }).textStyle = textStyle;
  }
};

/**
 * Extract visual appearance (fills, strokes, effects, opacity, border radius)
 */
export const visualsExtractor: ExtractorFn = (node, result, _context) => {
  // Check if node has children to determine CSS properties
  const hasChildren =
    hasValue("children", node) &&
    Array.isArray(node.children) &&
    node.children.length > 0;

  // Extract fills
  if (
    hasValue("fills", node) &&
    Array.isArray(node.fills) &&
    node.fills.length > 0
  ) {
    const fills = node.fills
      .filter((f) => f.visible !== false)
      .map((f) => parsePaint(f, hasChildren))
      .reverse();
    (result as { fills?: typeof fills }).fills = fills;
  }

  // Extract strokes
  const strokes = buildSimplifiedStrokes(node, hasChildren);
  if (strokes.colors.length > 0) {
    (result as { strokes?: typeof strokes.colors }).strokes = strokes.colors;
    if (strokes.strokeWeight) {
      (result as { strokeWeight?: string }).strokeWeight = strokes.strokeWeight;
    }
    if (strokes.strokeDashes) {
      (result as { strokeDashes?: number[] }).strokeDashes =
        strokes.strokeDashes;
    }
    if (strokes.strokeWeights) {
      (result as { strokeWeights?: string }).strokeWeights =
        strokes.strokeWeights;
    }
  }

  // Extract effects
  const effects = buildSimplifiedEffects(node);
  if (Object.keys(effects).length > 0) {
    Object.assign(result, effects);
  }

  // Extract opacity
  if (
    hasValue("opacity", node) &&
    typeof node.opacity === "number" &&
    node.opacity !== 1
  ) {
    (result as { opacity?: number }).opacity = node.opacity;
  }

  // Extract border radius
  if (hasValue("cornerRadius", node) && typeof node.cornerRadius === "number") {
    (result as { borderRadius?: string }).borderRadius =
      `${node.cornerRadius}px`;
  }
  if (
    hasValue("rectangleCornerRadii", node) &&
    Array.isArray(node.rectangleCornerRadii)
  ) {
    const [top, right, bottom, left] = node.rectangleCornerRadii;
    (result as { borderRadius?: string }).borderRadius =
      `${top}px ${right}px ${bottom}px ${left}px`;
  }
};

/**
 * Extract component information from instances
 */
export const componentExtractor: ExtractorFn = (node, result, _context) => {
  if (node.type === "INSTANCE") {
    if (hasValue("componentId", node)) {
      (result as { componentId?: string }).componentId = node.componentId;
    }

    // Add component properties
    if (hasValue("componentProperties", node)) {
      const componentProperties = Object.entries(
        node.componentProperties ?? {}
      ).map(([name, { value, type }]) => ({
        name,
        value: String(value),
        type,
      }));
      (
        result as { componentProperties?: typeof componentProperties }
      ).componentProperties = componentProperties;
    }
  }
};

// -------------------- CONVENIENCE COMBINATIONS --------------------

/**
 * All extractors - comprehensive extraction
 */
export const allExtractors: ExtractorFn[] = [
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
];

/**
 * Layout and text only
 */
export const layoutAndText: ExtractorFn[] = [layoutExtractor, textExtractor];

/**
 * Text content only
 */
export const contentOnly: ExtractorFn[] = [textExtractor];

/**
 * Visuals only
 */
export const visualsOnly: ExtractorFn[] = [visualsExtractor];

/**
 * Layout only
 */
export const layoutOnly: ExtractorFn[] = [layoutExtractor];

// -------------------- AFTER CHILDREN HELPERS --------------------

/**
 * Node types that can be exported as SVG images
 */
export const SVG_ELIGIBLE_TYPES = new Set([
  "IMAGE-SVG",
  "STAR",
  "LINE",
  "ELLIPSE",
  "REGULAR_POLYGON",
  "RECTANGLE",
  "VECTOR",
]);

/**
 * afterChildren callback that collapses SVG-heavy containers to IMAGE-SVG
 */
export function collapseSvgContainers(
  node: Node,
  result: SimplifiedNode,
  children: SimplifiedNode[]
): SimplifiedNode[] {
  const allChildrenAreSvgEligible = children.every((child) =>
    SVG_ELIGIBLE_TYPES.has(child.type)
  );

  if (
    (node.type === "FRAME" ||
      node.type === "GROUP" ||
      node.type === "INSTANCE") &&
    allChildrenAreSvgEligible
  ) {
    result.type = "IMAGE-SVG";
    return [];
  }

  return children;
}
