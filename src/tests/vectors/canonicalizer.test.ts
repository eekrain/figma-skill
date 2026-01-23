/**
 * Canonicalizer tests - Phase 4 Sprint 2 Cycle 1-3
 *
 * Tests for SVG canonicalization including:
 * - Basic parsing
 * - Attribute normalization
 * - Hash generation
 * - Non-rendering attribute removal
 * - Attribute sorting
 * - Whitespace normalization
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import {
  canonicalizeSvg,
  parseSvg,
  normalizeAttributes,
  removeNonRenderingAttributes,
  sortAttributes,
  computeHash,
  serializeCanonical,
  isNonRenderingAttribute,
  isPreservedAttribute,
  type ParsedSVG,
} from "@/vectors/canonicalizer";
import {
  SIMPLE_ICON,
  SIMPLE_ICON_DUPLICATE_1,
  SIMPLE_ICON_DUPLICATE_2,
  SVG_WITH_METADATA,
  SVG_NO_VIEWBOX,
  SVG_NESTED_GROUPS,
  COMPLEX_SVG,
} from "@/tests/fixtures/svg";

// =====================================================
// Test Setup
// =====================================================

describe("canonicalizer", () => {
  // =====================================================
  // Basic Parsing Tests
  // =====================================================

  describe("parseSvg", () => {
    it("should parse simple SVG correctly", () => {
      const result: ParsedSVG = parseSvg(SIMPLE_ICON);

      expect(result.attributes.get("viewBox")).toBe("0 0 24 24");
      expect(result.attributes.get("width")).toBe("24");
      expect(result.attributes.get("height")).toBe("24");
      expect(result.content).toContain("<circle");
      expect(result.originalSize).toBeGreaterThan(0);
    });

    it("should parse SVG with nested groups", () => {
      const result: ParsedSVG = parseSvg(SVG_NESTED_GROUPS);

      expect(result.attributes.get("viewBox")).toBe("0 0 100 100");
      expect(result.content).toContain("<g");
      expect(result.content).toContain("<circle");
    });

    it("should parse SVG without viewBox", () => {
      const result: ParsedSVG = parseSvg(SVG_NO_VIEWBOX);

      expect(result.attributes.get("viewBox")).toBeUndefined();
      expect(result.attributes.get("width")).toBe("100");
      expect(result.attributes.get("height")).toBe("100");
      expect(result.content).toContain("<rect");
    });

    it("should parse complex SVG with defs", () => {
      const result: ParsedSVG = parseSvg(COMPLEX_SVG);

      expect(result.content).toContain("<defs>");
      expect(result.content).toContain("<linearGradient");
      expect(result.content).toContain("<rect");
      expect(result.content).toContain("<circle");
    });

    it("should throw error for invalid SVG without opening tag", () => {
      expect(() => parseSvg("not an svg")).toThrow(
        "Invalid SVG: Could not find opening <svg> tag"
      );
    });

    it("should throw error for invalid SVG without closing tag", () => {
      expect(() => parseSvg("<svg>content")).toThrow(
        "Invalid SVG: Could not find closing </svg> tag"
      );
    });
  });

  // =====================================================
  // Attribute Normalization Tests
  // =====================================================

  describe("removeNonRenderingAttributes", () => {
    it("should remove data-figma-id attribute", () => {
      const attrs = new Map([
        ["viewBox", "0 0 24 24"],
        ["data-figma-id", "icon-1"],
        ["width", "24"],
      ]);

      const result = removeNonRenderingAttributes(attrs);

      expect(result.has("data-figma-id")).toBe(false);
      expect(result.get("viewBox")).toBe("0 0 24 24");
      expect(result.get("width")).toBe("24");
    });

    it("should remove data-editor-metadata attribute", () => {
      const attrs = new Map([
        ["viewBox", "0 0 24 24"],
        ["data-editor-metadata", "some-data"],
      ]);

      const result = removeNonRenderingAttributes(attrs);

      expect(result.has("data-editor-metadata")).toBe(false);
    });

    it("should remove id attribute", () => {
      const attrs = new Map([
        ["viewBox", "0 0 24 24"],
        ["id", "my-icon"],
        ["width", "24"],
      ]);

      const result = removeNonRenderingAttributes(attrs);

      expect(result.has("id")).toBe(false);
    });

    it("should preserve viewBox attribute", () => {
      const attrs = new Map([
        ["viewBox", "0 0 24 24"],
        ["data-figma-id", "icon-1"],
      ]);

      const result = removeNonRenderingAttributes(attrs);

      expect(result.get("viewBox")).toBe("0 0 24 24");
    });

    it("should preserve fill and stroke attributes", () => {
      const attrs = new Map([
        ["fill", "red"],
        ["stroke", "black"],
        ["stroke-width", "2"],
        ["id", "test"],
      ]);

      const result = removeNonRenderingAttributes(attrs);

      expect(result.get("fill")).toBe("red");
      expect(result.get("stroke")).toBe("black");
      expect(result.get("stroke-width")).toBe("2");
      expect(result.has("id")).toBe(false);
    });

    it("should handle empty attributes map", () => {
      const result = removeNonRenderingAttributes(new Map());

      expect(result.size).toBe(0);
    });
  });

  describe("sortAttributes", () => {
    it("should sort attributes alphabetically", () => {
      const attrs = new Map([
        ["z", "last"],
        ["a", "first"],
        ["m", "middle"],
      ]);

      const result = sortAttributes(attrs);

      const keys = Array.from(result.keys());
      expect(keys).toEqual(["a", "m", "z"]);
    });

    it("should preserve attribute values", () => {
      const attrs = new Map([
        ["height", "100"],
        ["width", "200"],
        ["viewBox", "0 0 100 100"],
      ]);

      const result = sortAttributes(attrs);

      expect(result.get("height")).toBe("100");
      expect(result.get("width")).toBe("200");
      expect(result.get("viewBox")).toBe("0 0 100 100");
    });

    it("should handle empty attributes map", () => {
      const result = sortAttributes(new Map());

      expect(result.size).toBe(0);
    });

    it("should be case-sensitive for sorting", () => {
      const attrs = new Map([
        ["Z", "uppercase"],
        ["a", "lowercase"],
      ]);

      const result = sortAttributes(attrs);

      const keys = Array.from(result.keys());
      // Uppercase comes before lowercase in ASCII
      expect(keys[0]).toBe("Z");
      expect(keys[1]).toBe("a");
    });
  });

  describe("normalizeAttributes", () => {
    it("should remove non-rendering and sort attributes", () => {
      const attrs = new Map([
        ["z", "last"],
        ["data-figma-id", "remove-me"],
        ["a", "first"],
        ["id", "also-remove"],
      ]);

      const result = normalizeAttributes(attrs);

      expect(result.has("data-figma-id")).toBe(false);
      expect(result.has("id")).toBe(false);
      expect(result.has("z")).toBe(true);
      expect(result.has("a")).toBe(true);

      const keys = Array.from(result.keys());
      expect(keys).toEqual(["a", "z"]);
    });
  });

  // =====================================================
  // Hash Generation Tests
  // =====================================================

  describe("computeHash", () => {
    it("should generate consistent hash for same input", () => {
      const input = "<svg viewBox='0 0 24 24'><circle/></svg>";

      const hash1 = computeHash(input);
      const hash2 = computeHash(input);

      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", () => {
      const input1 = "<svg viewBox='0 0 24 24'><circle/></svg>";
      const input2 = "<svg viewBox='0 0 24 24'><rect/></svg>";

      const hash1 = computeHash(input1);
      const hash2 = computeHash(input2);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate SHA-256 hash (64 hex characters)", () => {
      const hash = computeHash("test");

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce same hash for identical SVGs with different IDs", () => {
      const canonical1 = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;
      const canonical2 = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;

      const hash1 = computeHash(canonical1);
      const hash2 = computeHash(canonical2);

      expect(hash1).toBe(hash2);
    });
  });

  // =====================================================
  // Canonicalization Integration Tests
  // =====================================================

  describe("canonicalizeSvg", () => {
    it("should canonicalize simple SVG correctly", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("viewBox");
      expect(result.svg).not.toContain("data-figma-id");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.originalId).toBe("icon-1");
      expect(result.sizeReduction).toBeGreaterThan(0);
    });

    it("should remove data-figma-id attributes", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      expect(result.svg).not.toContain("data-figma-id");
    });

    it("should remove editor metadata attributes", async () => {
      const result = await canonicalizeSvg(SVG_WITH_METADATA, "meta-1");

      expect(result.svg).not.toContain("data-editor-metadata");
    });

    it("should sort attributes alphabetically", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      // Attributes should be sorted - find viewBox position relative to other attrs
      const viewBoxMatch = result.svg.match(/viewBox="[^"]*"/);
      expect(viewBoxMatch).not.toBeNull();
    });

    it("should normalize whitespace", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      // Should not have multiple consecutive spaces
      expect(result.svg).not.toMatch(/\s{2,}/);
    });

    it("should produce same hash for identical SVGs with different IDs", async () => {
      const result1 = await canonicalizeSvg(SIMPLE_ICON, "icon-1");
      const result2 = await canonicalizeSvg(SIMPLE_ICON_DUPLICATE_1, "icon-2");
      const result3 = await canonicalizeSvg(SIMPLE_ICON_DUPLICATE_2, "icon-3");

      expect(result1.hash).toBe(result2.hash);
      expect(result2.hash).toBe(result3.hash);
    });

    it("should preserve viewBox attribute", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      expect(result.svg).toContain("viewBox=\"0 0 24 24\"");
    });

    it("should handle SVGs without viewBox", async () => {
      const result = await canonicalizeSvg(SVG_NO_VIEWBOX, "no-vb");

      // Should not crash and should produce valid SVG
      expect(result.svg).toContain("<svg");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should report accurate size reduction", async () => {
      const originalSize = SIMPLE_ICON.length;
      const result = await canonicalizeSvg(SIMPLE_ICON, "icon-1");

      expect(result.sizeReduction).toBe(originalSize - result.svg.length);
    });

    it("should return originalId correctly", async () => {
      const result = await canonicalizeSvg(SIMPLE_ICON, "my-custom-id");

      expect(result.originalId).toBe("my-custom-id");
    });
  });

  // =====================================================
  // Serialization Tests
  // =====================================================

  describe("serializeCanonical", () => {
    it("should serialize parsed SVG back to string", () => {
      const parsed: ParsedSVG = {
        viewBox: "0 0 24 24",
        attributes: new Map([
          ["viewBox", "0 0 24 24"],
          ["width", "24"],
        ]),
        content: "<circle cx='12' cy='12' r='10'/>",
        originalSize: 100,
      };

      const result = serializeCanonical(parsed);

      expect(result).toContain("<svg");
      expect(result).toContain("viewBox=\"0 0 24 24\"");
      expect(result).toContain("width=\"24\"");
      expect(result).toContain("<circle");
      expect(result).toContain("</svg>");
    });

    it("should serialize SVG with no content (self-closing)", () => {
      const parsed: ParsedSVG = {
        viewBox: "0 0 24 24",
        attributes: new Map([["viewBox", "0 0 24 24"]]),
        content: "",
        originalSize: 50,
      };

      const result = serializeCanonical(parsed);

      expect(result).toContain("<svg");
      expect(result).toContain("/>"); // Self-closing
    });

    it("should handle attributes with special characters", () => {
      const parsed: ParsedSVG = {
        viewBox: "0 0 24 24",
        attributes: new Map([
          ["viewBox", "0 0 24 24"],
          ["data-test", "value with spaces"],
        ]),
        content: "",
        originalSize: 50,
      };

      const result = serializeCanonical(parsed);

      expect(result).toContain('data-test="value with spaces"');
    });
  });

  // =====================================================
  // Helper Functions Tests
  // =====================================================

  describe("isNonRenderingAttribute", () => {
    it("should return true for data-figma-id", () => {
      expect(isNonRenderingAttribute("data-figma-id")).toBe(true);
    });

    it("should return true for id", () => {
      expect(isNonRenderingAttribute("id")).toBe(true);
    });

    it("should return true for data-editor-metadata", () => {
      expect(isNonRenderingAttribute("data-editor-metadata")).toBe(true);
    });

    it("should return false for viewBox", () => {
      expect(isNonRenderingAttribute("viewBox")).toBe(false);
    });

    it("should return false for fill", () => {
      expect(isNonRenderingAttribute("fill")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isNonRenderingAttribute("ID")).toBe(true);
      expect(isNonRenderingAttribute("Data-Figma-Id")).toBe(true);
    });
  });

  describe("isPreservedAttribute", () => {
    it("should return true for viewBox", () => {
      expect(isPreservedAttribute("viewBox")).toBe(true);
    });

    it("should return true for fill", () => {
      expect(isPreservedAttribute("fill")).toBe(true);
    });

    it("should return true for stroke", () => {
      expect(isPreservedAttribute("stroke")).toBe(true);
    });

    it("should return false for data-figma-id", () => {
      expect(isPreservedAttribute("data-figma-id")).toBe(false);
    });

    it("should return false for id", () => {
      expect(isPreservedAttribute("id")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isPreservedAttribute("VIEWBOX")).toBe(true);
      expect(isPreservedAttribute("Fill")).toBe(true);
    });
  });

  // =====================================================
  // Edge Cases
  // =====================================================

  describe("edge cases", () => {
    it("should handle empty SVG", async () => {
      const emptySvg = "<svg></svg>";

      const result = await canonicalizeSvg(emptySvg, "empty");

      expect(result.svg).toContain("<svg");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle SVG with only attributes", async () => {
      const attrsOnly = '<svg viewBox="0 0 100 100" width="100"/>';

      const result = await canonicalizeSvg(attrsOnly, "attrs-only");

      expect(result.svg).toContain("<svg");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle SVG with nested structures", async () => {
      const result = await canonicalizeSvg(SVG_NESTED_GROUPS, "nested");

      expect(result.svg).toContain("<g");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle SVG with unicode content", async () => {
      const unicodeSvg =
        '<svg viewBox="0 0 100 100"><text>Hello 世界</text></svg>';

      const result = await canonicalizeSvg(unicodeSvg, "unicode");

      expect(result.svg).toContain("Hello");
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle SVG with special characters in attributes", async () => {
      const specialSvg =
        '<svg viewBox="0 0 100 100" data-path="path/to/file.svg"><rect/></svg>';

      const result = await canonicalizeSvg(specialSvg, "special");

      // Should remove the data-path attribute
      expect(result.svg).not.toContain("data-path");
    });

    it("should handle options to disable non-rendering removal", async () => {
      const result = await canonicalizeSvg(
        SIMPLE_ICON,
        "icon-1",
        { removeNonRendering: false }
      );

      // Should keep data-figma-id when disabled
      expect(result.svg).toContain("data-figma-id");
    });

    it("should handle options to disable attribute sorting", async () => {
      const result = await canonicalizeSvg(
        SIMPLE_ICON,
        "icon-1",
        { sortAttributes: false }
      );

      // Should still canonicalize but maintain original order
      expect(result.svg).toContain("<svg");
    });

    it("should handle options to disable whitespace normalization", async () => {
      const input = '<svg  viewBox="0 0 24 24"  >  <circle/>  </svg>';

      const result = await canonicalizeSvg(
        input,
        "icon-1",
        { normalizeWhitespace: false }
      );

      // Should preserve extra whitespace
      expect(result.svg).toMatch(/\s{2,}/);
    });
  });
});
