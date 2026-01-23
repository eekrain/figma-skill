/**
 * Mock Figma REST API functions for integration tests
 *
 * Uses Jest mocks instead of HTTP server for simplicity and speed
 * This approach is faster and easier to debug than a full HTTP mock server
 */

import { jest } from "@jest/globals";
import type { FigmaFileResponse } from "../fixtures/figma-responses.js";
import {
  createMockFileResponse,
  createMockNodesResponse,
  getExampleData,
  type FigmaFileKey,
} from "../fixtures/figma-responses.js";

// =====================================================
// Types
// =====================================================

export interface MockFigmaFileResponse {
  file: {
    key: string;
    name: string;
  };
  nodes: Record<string, unknown>;
}

export interface MockFigmaImageExportResponse {
  [nodeId: string]: string; // nodeId -> imageUrl mapping
}

export interface MockFetchOptions {
  fileKey?: FigmaFileKey;
  nodeIds?: string[];
  imageFormat?: "png" | "jpg" | "svg";
  imageScale?: number;
  overrides?: Partial<FigmaFileResponse>;
}

// =====================================================
// Mock Fetch Function
// =====================================================

/**
 * Create a mock fetch function for Figma REST API
 *
 * @returns Jest mock function
 */
export function createMockFetch() {
  return jest.fn<typeof fetch>();
}

// =====================================================
// Response Builders
// =====================================================

/**
 * Create a mock Figma file endpoint response
 */
export function createFileResponse(
  fileKey: FigmaFileKey,
  options: MockFetchOptions = {}
): MockFigmaFileResponse {
  const { overrides } = options;
  const data = createMockFileResponse(fileKey, overrides);

  // Convert nodes array to record for API response format
  const nodesMap: Record<string, unknown> = {};

  function buildMap(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node === "object" && node !== null) {
        const id = (node as { id?: string }).id;
        if (id) {
          nodesMap[id] = node;
        }
        if ((node as { children?: unknown[] }).children) {
          buildMap((node as { children: unknown[] }).children);
        }
      }
    }
  }

  if (data.nodes) {
    buildMap(data.nodes);
  }

  return {
    file: {
      key: fileKey,
      name: data.name,
    },
    nodes: nodesMap,
  };
}

/**
 * Create a mock Figma nodes endpoint response
 */
export function createNodesResponse(
  fileKey: FigmaFileKey,
  nodeIds?: string[]
): Record<string, unknown> {
  return createMockNodesResponse(fileKey, nodeIds).nodes;
}

/**
 * Create a mock image export endpoint response
 *
 * @param nodeIds - Node IDs to export
 * @param baseUrl - Base URL for mock images (default: https://example.com/images/)
 * @param format - Image format (default: png)
 * @returns Mapping of nodeId to imageUrl
 */
export function createImageExportResponse(
  nodeIds: string[],
  baseUrl = "https://example.com/images/",
  format = "png"
): MockFigmaImageExportResponse {
  const response: MockFigmaImageExportResponse = {};

  for (const nodeId of nodeIds) {
    response[nodeId] = `${baseUrl}${nodeId}.${format}`;
  }

  return response;
}

/**
 * Create mock image buffer (for download tests)
 *
 * @param width - Image width
 * @param height - Image height
 * @param color - RGB color
 * @returns Buffer containing PNG image data
 */
export async function createMockImageBuffer(
  width = 100,
  height = 100,
  color = { r: 255, g: 0, b: 0 }
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: rgb,
    },
  })
    .png()
    .toBuffer();
}

// =====================================================
// Pre-configured Mock Scenarios
// =====================================================

/**
 * Setup mock for one-card scenario
 *
 * @param mockFetch - Jest mock function to configure
 * @returns The configured mock function
 */
export function setupOneCardScenario(
  mockFetch: ReturnType<typeof createMockFetch>
) {
  const fileResponse = createFileResponse("one-card");

  mockFetch.mockImplementation((url: string | URL) => {
    const urlStr = url.toString();

    // File endpoint
    if (urlStr.includes("/files/")) {
      return Promise.resolve({
        ok: true,
        json: async () => fileResponse,
      } as Response);
    }

    // Nodes endpoint
    if (urlStr.includes("/nodes/")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ nodes: fileResponse.nodes }),
      } as Response);
    }

    // Image export endpoint
    if (urlStr.includes("/images/")) {
      const nodeIds = extractNodeIdsFromUrl(urlStr);
      return Promise.resolve({
        ok: true,
        json: async () => createImageExportResponse(nodeIds),
      } as Response);
    }

    // Unknown endpoint
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);
  });

  return mockFetch;
}

