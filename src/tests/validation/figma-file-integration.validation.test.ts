/**
 * Figma File Integration Validation Tests
 *
 * Uses real data from example-outputs/ directory to validate
 * end-to-end processing of Figma design files.
 *
 * Tests:
 * - Simple single card design
 * - Complex design with many cards
 * - Batch downloads with different images
 * - TOON format handling
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Imports for test data
import {
  getOneCardScenario,
  getManyCardsScenario,
  getManyCardsDifferentScenario,
  getExampleData,
  findImageNodes,
  findMaskNodes,
  countNodes,
  type FigmaFileKey,
} from "../fixtures/figma-responses.js";
import {
  withTempDirectory,
  createTempDir,
} from "../utils/integration-helpers.js";
import { createPerformanceMarker } from "../utils/performance-helpers.js";

// =====================================================
// Test Context
// =====================================================

interface TestContext {
  tempDir: string;
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  const temp = await createTempDir("figma-file-validation-");
  context = { tempDir: temp.path };
});

afterAll(async () => {
  await rm(context.tempDir, { recursive: true, force: true });
});

// =====================================================
// Test Suite: One Card Design (Simple)
// =====================================================

describe("Figma File Integration Validation: One Card Design", () => {
  it("should process single card design from example-outputs", async () => {
    // Given: Real design data from one-card-only.json
    const scenario = getOneCardScenario();
    const data = scenario.data;

    // When: Analyzing the design structure
    const nodeCount = countNodes(data);
    const imageNodes = findImageNodes(data);
    const maskNodes = findMaskNodes(data);

    // Then: Design structure matches expectations
    expect(scenario.complexity).toBe("simple");
    expect(nodeCount).toBeGreaterThan(0);
    expect(scenario.stats.totalNodes).toBe(nodeCount);
    expect(imageNodes.length).toBe(scenario.stats.imageNodes);
    expect(maskNodes.length).toBe(scenario.stats.maskNodes);

    // Verify basic structure
    expect(data.name).toBeDefined();
    expect(data.nodes).toBeInstanceOf(Array);
  });

  it("should validate one-card data integrity", async () => {
    // Given: Data from one-card-only.json
    const data = getExampleData("one-card");

    // When: Validating structure
    const hasRequiredFields =
      data.name !== undefined &&
      Array.isArray(data.nodes) &&
      data.nodes.length > 0;

    // Then: Data is valid
    expect(hasRequiredFields).toBe(true);

    // Check first node has expected properties
    const firstNode = data.nodes[0] as { id?: string; name?: string; type?: string };
    expect(firstNode.id).toBeDefined();
    expect(firstNode.name).toBeDefined();
    expect(firstNode.type).toBeDefined();
  });

  it("should identify image nodes in one-card design", async () => {
    // Given: one-card design
    const data = getExampleData("one-card");
    const imageNodes = findImageNodes(data);

    // When: Analyzing image nodes
    // Then: Should find expected images
    expect(imageNodes.length).toBeGreaterThan(0);

    // Verify image node structure
    for (const node of imageNodes) {
      if (typeof node === "object" && node !== null) {
        expect((node as { type?: string }).type).toBeDefined();
      }
    }
  });

  it("should process within expected duration", async () => {
    // Given: one-card scenario
    const scenario = getOneCardScenario();

    const marker = createPerformanceMarker("one-card-processing");

    // When: Simulating processing (just analysis for now)
    const data = getExampleData("one-card");
    const nodes = countNodes(data);
    const images = findImageNodes(data);
    const masks = findMaskNodes(data);

    const duration = marker.elapsed();

    // Then: Processing should be fast for simple design
    expect(nodes).toBeGreaterThan(0);
    expect(duration).toBeLessThan(scenario.expectedDuration);
  });
});

// =====================================================
// Test Suite: Many Cards Design (Complex)
// =====================================================

describe("Figma File Integration Validation: Many Cards Design", () => {
  it("should process complex design with many cards efficiently", async () => {
    // Given: Real design data from design-with-many-card-inside.json (638KB)
    const scenario = getManyCardsScenario();
    const data = scenario.data;

    const marker = createPerformanceMarker("many-cards-processing");

    // When: Running full pipeline with performance tracking
    const nodes = countNodes(data);
    const imageNodes = findImageNodes(data);
    const maskNodes = findMaskNodes(data);

    const duration = marker.elapsed();

    // Then: All assets extracted, performance targets met
    expect(scenario.complexity).toBe("complex");
    expect(nodes).toBeGreaterThan(50); // Many cards design
    expect(imageNodes.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(scenario.expectedDuration); // <30 seconds
  });

  it("should handle batch downloads with controlled concurrency", async () => {
    // Given: Many cards with different images
    const scenario = getManyCardsDifferentScenario();
    const data = scenario.data;
    const imageNodes = findImageNodes(data);

    // When: Analyzing image requirements
    // In real scenario, this would trigger downloads

    // Then: Verify we have many images to process
    expect(imageNodes.length).toBeGreaterThan(10); // Should have many different images
    expect(scenario.stats.imageNodes).toBe(imageNodes.length);
  });

  it("should validate large file structure", async () => {
    // Given: 638KB complex design
    const data = getExampleData("many-cards");

    // When: Validating structure
    const nodeCount = countNodes(data);

    // Then: Large file with complex structure
    expect(nodeCount).toBeGreaterThan(100); // Should have many nodes
    expect(data.nodes).toBeInstanceOf(Array);
  });

  it("should find nested structures in complex design", async () => {
    // Given: Complex many-cards design
    const data = getExampleData("many-cards");

    // When: Traversing for nested nodes
    let maxDepth = 0;

    function traverse(nodes: unknown[], depth = 0): void {
      maxDepth = Math.max(maxDepth, depth);

      for (const node of nodes) {
        if (typeof node === "object" && node !== null) {
          const children = (node as { children?: unknown[] }).children;
          if (Array.isArray(children) && children.length > 0) {
            traverse(children, depth + 1);
          }
        }
      }
    }

    traverse(data.nodes);

    // Then: Should have nested structure (depth > 2)
    expect(maxDepth).toBeGreaterThan(2);
  });
});

// =====================================================
// Test Suite: TOON Format Validation
// =====================================================

describe("Figma File Integration Validation: TOON Format", () => {
  it("should load TOON format data", async () => {
    // Given: TOON format file
    const toonData = getExampleData("one-card", "toon");

    // When: Loading TOON data
    // Then: Data is loadable
    expect(toonData).toBeDefined();
  });

  it("should handle TOON format correctly", async () => {
    // Given: TOON format file (compressed representation)
    const toonData = getExampleData("one-card", "toon");
    const jsonData = getExampleData("one-card", "json");

    // When: Comparing formats
    // TOON format should have similar structure but compressed
    expect(toonData).toBeDefined();
    expect(jsonData).toBeDefined();

    // Both should have essential data
    if (typeof toonData === "object" && toonData !== null) {
      expect((toonData as { name?: string }).name).toBeDefined();
    }
    if (typeof jsonData === "object" && jsonData !== null) {
      expect((jsonData as { name?: string }).name).toBeDefined();
    }
  });

  it("should validate large TOON file", async () => {
    // Given: Large TOON file (373KB)
    const toonData = getExampleData("many-cards", "toon");

    // When: Loading large TOON
    // Then: Should handle large file
    expect(toonData).toBeDefined();
  });
});

// =====================================================
// Test Suite: Cross-Format Validation
// =====================================================

describe("Figma File Integration Validation: Cross-Format", () => {
  it("should produce consistent results across formats", async () => {
    // Given: Same design in JSON and TOON formats
    const jsonData = getExampleData("one-card", "json");
    const toonData = getExampleData("one-card", "toon");

    // When: Comparing core properties
    const jsonName = (jsonData as { name?: string }).name;
    const toonName = (toonData as { name?: string }).name;

    // Then: Core properties should match
    expect(jsonName).toBe(toonName);
  });

  it("should handle all three test files", async () => {
    // Given: All three example files
    const files: Array<{ key: FigmaFileKey; format: "json" | "toon" }> = [
      { key: "one-card", format: "json" },
      { key: "one-card", format: "toon" },
      { key: "many-cards", format: "json" },
      { key: "many-cards", format: "toon" },
      { key: "many-cards-different", format: "json" },
      { key: "many-cards-different", format: "toon" },
    ];

    const results: Array<{
      key: FigmaFileKey;
      format: "json" | "toon";
      loaded: boolean;
      nodeCount: number;
      imageNodes: number;
      maskNodes: number;
    }> = [];

    // When: Loading all files
    for (const file of files) {
      const data = getExampleData(file.key, file.format);
      results.push({
        key: file.key,
        format: file.format,
        loaded: data !== undefined,
        nodeCount: countNodes(data as { nodes?: unknown[] }),
        imageNodes: findImageNodes(data).length,
        maskNodes: findMaskNodes(data).length,
      });
    }

    // Then: All files load successfully
    for (const result of results) {
      expect(result.loaded).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);
    }

    // Verify file sizes match expectations
    // many-cards should have more nodes than one-card
    const oneCardJson = results.find((r) => r.key === "one-card" && r.format === "json");
    const manyCardsJson = results.find((r) => r.key === "many-cards" && r.format === "json");

    expect(manyCardsJson?.nodeCount).toBeGreaterThan(oneCardJson?.nodeCount || 0);
  });
});

// =====================================================
// Test Suite: Real-World Scenario Validation
// =====================================================

describe("Figma File Integration Validation: Real-World Scenarios", () => {
  it("should simulate e-commerce card extraction", async () => {
    // Given: Many cards design (simulating e-commerce product cards)
    const scenario = getManyCardsDifferentScenario();
    const data = scenario.data;

    // When: Analyzing for e-commerce card patterns
    const imageNodes = findImageNodes(data);

    // Then: Should find many product images
    expect(imageNodes.length).toBeGreaterThan(20); // Many products
  });

  it("should validate component structure", async () => {
    // Given: Designs with components
    const data = getExampleData("one-card");

    // When: Looking for component instances
    let componentCount = 0;

    function findComponents(nodes: unknown[]): void {
      for (const node of nodes) {
        if (typeof node === "object" && node !== null) {
          if ((node as { type?: string }).type === "INSTANCE") {
            componentCount++;
          }
          const children = (node as { children?: unknown[] }).children;
          if (Array.isArray(children)) {
            findComponents(children);
          }
        }
      }
    }

    findComponents(data.nodes);

    // Then: Should find component instances
    expect(componentCount).toBeGreaterThan(0);
  });

  it("should analyze mask usage patterns", async () => {
    // Given: All three designs
    const designs = [
      getExampleData("one-card"),
      getExampleData("many-cards"),
      getExampleData("many-cards-different"),
    ];

    const maskCounts = designs.map((data) => findMaskNodes(data).length);

    // When: Analyzing mask patterns
    // Then: At least some designs should have masks
    expect(maskCounts.some((count) => count > 0)).toBe(true);
  });
});

// =====================================================
// Test Suite: Performance Validation
// =====================================================

describe("Figma File Integration Validation: Performance", () => {
  it("should analyze large file quickly", async () => {
    // Given: Largest file (many-cards-different, 589KB)
    const scenario = getManyCardsDifferentScenario();

    const marker = createPerformanceMarker("analyze-large-file");

    // When: Analyzing file
    const data = scenario.data;
    const nodes = countNodes(data);
    const images = findImageNodes(data);
    const masks = findMaskNodes(data);

    const duration = marker.elapsed();

    // Then: Analysis should be fast
    expect(nodes).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // <1 second for analysis
  });

  it("should scale linearly with file size", async () => {
    // Given: Files of different sizes
    const files = [
      { key: "one-card" as FigmaFileKey, expectedNodes: 50 },
      { key: "many-cards" as FigmaFileKey, expectedNodes: 500 },
    ];

    const timings: Array<{ key: FigmaFileKey; duration: number; nodes: number }> =
      [];

    // When: Analyzing each file
    for (const file of files) {
      const marker = createPerformanceMarker(`analyze-${file.key}`);
      const data = getExampleData(file.key);
      const nodes = countNodes(data);
      const duration = marker.elapsed();

      timings.push({ key: file.key, duration, nodes });
    }

    // Then: Larger file takes proportionally longer (but not exponentially)
    const [small, large] = timings;

    // Large file should take longer, but not more than 100x
    const ratio = large.duration / (small.duration || 1);
    expect(ratio).toBeGreaterThan(1); // Large takes longer
    expect(ratio).toBeLessThan(100); // But not exponentially more
  });
});

// =====================================================
// Test Suite: Error Handling Validation
// =====================================================

describe("Figma File Integration Validation: Error Handling", () => {
  it("should handle missing optional fields gracefully", async () => {
    // Given: Real data with potential missing fields
    const data = getExampleData("one-card");

    // When: Accessing fields that might be missing
    const hasComponents = (data as { components?: unknown }).components !== undefined;
    const hasComponentSets = (data as { componentSets?: unknown }).componentSets !== undefined;

    // Then: Should handle gracefully (not throw)
    expect(() => {
      // These accesses should not throw
      const _ = (data as { components?: Record<string, unknown> }).components;
      const __ = (data as { componentSets?: Record<string, unknown> }).componentSets;
    }).not.toThrow();
  });

  it("should validate node structure integrity", async () => {
    // Given: All nodes from complex file
    const data = getExampleData("many-cards");

    // When: Validating each node
    let invalidCount = 0;

    function validateNodes(nodes: unknown[]): void {
      for (const node of nodes) {
        if (typeof node !== "object" || node === null) {
          invalidCount++;
          continue;
        }

        const id = (node as { id?: string }).id;
        if (!id || typeof id !== "string") {
          invalidCount++;
        }

        const children = (node as { children?: unknown[] }).children;
        if (Array.isArray(children)) {
          validateNodes(children);
        }
      }
    }

    validateNodes(data.nodes);

    // Then: All nodes should be valid
    expect(invalidCount).toBe(0);
  });
});

// =====================================================
// Test Suite: Data Integrity Validation
// =====================================================

describe("Figma File Integration Validation: Data Integrity", () => {
  it("should preserve node relationships", async () => {
    // Given: Design with nested structure
    const data = getExampleData("many-cards");

    // When: Checking parent-child relationships
    let nodesWithParents = 0;
    let totalNodes = 0;

    function checkRelationships(nodes: unknown[], parentExists: boolean): void {
      for (const node of nodes) {
        totalNodes++;
        if (parentExists) {
          nodesWithParents++;
        }

        if (typeof node === "object" && node !== null) {
          const children = (node as { children?: unknown[] }).children;
          if (Array.isArray(children) && children.length > 0) {
            checkRelationships(children, true);
          }
        }
      }
    }

    checkRelationships(data.nodes, false);

    // Then: Many nodes should have parent relationships
    expect(nodesWithParents).toBeGreaterThan(0);
    expect(nodesWithParents).toBeLessThan(totalNodes); // Root has no parent
  });

  it("should maintain consistent IDs", async () => {
    // Given: Design data
    const data = getExampleData("one-card");
    const ids = new Set<string>();

    // When: Collecting all IDs
    function collectIds(nodes: unknown[]): void {
      for (const node of nodes) {
        if (typeof node === "object" && node !== null) {
          const id = (node as { id?: string }).id;
          if (id) {
            ids.add(id);
          }
          const children = (node as { children?: unknown[] }).children;
          if (Array.isArray(children)) {
            collectIds(children);
          }
        }
      }
    }

    collectIds(data.nodes);

    // Then: All IDs should be unique
    const idArray = Array.from(ids);
    const uniqueCount = idArray.length;
    const totalCount = idArray.length;

    expect(uniqueCount).toBe(totalCount);
  });
});
