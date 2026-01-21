/**
 * Layout transformer - convert Figma layout properties to CSS flex-like format
 */
import type { Node } from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

export type SimplifiedLayout = {
  mode?: "none" | "row" | "column";
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
};

export type FrameNode = Extract<Node, { layoutMode?: string }>;

/**
 * Build simplified layout from a Figma node
 */
export function buildSimplifiedLayout(
  n: Node,
  parent?: Node
): SimplifiedLayout {
  const frameValues = buildFrameValues(n);
  const layoutValues = buildLayoutValues(n, parent, frameValues.mode ?? "none");

  return { ...frameValues, ...layoutValues };
}

/**
 * Check if node is a frame with AutoLayout
 */
function isFrame(n: Node): n is FrameNode {
  return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";
}

/**
 * Build frame values (AutoLayout properties)
 */
function buildFrameValues(n: Node): SimplifiedLayout {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frame = n as FrameNode;
  const result: SimplifiedLayout = {};

  // Convert layout mode
  if (frame.layoutMode && frame.layoutMode !== "NONE") {
    result.mode =
      frame.layoutMode === "HORIZONTAL"
        ? "row"
        : frame.layoutMode === "VERTICAL"
          ? "column"
          : "none";
  } else {
    result.mode = "none";
  }

  if (result.mode === "none") {
    return result;
  }

  // Convert alignment
  if (frame.primaryAxisAlignItems) {
    result.justifyContent = convertAlign(frame.primaryAxisAlignItems);
  }

  if (frame.counterAxisAlignItems) {
    result.alignItems = convertAlign(frame.counterAxisAlignItems);
  }

  if (frame.layoutAlign) {
    result.alignSelf = convertSelfAlign(frame.layoutAlign);
  }

  // Wrap
  if (frame.layoutWrap === "WRAP") {
    result.wrap = true;
  }

  // Gap
  if (hasValue("itemSpacing", frame) && frame.itemSpacing !== 0) {
    result.gap = `${frame.itemSpacing}px`;
  }

  // Padding
  if (
    hasValue("paddingTop", frame) ||
    hasValue("paddingBottom", frame) ||
    hasValue("paddingLeft", frame) ||
    hasValue("paddingRight", frame)
  ) {
    const top = frame.paddingTop ?? 0;
    const right = frame.paddingRight ?? 0;
    const bottom = frame.paddingBottom ?? 0;
    const left = frame.paddingLeft ?? 0;

    if (top === right && right === bottom && bottom === left) {
      result.padding = `${top}px`;
    } else if (top === bottom && left === right) {
      result.padding = `${top}px ${right}px`;
    } else {
      result.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }

  // Overflow scroll
  const overflowScroll: ("x" | "y")[] = [];
  if (frame.overflowDirection?.includes("HORIZONTAL")) {
    overflowScroll.push("x");
  }
  if (frame.overflowDirection?.includes("VERTICAL")) {
    overflowScroll.push("y");
  }
  if (overflowScroll.length > 0) {
    result.overflowScroll = overflowScroll;
  }

  return result;
}

/**
 * Build layout values (positioning, dimensions, sizing)
 */
function buildLayoutValues(
  n: Node,
  parent: Node | undefined,
  mode: "row" | "column" | "none"
): SimplifiedLayout {
  const result: SimplifiedLayout = { mode };

  // Only process if node has layout
  if (!hasValue("absoluteBoundingBox", n)) {
    return result;
  }

  const bbox = (
    n as {
      absoluteBoundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null;
    }
  ).absoluteBoundingBox;
  if (!bbox) {
    return result;
  }

  // Sizing
  result.sizing = {
    horizontal: convertSizing(
      (n as { layoutSizingHorizontal?: string }).layoutSizingHorizontal
    ),
    vertical: convertSizing(
      (n as { layoutSizingVertical?: string }).layoutSizingVertical
    ),
  };

  // Positioning (only if parent is not AutoLayout or node is absolute)
  const parentIsFrame = parent ? isFrame(parent) : false;
  const parentHasAutoLayout =
    parentIsFrame &&
    (parent as FrameNode).layoutMode &&
    (parent as FrameNode).layoutMode !== "NONE";

  const nodeProps = n as {
    layoutPositioning?: string;
    layoutGrow?: number;
    layoutAlign?: string;
    layoutSizingHorizontal?: string;
    layoutSizingVertical?: string;
    preserveRatio?: boolean;
  };

  if (!parentHasAutoLayout || nodeProps.layoutPositioning === "ABSOLUTE") {
    if (nodeProps.layoutPositioning === "ABSOLUTE") {
      result.position = "absolute";
    }

    const parentBbox = parent
      ? (parent as { absoluteBoundingBox?: { x: number; y: number } | null })
          .absoluteBoundingBox
      : null;
    if (parentBbox) {
      result.locationRelativeToParent = {
        x: Math.round(bbox.x - parentBbox.x),
        y: Math.round(bbox.y - parentBbox.y),
      };
    }
  }

  // Dimensions (only include non-stretching dimensions)
  const dimensions: { width?: number; height?: number; aspectRatio?: number } =
    {};

  if (mode === "row") {
    if (!nodeProps.layoutGrow && nodeProps.layoutSizingHorizontal === "FIXED") {
      dimensions.width = Math.round(bbox.width);
    }
    if (
      nodeProps.layoutAlign !== "STRETCH" &&
      nodeProps.layoutSizingVertical === "FIXED"
    ) {
      dimensions.height = Math.round(bbox.height);
    }
  } else if (mode === "column") {
    if (
      nodeProps.layoutAlign !== "STRETCH" &&
      nodeProps.layoutSizingHorizontal === "FIXED"
    ) {
      dimensions.width = Math.round(bbox.width);
    }
    if (!nodeProps.layoutGrow && nodeProps.layoutSizingVertical === "FIXED") {
      dimensions.height = Math.round(bbox.height);
    }
  } else {
    if (
      !nodeProps.layoutSizingHorizontal ||
      nodeProps.layoutSizingHorizontal === "FIXED"
    ) {
      dimensions.width = Math.round(bbox.width);
    }
    if (
      !nodeProps.layoutSizingVertical ||
      nodeProps.layoutSizingVertical === "FIXED"
    ) {
      dimensions.height = Math.round(bbox.height);
    }
  }

  // Aspect ratio (if preserved)
  if (nodeProps.preserveRatio && bbox.width && bbox.height) {
    dimensions.aspectRatio = Math.round((bbox.width / bbox.height) * 100) / 100;
  }

  if (Object.keys(dimensions).length > 0) {
    result.dimensions = dimensions;
  }

  return result;
}

function convertAlign(
  align?: string
):
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "baseline"
  | "stretch"
  | undefined {
  switch (align) {
    case "MIN":
      return undefined; // Default
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

function convertSelfAlign(
  align?: string
): "flex-start" | "flex-end" | "center" | "stretch" | undefined {
  switch (align) {
    case "MIN":
      return undefined; // Default
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

function convertSizing(sizing?: string): "fixed" | "fill" | "hug" | undefined {
  if (sizing === "FIXED") return "fixed";
  if (sizing === "FILL") return "fill";
  if (sizing === "HUG") return "hug";
  return undefined;
}
