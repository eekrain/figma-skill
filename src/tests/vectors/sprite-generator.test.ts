/**
 * Sprite Generator tests - Phase 4 Sprint 5 Cycle 1-3
 *
 * Tests for SVG sprite generation including:
 * - Sprite generation
 * - Symbol content extraction
 * - Documentation generation
 */
import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  generateSprite,
  extractSymbolContent,
  generateSymbolId,
  generateSpriteUsageDocumentation,
  generateHtmlExample,
  getSymbolIds,
  isValidSpriteFile,
  type SpriteSymbol,
  type SpriteGenerationResult,
} from "@/vectors/sprite-generator";
import type { CanonicalizedSVG } from "@/vectors/canonicalizer";
import {
  HOME_ICON,
  SETTINGS_ICON,
  USER_ICON,
  SEARCH_ICON,
  MENU_ICON,
  SIMPLE_ICON,
  SIMPLE_ICON_DUPLICATE_1,
  SVG_NO_VIEWBOX,
} from "@/tests/fixtures/svg";

// =====================================================
// Test Setup
// =====================================================

describe("sprite-generator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = `${tmpdir}/sprite-test-${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Helper function to create mock canonicalized SVGs
  function createMockCanonical(
    svg: string,
    originalId: string
  ): CanonicalizedSVG {
    return {
      svg,
      hash: "mock-hash-" + originalId,
      originalId,
      sizeReduction: 0,
    };
  }

  // =====================================================
  // Sprite Generation Tests
  // =====================================================

  describe("generateSprite", () => {
    it("should generate valid SVG sprite file", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
      ];

      const outputPath = `${tempDir}/sprite.svg`;
      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath,
      });

      expect(result.outputPath).toBe(outputPath);
      expect(result.symbolCount).toBe(2);
      expect(result.symbols).toHaveLength(2);
      expect(result.fileSize).toBeGreaterThan(0);

      // Verify file was created
      const content = await fs.readFile(outputPath, "utf8");
      expect(content).toContain("<svg");
      expect(content).toContain("<symbol");
    });

    it("should create correct number of symbols", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
        createMockCanonical(USER_ICON, "user"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      expect(result.symbolCount).toBe(3);
      expect(result.symbols).toHaveLength(3);
    });

    it("should preserve viewBox for each symbol", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      // All symbols should have viewBox
      for (const symbol of result.symbols) {
        expect(symbol.viewBox).toBeTruthy();
        expect(symbol.viewBox.length).toBeGreaterThan(0);
      }
    });

    it("should use correct symbol ID format with prefix", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
        idPrefix: "icon",
      });

      expect(result.symbols[0].id).toMatch(/^icon-/);
    });

    it("should include aria-label when enabled", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
        includeAriaLabels: true,
      });

      const content = await fs.readFile(result.outputPath, "utf8");
      expect(content).toContain('aria-label="home"');
    });

    it("should generate usage documentation", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      expect(result.documentation).toContain("# SVG Sprite Documentation");
      expect(result.documentation).toContain("## Symbols");
      expect(result.documentation).toContain("home");
      expect(result.documentation).toContain("settings");
    });

    it("should handle empty SVG array", async () => {
      const result: SpriteGenerationResult = await generateSprite([], {
        outputPath: `${tempDir}/sprite.svg`,
      });

      expect(result.symbolCount).toBe(0);
      expect(result.symbols).toHaveLength(0);
    });

    it("should handle SVGs without viewBox", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(SVG_NO_VIEWBOX, "no-viewbox"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      // Should use viewBox derived from width/height (100x100)
      expect(result.symbols[0].viewBox).toBe("0 0 100 100");
    });

    it("should write file to correct path", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
      ];

      const outputPath = `${tempDir}/test/output/sprite.svg`;
      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath,
      });

      expect(result.outputPath).toBe(outputPath);
      await fs.access(outputPath);
    });

    it("should include all symbols in documentation", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      expect(result.documentation).toContain("home");
      expect(result.documentation).toContain("settings");
    });
  });

  // =====================================================
  // Symbol Content Tests
  // =====================================================

  describe("extractSymbolContent", () => {
    it("should extract viewBox and content from simple SVG", () => {
      const result = extractSymbolContent(SIMPLE_ICON);

      expect(result.viewBox).toBe("0 0 24 24");
      expect(result.content).toContain("<circle");
    });

    it("should extract content from complex SVG", () => {
      const result = extractSymbolContent(HOME_ICON);

      expect(result.viewBox).toBe("0 0 24 24");
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle SVG without viewBox", () => {
      const result = extractSymbolContent(SVG_NO_VIEWBOX);

      // Should return default viewBox
      expect(result.viewBox).toBe("0 0 100 100");
    });

    it("should throw error for invalid SVG", () => {
      expect(() => extractSymbolContent("not an svg")).toThrow();
    });
  });

  // =====================================================
  // Symbol ID Generation Tests
  // =====================================================

  describe("generateSymbolId", () => {
    it("should generate ID from original ID", () => {
      const svg: CanonicalizedSVG = createMockCanonical(
        SIMPLE_ICON,
        "my-icon"
      );

      const usedIds = new Set<string>();
      const id = generateSymbolId(svg, "icon", usedIds);

      expect(id).toMatch(/icon/);
      expect(id).toMatch(/my-icon/);
    });

    it("should generate unique IDs for duplicates", () => {
      const svg1: CanonicalizedSVG = createMockCanonical(
        SIMPLE_ICON,
        "duplicate"
      );
      const svg2: CanonicalizedSVG = createMockCanonical(
        SIMPLE_ICON_DUPLICATE_1,
        "duplicate"
      );

      const usedIds = new Set<string>();
      const id1 = generateSymbolId(svg1, "icon", usedIds);
      const id2 = generateSymbolId(svg2, "icon", usedIds);

      expect(id1).not.toBe(id2);
      expect(usedIds.has(id1)).toBe(true);
      expect(usedIds.has(id2)).toBe(true);
    });

    it("should sanitize non-alphanumeric characters", () => {
      const svg: CanonicalizedSVG = createMockCanonical(
        SIMPLE_ICON,
        "my@icon#123"
      );

      const usedIds = new Set<string>();
      const id = generateSymbolId(svg, "icon", usedIds);

      expect(id).not.toContain("@");
      expect(id).not.toContain("#");
    });
  });

  // =====================================================
  // Documentation Tests
  // =====================================================

  describe("generateSpriteUsageDocumentation", () => {
    it("should generate usage documentation", () => {
      const sprite = {
        symbols: [
          {
            id: "icon-home",
            viewBox: "0 0 24 24",
            content: "<path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/>",
            originalId: "home",
          },
        ],
        filePath: "/path/to/sprite.svg",
        spriteSvg: "<svg>...</svg>",
      };

      const doc = generateSpriteUsageDocumentation(sprite);

      expect(doc).toContain("# SVG Sprite Documentation");
      expect(doc).toContain("## Symbols");
      expect(doc).toContain("icon-home");
    });

    it("should include HTML examples", () => {
      const sprite = {
        symbols: [
          {
            id: "icon-home",
            viewBox: "0 0 24 24",
            content: "<path d=\"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z\"/>",
            originalId: "home",
          },
        ],
        filePath: "/path/to/sprite.svg",
        spriteSvg: "<svg>...</svg>",
      };

      const doc = generateSpriteUsageDocumentation(sprite);

      expect(doc).toContain("<svg><use xlink:href=");
    });
  });

  // =====================================================
  // HTML Example Tests
  // =====================================================

  describe("generateHtmlExample", () => {
    it("should generate valid HTML example", () => {
      const html = generateHtmlExample("/path/to/sprite.svg", "icon-home");

      expect(html).toContain("<svg>");
      expect(html).toContain('xlink:href="/path/to/sprite.svg#icon-home"');
      expect(html).toContain("</svg>");
    });
  });

  // =====================================================
  // Utility Functions Tests
  // =====================================================

  describe("getSymbolIds", () => {
    it("should extract symbol IDs from sprite file", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
        createMockCanonical(SETTINGS_ICON, "settings"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      const ids = await getSymbolIds(result.outputPath);

      expect(ids).toHaveLength(2);
      expect(ids[0]).toMatch(/icon-/);
      expect(ids[1]).toMatch(/icon-/);
    });
  });

  describe("isValidSpriteFile", () => {
    it("should validate correct sprite file", async () => {
      const svgs: CanonicalizedSVG[] = [
        createMockCanonical(HOME_ICON, "home"),
      ];

      const result: SpriteGenerationResult = await generateSprite(svgs, {
        outputPath: `${tempDir}/sprite.svg`,
      });

      const isValid = await isValidSpriteFile(result.outputPath);

      expect(isValid).toBe(true);
    });

    it("should reject non-sprite file", async () => {
      const invalidPath = `${tempDir}/invalid.svg`;
      await fs.writeFile(invalidPath, "<svg><circle/></svg>", "utf8");

      const isValid = await isValidSpriteFile(invalidPath);

      expect(isValid).toBe(false);
    });
  });
});