/**
 * Setup mock for many-cards scenario
 *
 * @param mockFetch - Jest mock function to configure
 * @returns The configured mock function
 */
export function setupManyCardsScenario(
  mockFetch: ReturnType<typeof createMockFetch>
) {
  const fileResponse = createFileResponse("many-cards");

  mockFetch.mockImplementation((url: string | URL) => {
    const urlStr = url.toString();

    // File endpoint
    if (urlStr.includes("/files/")) {
      return Promise.resolve({
        ok: true,
        json: async () => fileResponse,
      } as Response);
    }

    // Nodes endpoint
    if (urlStr.includes("/nodes/")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ nodes: fileResponse.nodes }),
      } as Response);
    }

    // Image export endpoint
    if (urlStr.includes("/images/")) {
      const nodeIds = extractNodeIdsFromUrl(urlStr);
      return Promise.resolve({
        ok: true,
        json: async () => createImageExportResponse(nodeIds),
      } as Response);
    }

    // Unknown endpoint
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);
  });

  return mockFetch;
}

/**
 * Setup mock for many-cards-different scenario
 *
 * @param mockFetch - Jest mock function to configure
 * @returns The configured mock function
 */
export function setupManyCardsDifferentScenario(
  mockFetch: ReturnType<typeof createMockFetch>
) {
  const fileResponse = createFileResponse("many-cards-different");

  mockFetch.mockImplementation((url: string | URL) => {
    const urlStr = url.toString();

    // File endpoint
    if (urlStr.includes("/files/")) {
      return Promise.resolve({
        ok: true,
        json: async () => fileResponse,
      } as Response);
    }

    // Nodes endpoint
    if (urlStr.includes("/nodes/")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ nodes: fileResponse.nodes }),
      } as Response);
    }

    // Image export endpoint
    if (urlStr.includes("/images/")) {
      const nodeIds = extractNodeIdsFromUrl(urlStr);
      return Promise.resolve({
        ok: true,
        json: async () => createImageExportResponse(nodeIds),
      } as Response);
    }

    // Unknown endpoint
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);
  });

  return mockFetch;
}

/**
 * Setup mock for image download (returns actual image buffer)
 *
 * @param mockFetch - Jest mock function to configure
 * @returns The configured mock function
 */
export function setupImageDownloadMock(
  mockFetch: ReturnType<typeof createMockFetch>,
  options: {
    imageWidth?: number;
    imageHeight?: number;
    imageColor?: { r: number; g: number; b: number };
  } = {}
) {
  const { imageWidth = 100, imageHeight = 100, imageColor = { r: 255, g: 0, b: 0 } } = options;

  mockFetch.mockImplementation(async (url: string | URL) => {
    const urlStr = url.toString();

    // Image URLs
    if (urlStr.includes("/images/")) {
      const buffer = await createMockImageBuffer(imageWidth, imageHeight, imageColor);
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => buffer.buffer,
        blob: async () =>
          new Blob([buffer], { type: "image/png" }),
      } as Response);
    }

    // Other endpoints return error
    return Promise.resolve({
      ok: false,
      status: 404,
    } as Response);
  });

  return mockFetch;
}

/**
 * Setup mock that simulates API errors
 *
 * @param mockFetch - Jest mock function to configure
 * @param errorConfig - Error configuration
 */
export function setupErrorMock(
  mockFetch: ReturnType<typeof createMockFetch>,
  errorConfig: {
    rateLimit?: boolean; // Return 429
    unauthorized?: boolean; // Return 401
    notFound?: boolean; // Return 404
    serverError?: boolean; // Return 500
    networkError?: boolean; // Throw network error
  } = {}
) {
  mockFetch.mockImplementation(async (url: string | URL) => {
    const urlStr = url.toString();

    if (errorConfig.rateLimit && urlStr.includes("/files/")) {
      return Promise.resolve({
        ok: false,
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      } as Response);
    }

    if (errorConfig.unauthorized) {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      } as Response);
    }

    if (errorConfig.notFound) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      } as Response);
    }

    if (errorConfig.serverError) {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      } as Response);
    }

    if (errorConfig.networkError) {
      throw new Error("Network error");
    }

    // Default to success
    return Promise.resolve({
      ok: true,
      json: async () => ({ file: { key: "test" }, nodes: {} }),
    } as Response);
  });

  return mockFetch;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Extract node IDs from Figma API URL
 * Supports: /nodes/:nodeId and /images?ids=node1,node2
 */
