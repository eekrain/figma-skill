/**
 * Built-in extractor functions for common use cases
 *
 * Matches mcp-reference/src/extractors/built-in.ts
 * Now with style deduplication system
 */
import type { Node } from "@figma/rest-api-spec";

import type {
  ExtractorFn,
  SimplifiedNode,
  StyleTypes,
  TraversalContext,
} from "@/extractors/types";
import { buildSimplifiedEffects } from "@/transformers/effects";
import { buildSimplifiedLayout } from "@/transformers/layout";
import { buildSimplifiedMask } from "@/transformers/mask";
import { buildSimplifiedStrokes, parsePaint } from "@/transformers/style";
import {
  extractNodeText,
  extractTextStyle,
  hasTextStyle,
  isTextNode,
} from "@/transformers/text";
import { generateVarId } from "@/utils/common";
import { isRectangleCornerRadii } from "@/utils/identity";

// =====================================================
// Helper Functions (matching mcp-reference)
// =====================================================

/**
 * Helper function to find or create a global variable
 * Matches mcp-reference: findOrCreateVar
 *
 * Deduplicates styles by storing them in globalVars and returning
 * a variable ID reference instead of the raw style data.
 */
function findOrCreateVar(
  globalVars: { styles: Record<string, StyleTypes> },
  value: StyleTypes,
  prefix: string
): string {
  const [existingVarId] =
    Object.entries(globalVars.styles).find(
      ([_, existingValue]) =>
        JSON.stringify(existingValue) === JSON.stringify(value)
    ) ?? [];

  if (existingVarId) return existingVarId;

  const varId = generateVarId(prefix);
  globalVars.styles[varId] = value;
  return varId;
}

/**
 * Helper to get Figma style name for a node
 * Matches mcp-reference: getStyleName
 *
 * Resolves Figma's named styles (from globalVars.extraStyles)
 * to their human-readable names.
 */
function getStyleName(
  node: Node,
  context: TraversalContext,
  keys: string[]
): string | undefined {
  if (!("styles" in node) || !node.styles) return undefined;
  const styleMap = node.styles as Record<string, string>;
  for (const key of keys) {
    const styleId = styleMap[key];
    if (styleId) {
      const meta = context.globalVars.extraStyles?.[styleId];
      if (meta?.name) return meta.name;
    }
  }
  return undefined;
}

// =====================================================
// Extractors (matching mcp-reference)
// =====================================================

/**
 * Extracts layout-related properties
 * Matches mcp-reference: layoutExtractor
 */
export const layoutExtractor: ExtractorFn = (node, result, context) => {
  const layout = buildSimplifiedLayout(node, context.parent);
  if (Object.keys(layout).length > 1) {
    result.layout = findOrCreateVar(context.globalVars, layout, "layout");
  }
};

/**
 * Extracts text content and styling
 * Matches mcp-reference: textExtractor
 */
export const textExtractor: ExtractorFn = (node, result, context) => {
  if (isTextNode(node)) {
    result.text = extractNodeText(node);
  }

  if (hasTextStyle(node)) {
    const textStyle = extractTextStyle(node);
    if (textStyle) {
      const styleName = getStyleName(node, context, ["text", "typography"]);
      if (styleName) {
        context.globalVars.styles[styleName] = textStyle;
        result.textStyle = styleName;
      } else {
        result.textStyle = findOrCreateVar(
          context.globalVars,
          textStyle,
          "style"
        );
      }
    }
  }
};

/**
 * Extracts visual appearance properties
 * Matches mcp-reference: visualsExtractor
 */
export const visualsExtractor: ExtractorFn = (node, result, context) => {
  const hasChildren =
    "children" in node &&
    Array.isArray(node.children) &&
    node.children.length > 0;

  // fills
  if ("fills" in node && Array.isArray(node.fills) && node.fills.length) {
    const fills = node.fills
      .map((fill) => parsePaint(fill, hasChildren))
      .reverse();
    const styleName = getStyleName(node, context, ["fill", "fills"]);
    if (styleName) {
      context.globalVars.styles[styleName] = fills;
      result.fills = styleName;
    } else {
      result.fills = findOrCreateVar(context.globalVars, fills, "fill");
    }
  }

  // strokes
  const strokes = buildSimplifiedStrokes(node, hasChildren);
  if (strokes.colors.length) {
    const styleName = getStyleName(node, context, ["stroke", "strokes"]);
    if (styleName) {
      context.globalVars.styles[styleName] = strokes.colors;
      result.strokes = styleName;
      if (strokes.strokeWeight) result.strokeWeight = strokes.strokeWeight;
      if (strokes.strokeDashes) result.strokeDashes = strokes.strokeDashes;
      if (strokes.strokeWeights) result.strokeWeights = strokes.strokeWeights;
    } else {
      result.strokes = findOrCreateVar(context.globalVars, strokes, "stroke");
    }
  }

  // effects
  const effects = buildSimplifiedEffects(node);
  if (Object.keys(effects).length) {
    const styleName = getStyleName(node, context, ["effect", "effects"]);
    if (styleName) {
      context.globalVars.styles[styleName] = effects;
      result.effects = styleName;
    } else {
      result.effects = findOrCreateVar(context.globalVars, effects, "effect");
    }
  }

  // opacity
  if (
    "opacity" in node &&
    typeof node.opacity === "number" &&
    node.opacity !== 1
  ) {
    result.opacity = node.opacity;
  }

  // border radius
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    result.borderRadius = `${node.cornerRadius}px`;
  }
  if (
    "rectangleCornerRadii" in node &&
    isRectangleCornerRadii(node.rectangleCornerRadii)
  ) {
    result.borderRadius = `${node.rectangleCornerRadii[0]}px ${node.rectangleCornerRadii[1]}px ${node.rectangleCornerRadii[2]}px ${node.rectangleCornerRadii[3]}px`;
  }
};

/**
 * Extracts component-related properties
 * Matches mcp-reference: componentExtractor
 */
export const componentExtractor: ExtractorFn = (node, result) => {
  if (node.type === "INSTANCE") {
    if ("componentId" in node && node.componentId) {
      result.componentId = node.componentId;
    }

    if ("componentProperties" in node && node.componentProperties) {
      result.componentProperties = Object.entries(
        node.componentProperties ?? {}
      ).map(([name, { value, type }]) => ({
        name,
        value: value.toString(),
        type,
      }));
    }
  }
};

/**
 * Extracts mask information
 * Matches mcp-reference: maskExtractor
 */
export const maskExtractor: ExtractorFn = (node, result) => {
  const maskInfo = buildSimplifiedMask(node);
  if (maskInfo.isMask || maskInfo.maskId) {
    result.mask = maskInfo;
  }
};

// -------------------- CONVENIENCE COMBINATIONS --------------------

// Convenience combinations (matches mcp-reference)
export const allExtractors = [
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
  maskExtractor,
];

export const layoutAndText = [layoutExtractor, textExtractor];
export const contentOnly = [textExtractor];
export const visualsOnly = [visualsExtractor];
export const layoutOnly = [layoutExtractor];

// -------------------- AFTER CHILDREN HELPERS --------------------

/**
 * Node types that can be exported as SVG images
 * Matches mcp-reference: SVG_ELIGIBLE_TYPES
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
 * afterChildren callback that collapses SVG-heavy containers
 * Matches mcp-reference: collapseSvgContainers
 *
 * If a FRAME, GROUP, or INSTANCE contains only SVG-eligible children,
 * the parent is marked as IMAGE-SVG and children are omitted.
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
