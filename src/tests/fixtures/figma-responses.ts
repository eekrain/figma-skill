/**
 * Figma API response fixtures
 *
 * Loads and provides test data from example-outputs directory
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// =====================================================
// Configuration
// =====================================================

const EXAMPLE_OUTPUTS_DIR = "/home/eekrain/CODE/figma-skill/example-outputs";

// =====================================================
// Types
// =====================================================

export interface FigmaFileResponse {
  name: string;
  nodes: unknown[];
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
  globalVars?: {
    styles: Record<string, unknown>;
  };
}

export type FigmaFileKey = "one-card" | "many-cards" | "many-cards-different";

// =====================================================
// JSON File Loaders
// =====================================================

/**
 * Load JSON file from example-outputs directory
 */
export function loadExampleJson(filename: string): unknown {
  const path = join(EXAMPLE_OUTPUTS_DIR, filename);
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

/**
 * Load TOON format file from example-outputs directory
 * Note: TOON format parsing requires @toon-format/toon package
 */
export function loadExampleToon(filename: string): unknown {
  const path = join(EXAMPLE_OUTPUTS_DIR, filename);
  const content = readFileSync(path, "utf-8");

  // Basic TOON format structure (pre-validated format)
  // For full parsing, use: import { parseToon } from '@toon-format/toon';
  try {
    return JSON.parse(content);
  } catch {
    // TOON format might be a custom format
    return { raw: content, format: "toon" };
  }
}

// =====================================================
// Pre-loaded Test Data
// =====================================================

/**
 * Get one-card-only design data
 */
export function getOneCardData(): FigmaFileResponse {
  return loadExampleJson("one-card-only.json") as FigmaFileResponse;
}

/**
 * Get many-cards design data
 */
export function getManyCardsData(): FigmaFileResponse {
  return loadExampleJson("design-with-many-card-inside.json") as FigmaFileResponse;
}

/**
 * Get many-cards-different-images design data
 */
export function getManyCardsDifferentData(): FigmaFileResponse {
  return loadExampleJson("design-with-many-card-but-different-images-used.json") as FigmaFileResponse;
}

// =====================================================
// Test Data Accessors
// =====================================================

/**
 * Map of all available test files
 */
export const EXAMPLE_FILES = {
  ONE_CARD_JSON: getOneCardData(),
  ONE_CARD_TOON: loadExampleToon("one-card-only.toon"),
  MANY_CARDS_JSON: getManyCardsData(),
  MANY_CARDS_TOON: loadExampleToon("design-with-many-card-inside.toon"),
  MANY_CARDS_DIFFERENT_JSON: getManyCardsDifferentData(),
  MANY_CARDS_DIFFERENT_TOON: loadExampleToon("design-with-many-card-but-different-images-used.toon"),
} as const;

/**
 * Get test data by file key
 */
export function getExampleData(key: FigmaFileKey, format: "json" | "toon" = "json"): FigmaFileResponse {
  const dataKey = `${key.toUpperCase().replace(/-/g, "_")}_${format.toUpperCase()}` as keyof typeof EXAMPLE_FILES;
  const data = EXAMPLE_FILES[dataKey];

  if (!data) {
    throw new Error(`No test data found for key: ${key}, format: ${format}`);
  }

  return data as FigmaFileResponse;
}

// =====================================================
// Node Extraction Helpers
// =====================================================

/**
 * Extract nodes from test data
 */
export function getNodesFromData(data: FigmaFileResponse): unknown[] {
  return data.nodes || [];
}

/**
 * Find node by ID in test data
 */
export function findNodeById(data: FigmaFileResponse, nodeId: string): unknown | undefined {
  const nodes = getNodesFromData(data);

  function search(nodes: unknown[]): unknown | undefined {
    for (const node of nodes) {
      if (typeof node === "object" && node !== null) {
        if ((node as { id?: string }).id === nodeId) {
          return node;
        }
        if ((node as { children?: unknown[] }).children) {
          const found = search((node as { children: unknown[] }).children);
          if (found) return found;
        }
      }
    }
    return undefined;
  }

  return search(nodes);
}

/**
 * Count all nodes in test data (including nested)
 */
export function countNodes(data: FigmaFileResponse | { nodes?: unknown[] }): number {
  const nodes = getNodesFromData(data as FigmaFileResponse);

  function count(nodes: unknown[]): number {
    let total = 0;
    for (const node of nodes) {
      total++;
      if (typeof node === "object" && node !== null) {
        if ((node as { children?: unknown[] }).children) {
          total += count((node as { children: unknown[] }).children);
        }
      }
    }
    return total;
  }

  return count(nodes);
}

/**
 * Find all image nodes in test data
 * Handles both object-based fills (type: "IMAGE") and reference-based fills ("fill_XYZ" strings)
 */
export function findImageNodes(data: FigmaFileResponse): unknown[] {
  const nodes = getNodesFromData(data);
  const imageNodes: unknown[] = [];

  function findWithFills(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node === "object" && node !== null) {
        const fills = (node as { fills?: unknown }).fills;

        // Check if fills contain image references
        // Case 1: Object-based fills (type: "IMAGE")
        if (Array.isArray(fills) && fills.some((f: unknown) =>
          typeof f === "object" && f !== null && (f as { type?: string }).type === "IMAGE"
        )) {
          imageNodes.push(node);
        }
        // Case 2: Reference-based fills (string like "fill_XXX")
        else if (typeof fills === "string" && fills.startsWith("fill_")) {
          imageNodes.push(node);
        }
        // Case 3: Array of reference strings
        else if (Array.isArray(fills) && fills.length > 0 && typeof fills[0] === "string" &&
                 (fills[0] as string).startsWith("fill_")) {
          imageNodes.push(node);
        }

        if ((node as { children?: unknown[] }).children) {
          findWithFills((node as { children: unknown[] }).children);
        }
      }
    }
  }

  findWithFills(nodes);
  return imageNodes;
}