function extractNodeIdsFromUrl(url: string): string[] {
  // Try nodes endpoint format
  const nodesMatch = url.match(/\/nodes\/([^/?]+)/);
  if (nodesMatch) {
    return [nodesMatch[1]];
  }

  // Try images endpoint format
  const imagesMatch = url.match(/[?&]ids=([^&]+)/);
  if (imagesMatch) {
    return imagesMatch[1].split(",");
  }

  return [];
}

/**
 * Replace global fetch with mock (for tests)
 *
 * @param mockFetch - Jest mock function
 * @returns Original fetch function (for cleanup)
 */
export function replaceGlobalFetch(
  mockFetch: ReturnType<typeof createMockFetch>
): () => void {
  const originalFetch = global.fetch;
  global.fetch = mockFetch as unknown as typeof fetch;

  // Return cleanup function
  return () => {
    global.fetch = originalFetch;
  };
}

// =====================================================
// Jest Setup Helpers
// =====================================================

/**
 * Setup Figma API mocks for a test suite
 * Call this in beforeEach() and use returned cleanup in afterEach()
 *
 * @param scenario - Test scenario to setup
 * @returns Object with mock and cleanup function
 */
export function setupFigmaMocks(scenario: FigmaFileKey) {
  const mockFetch = createMockFetch();

  switch (scenario) {
    case "one-card":
      setupOneCardScenario(mockFetch);
      break;
    case "many-cards":
      setupManyCardsScenario(mockFetch);
      break;
    case "many-cards-different":
      setupManyCardsDifferentScenario(mockFetch);
      break;
  }

  const cleanup = replaceGlobalFetch(mockFetch);

  return {
    mockFetch,
    cleanup,
  };
}

/**
 * Create a mock Figma client for testing
 * This is useful when you want to mock at the client level rather than fetch
 */
export function createMockFigmaClient() {
  return {
    getFile: jest.fn(),
    getNodes: jest.fn(),
    getImageUrls: jest.fn(),
    downloadImages: jest.fn(),
  };
}

/**
 * Configure mock client with test data
 */
export function configureMockClient(
  mockClient: ReturnType<typeof createMockFigmaClient>,
  fileKey: FigmaFileKey,
  options: MockFetchOptions = {}
) {
  const fileResponse = createFileResponse(fileKey, options);
  const { imageFormat = "png", imageScale = 2 } = options;

  mockClient.getFile.mockResolvedValue(fileResponse);
  mockClient.getNodes.mockResolvedValue({ nodes: fileResponse.nodes });

  // Extract node IDs from response
  const nodeIds = Object.keys(fileResponse.nodes);
  mockClient.getImageUrls.mockResolvedValue(
    nodeIds.map((id) => ({ id, url: `https://example.com/images/${id}.${imageFormat}?scale=${imageScale}` }))
  );

  mockClient.downloadImages.mockResolvedValue(
    nodeIds.map((id) => ({
      id,
      path: `/tmp/test-images/${id}.${imageFormat}`,
      width: 100,
      height: 100,
    }))
  );

  return mockClient;
}

// =====================================================
// Verification Helpers
// =====================================================

/**
 * Verify mock was called with expected URL pattern
 *
 * @param mockFetch - Jest mock function
 * @param pattern - Expected URL pattern (regex or string)
 */
export function verifyMockCalledWith(
  mockFetch: ReturnType<typeof createMockFetch>,
  pattern: RegExp | string
): boolean {
  return mockFetch.mock.calls.some((call) => {
    const url = call[0];
    const urlStr = typeof url === "string" ? url : url.toString();
    return typeof pattern === "string"
      ? urlStr.includes(pattern)
      : pattern.test(urlStr);
  });
}

/**
 * Get all URLs called on mock fetch
 */
export function getCalledUrls(
  mockFetch: ReturnType<typeof createMockFetch>
): string[] {
  return mockFetch.mock.calls.map((call) => {
    const url = call[0];
    return typeof url === "string" ? url : url.toString();
  });
}

/**
 * Reset all mocks (call in afterEach)
 */
export function resetFigmaMocks(
  mockFetch: ReturnType<typeof createMockFetch>
): void {
  mockFetch.mockReset();
  mockFetch.mockClear();
}
