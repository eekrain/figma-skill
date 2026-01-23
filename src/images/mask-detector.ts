/**
 * Mask detector - Scan node children for mask relationships
 *
 * Following Figma's sibling stencil model where isMask nodes mask
 * all subsequent siblings in the same parent container.
 *
 * This module is for the images pipeline and works with bounding boxes
 * for calculating crop regions when applying masks.
 */
import type { Node } from "@figma/rest-api-spec";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Bounding box for a node or image
 */
export interface BoundingBox {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

/**
 * Mask relationship between a target and its mask
 * Includes bounding boxes for compositing
 */
export interface MaskRelationship {
  /** The target node being masked */
  targetNodeId: string;
  /** The mask node (sibling with isMask: true) */
  maskNodeId: string;
  /** Mask type */
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
  /** Target bounding box */
  targetBoundingBox?: BoundingBox;
  /** Mask bounding box */
  maskBoundingBox?: BoundingBox;
  /** The actual mask node object */
  maskNode: Node;
  /** Array of target nodes when one mask affects multiple siblings */
  targets: Node[];
  /** Optional: Parent container containing the mask and targets */
  parentContainer?: Node;
}

/**
 * Node with mask trait from Figma API
 */
type NodeWithMask = Node & {
  isMask?: boolean;
  maskType?: "ALPHA" | "VECTOR" | "LUMINANCE";
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

/**
 * Parent node that can contain children (for mask relationship detection)
 */
type ParentNode = Node & {
  children?: Node[];
};

// =====================================================
// Mask Relationship Detection
// =====================================================

/**
 * Detect mask relationships in a parent node's children
 * Following Figma's sibling stencil model:
 * - isMask nodes mask all subsequent siblings in the same parent
 * - Masking stops when another isMask node is encountered
 * - The mask itself is not masked
 *
 * Returns one relationship per mask with all targets grouped together.
 *
 * @param parentNode - Parent node to scan for mask relationships
 * @returns Array of mask relationships with bounding boxes
 */
export function detectMaskRelationships(parentNode: Node): MaskRelationship[] {
  const relationships: MaskRelationship[] = [];

  // Check if parent has children
  const parent = parentNode as ParentNode;
  if (!parent.children || !Array.isArray(parent.children)) {
    return relationships;
  }

  // Track current mask and its targets
  let currentMask: {
    node: Node;
    nodeId: string;
    maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
    boundingBox?: BoundingBox;
    targets: Node[];
  } | null = null;

  for (const child of parent.children) {
    if (!child || !child.id) continue;

    const childWithMask = child as NodeWithMask;

    // Check if this child is a mask
    if (childWithMask.isMask === true) {
      // Save previous mask if exists
      if (currentMask && currentMask.targets.length > 0) {
        const firstTarget = currentMask.targets[0];
        relationships.push({
          targetNodeId: firstTarget.id,
          maskNodeId: currentMask.nodeId,
          maskType: currentMask.maskType,
          targetBoundingBox: extractBoundingBox(firstTarget),
          maskBoundingBox: currentMask.boundingBox,
          maskNode: currentMask.node,
          targets: currentMask.targets,
          parentContainer: parentNode,
        });
      }

      // This is a new mask - start masking subsequent siblings
      currentMask = {
        node: child,
        nodeId: child.id,
        maskType: childWithMask.maskType || "ALPHA",
        boundingBox: extractBoundingBox(childWithMask),
        targets: [],
      };
      // The mask node itself is not masked, so continue
      continue;
    }

    // If we have an active mask, this child is masked
    if (currentMask) {
      currentMask.targets.push(child);
    }
  }

  // Don't forget the last mask
  if (currentMask && currentMask.targets.length > 0) {
    const firstTarget = currentMask.targets[0];
    relationships.push({
      targetNodeId: firstTarget.id,
      maskNodeId: currentMask.nodeId,
      maskType: currentMask.maskType,
      targetBoundingBox: extractBoundingBox(firstTarget),
      maskBoundingBox: currentMask.boundingBox,
      maskNode: currentMask.node,
      targets: currentMask.targets,
      parentContainer: parentNode,
    });
  }

  return relationships;
}

// =====================================================
// Bounding Box Utilities
// =====================================================

/**
 * Extract bounding box from a node
 */
export function extractBoundingBox(node: Node): BoundingBox | undefined {
  const nodeWithBounds = node as NodeWithMask;
  if (nodeWithBounds.absoluteBoundingBox) {
    const { x, y, width, height } = nodeWithBounds.absoluteBoundingBox;
    return { x, y, width, height };
  }
  return undefined;
}

/**
 * Calculate the intersection of two bounding boxes
 * Returns the overlapping region
 */
export function calculateIntersection(box1: BoundingBox, box2: BoundingBox): BoundingBox {
  const x = Math.max(box1.x, box2.x);
  const y = Math.max(box1.y, box2.y);
  const width = Math.min(box1.x + box1.width, box2.x + box2.width) - x;
  const height = Math.min(box1.y + box1.height, box2.y + box2.height) - y;

  return {
    x,
    y,
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
}

/**
 * Check if two bounding boxes intersect
 */
export function boxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}

/**
 * Get the union of two bounding boxes
 * Returns the smallest box that contains both
 */
export function calculateUnion(box1: BoundingBox, box2: BoundingBox): BoundingBox {
  const x = Math.min(box1.x, box2.x);
  const y = Math.min(box1.y, box2.y);
  const width = Math.max(box1.x + box1.width, box2.x + box2.width) - x;
  const height = Math.max(box1.y + box1.height, box2.y + box2.height) - y;

  return { x, y, width, height };
}

/**
 * Check if a bounding box is valid (has positive dimensions)
 */
export function isValidBoundingBox(box: BoundingBox): boolean {
  return box.width > 0 && box.height > 0;
}

/**
 * Get the center point of a bounding box
 */
export function getBoundingBoxCenter(box: BoundingBox): { x: number; y: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Calculate the area of a bounding box
 */
export function calculateBoundingBoxArea(box: BoundingBox): number {
  return box.width * box.height;
}
