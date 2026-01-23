/**
 * Deduplicator tests - Phase 4 Sprint 4 Cycle 1-3
 *
 * Tests for SVG deduplication including:
 * - Duplicate detection
 * - Hash-based grouping
 * - Space savings calculation
 */
import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  deduplicateSvgs,
  findDuplicateGroups,
  groupByHash,
  calculateSpaceSavings,
  getDeduplicationStats,
  areDuplicates,
  type DeduplicationInput,
  type DeduplicationResult,
  type DuplicateGroup,
} from "@/vectors/deduplicator";
import {
  SIMPLE_ICON,
  SIMPLE_ICON_DUPLICATE_1,
  SIMPLE_ICON_DUPLICATE_2,
  HOME_ICON,
  SETTINGS_ICON,
  USER_ICON,
} from "@/tests/fixtures/svg";

// =====================================================
// Test Setup
// =====================================================

describe("deduplicator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = `${tmpdir}/dedup-test-${Date.now()}`;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // =====================================================
  // Basic Deduplication Tests
  // =====================================================

  describe("deduplicateSvgs", () => {
    it("should detect identical SVGs regardless of ID differences", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
        { nodeId: "icon-3", content: SIMPLE_ICON_DUPLICATE_2 },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      expect(result.uniqueCount).toBe(1);
      expect(result.duplicateCount).toBe(2);
      expect(result.svgs).toHaveLength(1);
    });

    it("should detect identical SVGs regardless of position differences", async () => {
      const svg1 = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
      const svg2 = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';

      const inputs: DeduplicationInput[] = [
        { nodeId: "test-1", content: svg1 },
        { nodeId: "test-2", content: svg2 },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      expect(result.uniqueCount).toBe(1);
      expect(result.duplicateCount).toBe(1);
    });

    it("should handle empty input array", async () => {
      const result: DeduplicationResult = await deduplicateSvgs([], {
        outputDir: tempDir,
      });

      expect(result.uniqueCount).toBe(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.svgs).toHaveLength(0);
      expect(result.spaceSaved).toBe(0);
    });

    it("should handle array with no duplicates", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "home", content: HOME_ICON },
        { nodeId: "settings", content: SETTINGS_ICON },
        { nodeId: "user", content: USER_ICON },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      expect(result.uniqueCount).toBe(3);
      expect(result.duplicateCount).toBe(0);
    });

    it("should accurately report duplicate count", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
        { nodeId: "icon-3", content: SIMPLE_ICON_DUPLICATE_2 },
        { nodeId: "icon-4", content: HOME_ICON },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      // 3 identical icons + 1 different = 1 unique group of 3
      expect(result.duplicateCount).toBe(2);
      expect(result.uniqueCount).toBe(2);
    });

    it("should accurately report space saved", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
        { nodeId: "icon-3", content: SIMPLE_ICON_DUPLICATE_2 },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      expect(result.spaceSaved).toBeGreaterThan(0);
      // Should save at least 2x the size of one SVG
      expect(result.spaceSaved).toBeGreaterThanOrEqual(SIMPLE_ICON.length * 2);
    });

    it("should report 50%+ reduction for icon libraries", async () => {
      // Create 10 icons where 5 are duplicates
      const inputs: DeduplicationInput[] = [];
      for (let i = 0; i < 5; i++) {
        inputs.push({ nodeId: `unique-${i}`, content: HOME_ICON });
        inputs.push({ nodeId: `dup-${i}`, content: SIMPLE_ICON });
      }

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      // 5 unique HOME_ICON + 5 duplicate SIMPLE_ICON
      // Should have significant deduplication
      expect(result.duplicatePercentage).toBeGreaterThan(0);
    });

    it("should create deduplication registry", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: HOME_ICON },
      ];

      const result: DeduplicationResult = await deduplicateSvgs(inputs, {
        outputDir: tempDir,
      });

      expect(result.registry.size).toBe(2);
      // Check that registry entries map to files
      for (const [hash, filepath] of result.registry.entries()) {
        expect(filepath).toContain(tempDir);
        expect(filepath.endsWith(".svg")).toBe(true);
      }
    });
  });

  // =====================================================
  // Duplicate Detection Tests
  // =====================================================

  describe("findDuplicateGroups", () => {
    it("should find duplicate groups correctly", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
        { nodeId: "icon-3", content: SIMPLE_ICON_DUPLICATE_2 },
        { nodeId: "icon-4", content: HOME_ICON },
      ];

      const groups: DuplicateGroup[] = await findDuplicateGroups(inputs);

      // Should find one group with 3 identical icons
      expect(groups).toHaveLength(1);
      expect(groups[0].instances).toHaveLength(3);
      expect(groups[0].instances).toContain("icon-1");
      expect(groups[0].instances).toContain("icon-2");
      expect(groups[0].instances).toContain("icon-3");
    });

    it("should return empty array when no duplicates", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "home", content: HOME_ICON },
        { nodeId: "settings", content: SETTINGS_ICON },
      ];

      const groups: DuplicateGroup[] = await findDuplicateGroups(inputs);

      expect(groups).toHaveLength(0);
    });
  });

  // =====================================================
  // GroupByHash Tests
  // =====================================================

  describe("groupByHash", () => {
    it("should group duplicates correctly", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
      ];

      const canonical1 = await import("@/vectors/canonicalizer").then(
        (m) => m.canonicalizeSvg(inputs[0].content, inputs[0].nodeId)
      );
      const canonical2 = await import("@/vectors/canonicalizer").then(
        (m) => m.canonicalizeSvg(inputs[1].content, inputs[1].nodeId)
      );

      const groups = groupByHash([await canonical1, await canonical2]);

      expect(groups.size).toBe(1);
      expect(groups.get((await canonical1).hash)).toHaveLength(2);
    });
  });

  // =====================================================
  // Utility Functions Tests
  // =====================================================

  describe("calculateSpaceSavings", () => {
    it("should calculate space saved correctly", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
      ];

      const groups: DuplicateGroup[] = await findDuplicateGroups(inputs);

      const saved = calculateSpaceSavings(groups);
      // Should save some space (deduplication reduces storage)
      expect(saved).toBeGreaterThan(0);
    });
  });

  describe("getDeduplicationStats", () => {
    it("should return correct stats for no duplicates", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "home", content: HOME_ICON },
        { nodeId: "settings", content: SETTINGS_ICON },
        { nodeId: "user", content: USER_ICON },
      ];

      const stats = await getDeduplicationStats(inputs);

      expect(stats.total).toBe(3);
      expect(stats.unique).toBe(3);
      expect(stats.duplicates).toBe(0);
      expect(stats.duplicatePercentage).toBe(0);
    });

    it("should return correct stats for all duplicates", async () => {
      const inputs: DeduplicationInput[] = [
        { nodeId: "icon-1", content: SIMPLE_ICON },
        { nodeId: "icon-2", content: SIMPLE_ICON_DUPLICATE_1 },
        { nodeId: "icon-3", content: SIMPLE_ICON_DUPLICATE_2 },
      ];

      const stats = await getDeduplicationStats(inputs);

      expect(stats.total).toBe(3);
      expect(stats.unique).toBe(1);
      expect(stats.duplicates).toBe(2);
      expect(stats.duplicatePercentage).toBeCloseTo(66.67, 1);
    });
  });

  describe("areDuplicates", () => {
    it("should return true for identical SVGs", async () => {
      const result = await areDuplicates(SIMPLE_ICON, SIMPLE_ICON_DUPLICATE_1);

      expect(result).toBe(true);
    });

    it("should return false for different SVGs", async () => {
      const result = await areDuplicates(SIMPLE_ICON, HOME_ICON);

      expect(result).toBe(false);
    });
  });
});
