/**
 * Layout transformer - convert Figma layout properties to CSS flex-like format
 * Matches mcp-reference/src/transformers/layout.ts
 */
import type { Node } from "@figma/rest-api-spec";

import { generateCSSShorthand, pixelRound } from "@/utils/common.js";
import { isFrame, isInAutoLayoutFlow, isLayout } from "@/utils/identity.js";

export interface SimplifiedLayout {
  mode: "none" | "row" | "column";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "baseline"
    | "stretch";
  alignItems?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "baseline"
    | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;
  locationRelativeToParent?: { x: number; y: number };
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  padding?: string;
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug";
    vertical?: "fixed" | "fill" | "hug";
  };
  overflowScroll?: ("x" | "y")[];
  position?: "absolute";
}

type NodeWithLayout = Node & {
  layoutAlign?: string;
  layoutPositioning?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutGrow?: number;
  preserveRatio?: boolean;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  primaryAxisAlignItems?:
    | "MIN"
    | "MAX"
    | "CENTER"
    | "SPACE_BETWEEN"
    | "BASELINE";
  counterAxisAlignItems?:
    | "MIN"
    | "MAX"
    | "CENTER"
    | "SPACE_BETWEEN"
    | "BASELINE";
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  itemSpacing?: number;
  layoutWrap?: "NO_WRAP" | "WRAP";
  overflowDirection?: ("NONE" | "HORIZONTAL" | "VERTICAL" | "BOTH")[];
};

/**
 * Build simplified layout from a Figma node
 * Matches mcp-reference: buildSimplifiedLayout
 */
export function buildSimplifiedLayout(
  n: Node,
  parent?: Node
): SimplifiedLayout {
  const frameValues = buildSimplifiedFrameValues(n);
  const layoutValues =
    buildSimplifiedLayoutValues(n, parent, frameValues.mode) || {};

  return { ...frameValues, ...layoutValues };
}

/**
 * Build frame values (AutoLayout properties)
 * Matches mcp-reference: buildSimplifiedFrameValues
 */
function buildSimplifiedFrameValues(
  n: Node
): SimplifiedLayout | { mode: "none" } {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frameValues: SimplifiedLayout = {
    mode:
      !n.layoutMode || n.layoutMode === "NONE"
        ? "none"
        : n.layoutMode === "HORIZONTAL"
          ? "row"
          : "column",
  };

  const overflowScroll: SimplifiedLayout["overflowScroll"] = [];
  if (n.overflowDirection?.includes("HORIZONTAL")) overflowScroll.push("x");
  if (n.overflowDirection?.includes("VERTICAL")) overflowScroll.push("y");
  if (overflowScroll.length > 0) frameValues.overflowScroll = overflowScroll;

  if (frameValues.mode === "none") {
    return frameValues;
  }

  const nodeWithLayout = n as NodeWithLayout;

  frameValues.justifyContent = convertAlign(
    nodeWithLayout.primaryAxisAlignItems ?? "MIN",
    {
      children: n.children ?? [],
      axis: "primary",
      mode: frameValues.mode as "row" | "column",
    }
  );
  frameValues.alignItems = convertAlign(
    nodeWithLayout.counterAxisAlignItems ?? "MIN",
    {
      children: n.children ?? [],
      axis: "counter",
      mode: frameValues.mode as "row" | "column",
    }
  );
  frameValues.alignSelf = convertSelfAlign(nodeWithLayout.layoutAlign);

  frameValues.wrap = n.layoutWrap === "WRAP" ? true : undefined;
  frameValues.gap = n.itemSpacing ? `${n.itemSpacing ?? 0}px` : undefined;

  if (
    nodeWithLayout.paddingTop ||
    nodeWithLayout.paddingBottom ||
    nodeWithLayout.paddingLeft ||
    nodeWithLayout.paddingRight
  ) {
    frameValues.padding = generateCSSShorthand({
      top: nodeWithLayout.paddingTop ?? 0,
      right: nodeWithLayout.paddingRight ?? 0,
      bottom: nodeWithLayout.paddingBottom ?? 0,
      left: nodeWithLayout.paddingLeft ?? 0,
    });
  }

  return frameValues;
}

/**
 * Build layout values (positioning, dimensions, sizing)
 * Matches mcp-reference: buildSimplifiedLayoutValues
 */
