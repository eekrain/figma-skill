/**
 * Mask transformer - convert Figma mask properties to simplified format
 *
 * Matches mcp-reference/src/transformers/mask.ts
 *
 * Handles Figma's sibling stencil model where isMask nodes mask
 * all subsequent siblings in the same parent container.
 */
import type { Node } from "@figma/rest-api-spec";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Simplified mask information extracted from a Figma node
 */
export interface SimplifiedMask {
  /** Whether this node is a mask */
  isMask: boolean;
  /** Mask type from Figma (only present when isMask is true) */
  maskType?: "ALPHA" | "VECTOR" | "LUMINANCE";
  /** ID of mask node if this node is masked by a sibling */
  maskId?: string;
}

/**
 * Mask relationship between a target node and its mask node
 * Following Figma's sibling stencil model
 */
export interface MaskRelationship {
  /** The target node being masked */
  targetNodeId: string;
  /** The mask node (sibling with isMask: true) */
  maskNodeId: string;
  /** Mask type */
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
}

/**
 * Node with mask trait from Figma API
 */
type NodeWithMask = Node & {
  isMask?: boolean;
  maskType?: "ALPHA" | "VECTOR" | "LUMINANCE";
};

/**
 * Parent node that can contain children (for mask relationship detection)
 */
type ParentNode = Node & {
  children?: Node[];
};

// =====================================================
// Mask Detection
// =====================================================

/**
 * Build simplified mask information from a Figma node
 * Matches mcp-reference: buildSimplifiedMask
 *
 * @param n - Figma node to extract mask info from
 * @returns Simplified mask information
 */
export function buildSimplifiedMask(n: Node | undefined | null): SimplifiedMask {
  // Handle undefined/null input
  if (!n) {
    return { isMask: false };
  }

  const nodeWithMask = n as NodeWithMask;

  // Default to non-mask
  const result: SimplifiedMask = {
    isMask: nodeWithMask.isMask === true,
  };

  // Only include maskType if this is actually a mask
  if (result.isMask && nodeWithMask.maskType) {
    result.maskType = nodeWithMask.maskType;
  }

  // maskId is set externally during relationship detection
  // not during individual node processing

  return result;
}

/**
 * Detect mask relationships in a parent node's children
 * Following Figma's sibling stencil model:
 * - isMask nodes mask all subsequent siblings in the same parent
 * - Masking stops when another isMask node is encountered
 * - The mask itself is not masked
 *
 * @param parentNode - Parent node to scan for mask relationships
 * @returns Array of mask relationships
 */
export function detectMaskRelationships(
  parentNode: Node
): MaskRelationship[] {
  const relationships: MaskRelationship[] = [];

  // Check if parent has children
  const parent = parentNode as ParentNode;
  if (!parent.children || !Array.isArray(parent.children)) {
    return relationships;
  }

  let currentMask: {
    nodeId: string;
    maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
  } | null = null;

  for (const child of parent.children) {
    if (!child || !child.id) continue;

    const childWithMask = child as NodeWithMask;

    // Check if this child is a mask
    if (childWithMask.isMask === true) {
      // This is a new mask - start masking subsequent siblings
      currentMask = {
        nodeId: child.id,
        maskType: childWithMask.maskType || "ALPHA",
      };
      // The mask node itself is not masked, so continue
      continue;
    }

    // If we have an active mask, this child is masked
    if (currentMask) {
      relationships.push({
        targetNodeId: child.id,
        maskNodeId: currentMask.nodeId,
        maskType: currentMask.maskType,
      });
    }
  }

  return relationships;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Check if a node type can contain children (and thus have mask relationships)
 */
export function isContainerNode(node: Node): boolean {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "INSTANCE" ||
    node.type === "COMPONENT"
  );
}

/**
 * Get all mask relationships for a node (as target)
 * Recursively searches parent containers
 *
 * @param nodeId - Node ID to find mask for
 * @param parents - Array of parent nodes to search
 * @returns Mask relationship if found, undefined otherwise
 */
export function findMaskForNode(
  nodeId: string,
  parents: Node[]
): MaskRelationship | undefined {
  for (const parent of parents) {
    const relationships = detectMaskRelationships(parent);
    const found = relationships.find((r) => r.targetNodeId === nodeId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Get all masked nodes from a parent
 *
 * @param parentNode - Parent node to scan
 * @returns Array of node IDs that are masked
 */
export function getMaskedNodeIds(parentNode: Node): string[] {
  const relationships = detectMaskRelationships(parentNode);
  return relationships.map((r) => r.targetNodeId);
}

/**
 * Get all mask node IDs from a parent
 *
 * @param parentNode - Parent node to scan
 * @returns Array of mask node IDs
 */
export function getMaskNodeIds(parentNode: Node): string[] {
  const parent = parentNode as ParentNode;
  if (!parent.children || !Array.isArray(parent.children)) {
    return [];
  }

  const maskIds: string[] = [];
  for (const child of parent.children) {
    const childWithMask = child as NodeWithMask;
    if (child?.id && childWithMask.isMask === true) {
      maskIds.push(child.id);
    }
  }
  return maskIds;
}
