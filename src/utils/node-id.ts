// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NodeId, NodeIdValidationResult } from "@/extractors/types";

interface ValidateNodeIdOptions {
  allowMultiple?: boolean;
  allowInstance?: boolean;
  allowUrlFormat?: boolean;
}

/**
 * Validate and normalize a node ID
 * MCP reference regex: /^(?:I?\d+[:-]\d+)(?:;(?:I?\d+[:-]\d+))*$/
 */
export function validateNodeId(
  nodeId: string,
  options: ValidateNodeIdOptions = {}
): NodeIdValidationResult {
  const {
    allowMultiple: _allowMultiple = true,
    allowInstance: _allowInstance = true,
    allowUrlFormat: _allowUrlFormat = true,
  } = options;

  // Pattern explanation:
  // ^(?:I?\d+[:-]\d+) - First node: optional I prefix, digits, separator (: or -), digits
  // (?:;(?:I?\d+[:-]\d+))* - Zero or more additional nodes: semicolon, optional I, digits, separator, digits
  const multiNodePattern = _allowInstance
    ? /^(?:I?\d+[:-]\d+)(?:;(?:I?\d+[:-]\d+))*$/
    : /^(?:\d+[:-]\d+)(?:;(?:\d+[:-]\d+))*$/;

  const isValid = multiNodePattern.test(nodeId);

  if (!isValid) {
    return { valid: false, error: `Invalid node ID format: ${nodeId}` };
  }

  const normalized = nodeId.replace(/-/g, ":");
  const ids = normalized.split(";");

  return { valid: true, normalized, ids };
}

/**
 * Convert URL-format node ID to API format (converts - to :)
 */
export function normalizeNodeId(nodeId: string): string {
  return nodeId.replace(/-/g, ":");
}

/**
 * Extract node ID from Figma URL
 */
export function extractNodeIdFromUrl(url: string): string | undefined {
  try {
    // eslint-disable-next-line no-undef
    const urlObj = new URL(url);
    return urlObj.searchParams.get("node-id") || undefined;
  } catch {
    return undefined;
  }
}