function buildSimplifiedLayoutValues(
  n: Node,
  parent: Node | undefined,
  mode: "row" | "column" | "none"
): SimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const nodeWithLayout = n as NodeWithLayout;
  const layoutValues: SimplifiedLayout = { mode };

  layoutValues.sizing = {
    horizontal: convertSizing(nodeWithLayout.layoutSizingHorizontal),
    vertical: convertSizing(nodeWithLayout.layoutSizingVertical),
  };

  if (parent && isFrame(parent) && !isInAutoLayoutFlow(n, parent)) {
    if (nodeWithLayout.layoutPositioning === "ABSOLUTE") {
      layoutValues.position = "absolute";
    }
    if (nodeWithLayout.absoluteBoundingBox && parent.absoluteBoundingBox) {
      layoutValues.locationRelativeToParent = {
        x: pixelRound(
          nodeWithLayout.absoluteBoundingBox.x -
            (parent.absoluteBoundingBox?.x ?? 0)
        ),
        y: pixelRound(
          nodeWithLayout.absoluteBoundingBox.y -
            (parent.absoluteBoundingBox?.y ?? 0)
        ),
      };
    }
  }

  if (nodeWithLayout.absoluteBoundingBox) {
    const dimensions: {
      width?: number;
      height?: number;
      aspectRatio?: number;
    } = {};

    const bbox = nodeWithLayout.absoluteBoundingBox;

    if (mode === "row") {
      if (
        !nodeWithLayout.layoutGrow &&
        nodeWithLayout.layoutSizingHorizontal === "FIXED"
      ) {
        dimensions.width = bbox.width;
      }
      if (
        nodeWithLayout.layoutAlign !== "STRETCH" &&
        nodeWithLayout.layoutSizingVertical === "FIXED"
      ) {
        dimensions.height = bbox.height;
      }
    } else if (mode === "column") {
      if (
        nodeWithLayout.layoutAlign !== "STRETCH" &&
        nodeWithLayout.layoutSizingHorizontal === "FIXED"
      ) {
        dimensions.width = bbox.width;
      }
      if (
        !nodeWithLayout.layoutGrow &&
        nodeWithLayout.layoutSizingVertical === "FIXED"
      ) {
        dimensions.height = bbox.height;
      }
      if (nodeWithLayout.preserveRatio && bbox.width && bbox.height) {
        dimensions.aspectRatio = bbox.width / bbox.height;
      }
    } else {
      if (
        !nodeWithLayout.layoutSizingHorizontal ||
        nodeWithLayout.layoutSizingHorizontal === "FIXED"
      ) {
        dimensions.width = bbox.width;
      }
      if (
        !nodeWithLayout.layoutSizingVertical ||
        nodeWithLayout.layoutSizingVertical === "FIXED"
      ) {
        dimensions.height = bbox.height;
      }
    }

    if (Object.keys(dimensions).length > 0) {
      if (dimensions.width !== undefined) {
        dimensions.width = pixelRound(dimensions.width);
      }
      if (dimensions.height !== undefined) {
        dimensions.height = pixelRound(dimensions.height);
      }
      layoutValues.dimensions = dimensions;
    }
  }

  return layoutValues;
}

/**
 * Process alignment and sizing for flex layouts
 * Matches mcp-reference: convertAlign
 */
function convertAlign(
  axisAlign?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN" | "BASELINE",
  stretch?: {
    children: Node[];
    axis: "primary" | "counter";
    mode: "row" | "column" | "none";
  }
):
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "baseline"
  | "stretch"
  | undefined {
  if (stretch && stretch.mode !== "none") {
    const { children, mode, axis } = stretch;
    const direction = getDirection(axis, mode);

    const shouldStretch =
      children.length > 0 &&
      children.reduce((shouldStretch, c) => {
        if (!shouldStretch) return false;
        const childLayout = c as NodeWithLayout;
        if (childLayout.layoutPositioning === "ABSOLUTE") return true;
        if (direction === "horizontal") {
          return childLayout.layoutSizingHorizontal === "FILL";
        } else {
          return childLayout.layoutSizingVertical === "FILL";
        }
      }, true);

    if (shouldStretch) return "stretch";
  }

  switch (axisAlign) {
    case "MIN":
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "SPACE_BETWEEN":
      return "space-between";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

/**
 * Matches mcp-reference: convertSelfAlign
 */
function convertSelfAlign(
  align?: string
): "flex-start" | "flex-end" | "center" | "stretch" | undefined {
  switch (align) {
    case "MIN":
    case "INHERIT":
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "STRETCH":
      return "stretch";
    default:
      return undefined;
  }
}

/**
 * Interpret sizing
 * Matches mcp-reference: convertSizing
 */
function convertSizing(s?: string): "fixed" | "fill" | "hug" | undefined {
  if (s === "FIXED") return "fixed";
  if (s === "FILL") return "fill";
  if (s === "HUG") return "hug";
  return undefined;
}

/**
 * Get direction based on axis and mode
 * Matches mcp-reference: getDirection
 */
function getDirection(
  axis: "primary" | "counter",
  mode: "row" | "column"
): "horizontal" | "vertical" {
  if (axis === "primary") {
    return mode === "row" ? "horizontal" : "vertical";
  } else {
    return mode === "row" ? "horizontal" : "vertical";
  }
}
