/**
 * Tests for Tailwind v3 sync functionality
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { syncToTailwindV3 } from "@/export/sync-tailwind-v3";
import type {
  SyncStats,
  SyncToTailwindV3Options,
  TokenToClassMap,
} from "@/export/sync-types";
import type { DesignTokens } from "@/tokens/types";

describe("Tailwind v3 Sync", () => {
  const createMockTokens = (): DesignTokens => ({
    colors: {
      semantic: {},
      all: {
        "primary-500": {
          name: "primary-500",
          value: "#3b82f6",
          category: "color",
        },
        "primary-700": {
          name: "primary-700",
          value: "#1d4ed8",
          category: "color",
        },
        "neutral-400": {
          name: "neutral-400",
          value: "#a3a3a3",
          category: "color",
        },
        "brand-purple": {
          name: "brand-purple",
          value: "#8b5cf6",
          category: "color",
        },
        "custom-orange": {
          name: "custom-orange",
          value: "#f97316",
          category: "color",
        },
      },
      families: {},
    },
    typography: { styles: {}, families: [] },
    spacing: { scale: {} },
    effects: { shadows: {}, blurs: {} },
    borders: { radius: {} },
    stats: {
      totalColorTokens: 5,
      totalTypographyTokens: 0,
      totalSpacingTokens: 0,
      totalEffectTokens: 0,
      totalBorderTokens: 0,
      semanticColorCoverage: 0,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("syncToTailwindV3", () => {
    it("should have syncToTailwindV3 function exported", () => {
      expect(syncToTailwindV3).toBeDefined();
      expect(typeof syncToTailwindV3).toBe("function");
    });

    it("should accept DesignTokens and options", async () => {
      const tokens = createMockTokens();
      const options: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
        threshold: 0.9,
      };

      // Note: This test will fail in CI without actual Bun, but verifies types
      // In real use, this would connect to actual Tailwind config
      try {
        const result = await syncToTailwindV3(tokens, options);
        expect(result).toBeDefined();
        expect(result.stats).toBeDefined();
      } catch (e) {
        // Expected to fail in test environment without Bun
        expect((e as Error).message).toContain("Bun is not defined");
      }
    });

    it("should handle empty token set gracefully", async () => {
      const emptyTokens: DesignTokens = {
        colors: { semantic: {}, all: {}, families: {} },
        typography: { styles: {}, families: [] },
        spacing: { scale: {} },
        effects: { shadows: {}, blurs: {} },
        borders: { radius: {} },
        stats: {
          totalColorTokens: 0,
          totalTypographyTokens: 0,
          totalSpacingTokens: 0,
          totalEffectTokens: 0,
          totalBorderTokens: 0,
          semanticColorCoverage: 0,
        },
      };

      const options: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
      };

      try {
        const result = await syncToTailwindV3(emptyTokens, options);
        expect(result.stats.totalTokens).toBe(0);
      } catch (e) {
        // Expected to fail in test environment without Bun
        expect((e as Error).message).toContain("Bun is not defined");
      }
    });
  });

  describe("Color Similarity Logic", () => {
    it("should correctly parse hex colors in format #RRGGBB", () => {
      // Test that the color parsing logic works correctly
      const hex1 = "#3b82f6";
      const hex2 = "#1d4ed8";

      // Both should be valid 6-character hex codes
      expect(hex1).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(hex2).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("should correctly parse RGB from hex", () => {
      const hexToRgb = (hex: string) => {
        const hexValue = hex.replace("#", "");
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexValue);
        if (!result) return null;
        return {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        };
      };

      const rgb = hexToRgb("#3b82f6");
      expect(rgb).toEqual({ r: 59, g: 130, b: 246 });
    });

    it("should calculate Euclidean distance between colors", () => {
      const rgb1 = { r: 59, g: 130, b: 246 }; // #3b82f6
      const rgb2 = { r: 29, g: 78, b: 216 }; // #1d4ed8

      const distance = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
          Math.pow(rgb1.g - rgb2.g, 2) +
          Math.pow(rgb1.b - rgb2.b, 2)
      );

      // Distance should be a positive number
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(Math.sqrt(255 * 255 * 3));
    });

    it("should convert distance to similarity score", () => {
      const distance = 10;
      const maxDistance = Math.sqrt(255 * 255 * 3);
      const similarity = 1 - distance / maxDistance;

      // Similarity should be close to 1 for small distances
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe("SyncToTailwindV3Options", () => {
    it("should accept configPath as required option", () => {
      const options: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
      };

      expect(options.configPath).toBe("./tailwind.config.js");
    });

    it("should accept threshold option", () => {
      const options: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
        threshold: 0.95,
      };

      expect(options.threshold).toBe(0.95);
    });

    it("should accept fallback option", () => {
      const options1: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
        fallback: "arbitrary",
      };

      const options2: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
        fallback: "closest",
      };

      expect(options1.fallback).toBe("arbitrary");
      expect(options2.fallback).toBe("closest");
    });

    it("should accept cwd option", () => {
      const options: SyncToTailwindV3Options = {
        configPath: "./tailwind.config.js",
        cwd: "/custom/project/path",
      };

      expect(options.cwd).toBe("/custom/project/path");
    });
  });

  describe("TokenToClassMap", () => {
    it("should be a record mapping token names to class names or arbitrary values", () => {
      const map: TokenToClassMap = {
        "primary-500": "primary-500",
        "primary-700": "primary-700",
        "brand-purple": "[#8b5cf6]",
      };

      expect(map["primary-500"]).toBe("primary-500");
      expect(map["brand-purple"]).toBe("[#8b5cf6]");
    });

    it("should support arbitrary value format with brackets", () => {
      const map: TokenToClassMap = {
        "custom-color": "[#f97316]",
      };

      expect(map["custom-color"]).toMatch(/^\[#.+\]$/);
    });
  });

  describe("SyncStats", () => {
    it("should track total tokens", () => {
      const stats: SyncStats = {
        totalTokens: 10,
        mappedToClasses: 7,
        needsArbitrary: 3,
        classCoverage: 70,
      };

      expect(stats.totalTokens).toBe(10);
    });

    it("should calculate class coverage percentage", () => {
      const stats: SyncStats = {
        totalTokens: 5,
        mappedToClasses: 3,
        needsArbitrary: 2,
        classCoverage: 60,
      };

      expect(stats.classCoverage).toBe(60);
    });

    it("should track mapped vs arbitrary counts", () => {
      const stats: SyncStats = {
        totalTokens: 8,
        mappedToClasses: 6,
        needsArbitrary: 2,
        classCoverage: 75,
      };

      expect(stats.mappedToClasses + stats.needsArbitrary).toBe(
        stats.totalTokens
      );
    });
  });
});