/**
 * Find all mask nodes in test data
 */
export function findMaskNodes(data: FigmaFileResponse): unknown[] {
  const nodes = getNodesFromData(data);
  const maskNodes: unknown[] = [];

  function findMasks(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node === "object" && node !== null) {
        if ((node as { isMask?: boolean }).isMask === true) {
          maskNodes.push(node);
        }
        if ((node as { children?: unknown[] }).children) {
          findMasks((node as { children: unknown[] }).children);
        }
      }
    }
  }

  findMasks(nodes);
  return maskNodes;
}

// =====================================================
// Mock Response Builders
// =====================================================

/**
 * Create a mock Figma file API response
 */
export function createMockFileResponse(
  fileKey: FigmaFileKey,
  overrides?: Partial<FigmaFileResponse>
): FigmaFileResponse {
  const baseData = getExampleData(fileKey);

  return {
    ...baseData,
    ...overrides,
  };
}

/**
 * Create a mock Figma nodes API response
 */
export function createMockNodesResponse(
  fileKey: FigmaFileKey,
  nodeIds?: string[]
): { nodes: Record<string, unknown> } {
  const data = getExampleData(fileKey);
  const allNodes = getNodesFromData(data);

  const nodeMap: Record<string, unknown> = {};

  function buildMap(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node === "object" && node !== null) {
        const id = (node as { id?: string }).id;
        if (id) {
          // Include all nodes if no filter, or only specified nodes
          if (!nodeIds || nodeIds.includes(id)) {
            nodeMap[id] = node;
          }
        }
        if ((node as { children?: unknown[] }).children) {
          buildMap((node as { children: unknown[] }).children);
        }
      }
    }
  }

  buildMap(allNodes);

  return { nodes: nodeMap };
}

// =====================================================
// File Size Info
// =====================================================

/**
 * Get file size information for example outputs
 */
export function getExampleFileInfo(): Record<string, { json: number; toon: number }> {
  const { statSync } = require("node:fs");

  const getSize = (filename: string) => {
    try {
      return statSync(join(EXAMPLE_OUTPUTS_DIR, filename)).size;
    } catch {
      return 0;
    }
  };

  return {
    "one-card": {
      json: getSize("one-card-only.json"),
      toon: getSize("one-card-only.toon"),
    },
    "many-cards": {
      json: getSize("design-with-many-card-inside.json"),
      toon: getSize("design-with-many-card-inside.toon"),
    },
    "many-cards-different": {
      json: getSize("design-with-many-card-but-different-images-used.json"),
      toon: getSize("design-with-many-card-but-different-images-used.toon"),
    },
  };
}

// =====================================================
// Test Scenario Helpers
// =====================================================

/**
 * Get test scenario info for one-card (simple)
 */
export function getOneCardScenario() {
  const data = getOneCardData();
  const nodes = countNodes(data);
  const imageNodes = findImageNodes(data);
  const maskNodes = findMaskNodes(data);

  return {
    fileKey: "one-card" as const,
    data,
    stats: {
      totalNodes: nodes,
      imageNodes: imageNodes.length,
      maskNodes: maskNodes.length,
    },
    complexity: "simple" as const,
    expectedDuration: 1000, // 1 second
  };
}

/**
 * Get test scenario info for many-cards (complex)
 */
export function getManyCardsScenario() {
  const data = getManyCardsData();
  const nodes = countNodes(data);
  const imageNodes = findImageNodes(data);
  const maskNodes = findMaskNodes(data);

  return {
    fileKey: "many-cards" as const,
    data,
    stats: {
      totalNodes: nodes,
      imageNodes: imageNodes.length,
      maskNodes: maskNodes.length,
    },
    complexity: "complex" as const,
    expectedDuration: 30000, // 30 seconds
  };
}

/**
 * Get test scenario info for many-cards-different (image-heavy)
 */
export function getManyCardsDifferentScenario() {
  const data = getManyCardsDifferentData();
  const nodes = countNodes(data);
  const imageNodes = findImageNodes(data);
  const maskNodes = findMaskNodes(data);

  return {
    fileKey: "many-cards-different" as const,
    data,
    stats: {
      totalNodes: nodes,
      imageNodes: imageNodes.length,
      maskNodes: maskNodes.length,
    },
    complexity: "image-heavy" as const,
    expectedDuration: 45000, // 45 seconds
  };
}

/**
 * Get all available test scenarios
 */
export function getAllScenarios() {
  return [
    getOneCardScenario(),
    getManyCardsScenario(),
    getManyCardsDifferentScenario(),
  ];
}

/**
 * Find scenario by file key
 */
export function getScenario(fileKey: FigmaFileKey) {
  const scenarios = getAllScenarios();
  return scenarios.find((s) => s.fileKey === fileKey);
}
