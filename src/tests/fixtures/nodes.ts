/**
 * Test fixtures for Figma nodes
 *
 * Factory functions for creating mock Figma nodes for testing
 */

import type { Node } from "@figma/rest-api-spec";

// Re-export Node type for test use
export type { Node };

/**
 * Create a mask node with specified properties
 */
export function createMaskNode(
  id: string,
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE",
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: `Mask ${maskType}`,
    type: "VECTOR",
    isMask: true,
    maskType,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a non-mask node
 */
export function createNonMaskNode(id: string, overrides: Partial<Node> = {}): Node {
  return {
    id,
    name: "Regular Node",
    type: "FRAME",
    isMask: false,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a parent frame with mask and masked children
 * Following Figma's sibling stencil model: isMask nodes mask all subsequent siblings
 */
export function createMaskedParent(
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE",
  targetCount: number,
  overrides: Partial<Node> = {}
): Node {
  const children: Node[] = [];

  // Add mask node first
  children.push(createMaskNode("mask-1", maskType));

  // Add masked targets
  for (let i = 0; i < targetCount; i++) {
    children.push(createNonMaskNode(`target-${i + 1}`));
  }

  return {
    id: "parent-with-mask",
    name: "Parent with Mask",
    type: "FRAME",
    children,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a parent with multiple masks
 */
export function createMultipleMaskParent(overrides: Partial<Node> = {}): Node {
  return {
    id: "parent-multiple-masks",
    name: "Parent with Multiple Masks",
    type: "FRAME",
    children: [
      createMaskNode("mask-1", "ALPHA"),
      createNonMaskNode("target-1"),
      createNonMaskNode("target-2"),
      createMaskNode("mask-2", "VECTOR"),
      createNonMaskNode("target-3"),
    ],
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a parent with no masks
 */
export function createNoMaskParent(overrides: Partial<Node> = {}): Node {
  return {
    id: "parent-no-mask",
    name: "Parent without Mask",
    type: "FRAME",
    children: [
      createNonMaskNode("child-1"),
      createNonMaskNode("child-2"),
      createNonMaskNode("child-3"),
    ],
    ...overrides,
  } as unknown as Node;
}

/**
 * Create nested mask structure
 */
export function createNestedMaskStructure(): Node {
  return {
    id: "root-parent",
    name: "Root Parent",
    type: "FRAME",
    children: [
      createMaskNode("outer-mask", "VECTOR"),
      createNonMaskNode("outer-target-1"),
      {
        id: "nested-parent",
        name: "Nested Parent",
        type: "FRAME",
        children: [
          createMaskNode("inner-mask", "ALPHA"),
          createNonMaskNode("inner-target-1"),
          createNonMaskNode("inner-target-2"),
        ],
      } as Node,
      createNonMaskNode("outer-target-2"),
    ],
  } as unknown as Node;
}

/**
 * Create a group node with masks
 */
export function createMaskedGroup(
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE",
  overrides: Partial<Node> = {}
): Node {
  return {
    id: "group-with-mask",
    name: "Group with Mask",
    type: "GROUP",
    children: [
      createMaskNode("group-mask", maskType),
      createNonMaskNode("group-target-1"),
      createNonMaskNode("group-target-2"),
    ],
    ...overrides,
  } as unknown as Node;
}

/**
 * Create an instance node with masks
 */
export function createMaskedInstance(
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE",
  overrides: Partial<Node> = {}
): Node {
  return {
    id: "instance-with-mask",
    name: "Instance with Mask",
    type: "INSTANCE",
    componentId: "component-123",
    children: [
      createMaskNode("instance-mask", maskType),
      createNonMaskNode("instance-target-1"),
    ],
    ...overrides,
  } as unknown as Node;
}

// =====================================================
// Utility Test Fixtures
// =====================================================

/**
 * Create a node with absoluteBoundingBox
 */
export function createNodeWithBounds(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: `Node ${width}x${height}`,
    type: "FRAME",
    absoluteBoundingBox: { x, y, width, height },
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a complete frame node with all properties
 */
export function createCompleteFrame(
  id: string,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Complete Frame",
    type: "FRAME",
    isMask: false,
    layoutMode: "NONE",
    children: [],
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a text node
 */
export function createTextNode(
  id: string,
  characters: string,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Text Node",
    type: "TEXT",
    characters,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a vector node (path)
 */
export function createVectorNode(
  id: string,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Vector Node",
    type: "VECTOR",
    isMask: false,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create an ellipse node
 */
export function createEllipseNode(
  id: string,
  isMask = false,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Ellipse Node",
    type: "ELLIPSE",
    isMask,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a rectangle node
 */
export function createRectangleNode(
  id: string,
  isMask = false,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Rectangle Node",
    type: "RECTANGLE",
    isMask,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a regular polygon node (star, triangle, etc.)
 */
export function createRegularPolygonNode(
  id: string,
  isMask = false,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Polygon Node",
    type: "REGULAR_POLYGON",
    isMask,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a star node
 */
export function createStarNode(
  id: string,
  isMask = false,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Star Node",
    type: "STAR",
    isMask,
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a line node
 */
export function createLineNode(
  id: string,
  overrides: Partial<Node> = {}
): Node {
  return {
    id,
    name: "Line Node",
    type: "LINE",
    ...overrides,
  } as unknown as Node;
}

// =====================================================
// Edge Case Fixtures
// =====================================================

/**
 * Create a node with missing isMask property
 */
export function createNodeWithoutIsMask(id: string): Node {
  return {
    id,
    name: "Node without isMask",
    type: "FRAME",
    // isMask intentionally omitted
  } as unknown as Node;
}

/**
 * Create an empty parent (no children)
 */
export function createEmptyParent(overrides: Partial<Node> = {}): Node {
  return {
    id: "empty-parent",
    name: "Empty Parent",
    type: "FRAME",
    children: [],
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a parent with undefined children
 */
export function createParentWithUndefinedChildren(overrides: Partial<Node> = {}): Node {
  return {
    id: "parent-undefined-children",
    name: "Parent with Undefined Children",
    type: "FRAME",
    // children intentionally omitted
    ...overrides,
  } as unknown as Node;
}

/**
 * Create a mask node without maskType
 */
export function createMaskNodeWithoutType(id: string): Node {
  return {
    id,
    name: "Mask without Type",
    type: "VECTOR",
    isMask: true,
    // maskType intentionally omitted
  } as unknown as Node;
}

/**
 * Create null/undefined edge case fixtures
 */
export const nullUndefinedFixtures = {
  nullId: null as unknown as Node,
  undefinedId: undefined as unknown as Node,
  emptyStringId: { id: "", name: "", type: "FRAME" } as Node,
  zeroId: { id: "0", name: "Zero", type: "FRAME" } as Node,
};
