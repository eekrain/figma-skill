// Match mcp-reference/src/utils/identity.ts
import type { Node } from "@figma/rest-api-spec";

/**
 * Check if node has a specific property
 */
export function hasValue<K extends keyof Node>(
  key: K,
  node: Node,
  guard?: (value: Node[K]) => boolean
): node is Node & Record<K, NonNullable<Node[K]>> {
  if (node[key] === null || node[key] === undefined) {
    return false;
  }
  return guard ? guard(node[key]) : true;
}

/**
 * Type guards for specific node types
 */
export function isFrame(
  node: Node
): node is Node & { type: "FRAME" | "COMPONENT" | "INSTANCE" } {
  return (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

export function isLayout(node: Node): node is Node & {
  layoutAlign?: string;
  layoutPositioning?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
} {
  return "layoutAlign" in node || "layoutPositioning" in node;
}

export function isRectangle<K extends keyof Node>(
  key: K,
  node: Node
): node is Node & Record<K, NonNullable<Node[K]>> {
  return key in node && node[key] !== null && node[key] !== undefined;
}

export function isRectangleCornerRadii(
  value: unknown
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === "number")
  );
}

export function isStrokeWeights(value: unknown): value is {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "top" in value &&
    "right" in value &&
    "bottom" in value &&
    "left" in value
  );
}

export function isInAutoLayoutFlow(node: Node, parent?: Node): boolean {
  if (!parent || !isFrame(parent)) return false;
  if (parent.layoutMode === "NONE") return false;
  // Use hasValue to check if layoutPositioning exists and is "ABSOLUTE"
  if (
    "layoutPositioning" in node &&
    node.layoutPositioning === "ABSOLUTE"
  ) {
    return false;
  }
  return true;
}

export function isTextNode(node: Node): node is Node & { type: "TEXT" } {
  return node.type === "TEXT";
}

export function hasTextStyle(node: Node): node is Node & {
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: { value?: number; unit?: string };
  letterSpacing?: { value?: number; unit?: string };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textCase?: string;
  textDecoration?: string;
} {
  return "fontSize" in node;
}
