import { describe, expect, test } from "bun:test";

import {
  extractNodeIdFromUrl,
  normalizeNodeId,
  validateNodeId,
} from "./node-id";

describe("node-id utilities", () => {
  describe("validateNodeId", () => {
    test("accepts standard node ID with colon separator", () => {
      const result = validateNodeId("1:2");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2");
      expect(result.ids).toEqual(["1:2"]);
    });

    test("accepts standard node ID with dash separator (URL format)", () => {
      const result = validateNodeId("1-2");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2");
      expect(result.ids).toEqual(["1:2"]);
    });

    test("accepts instance node ID with colon separator", () => {
      const result = validateNodeId("I5666:180910");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("I5666:180910");
      expect(result.ids).toEqual(["I5666:180910"]);
    });

    test("accepts instance node ID with dash separator (URL format)", () => {
      const result = validateNodeId("I5666-180910");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("I5666:180910");
      expect(result.ids).toEqual(["I5666:180910"]);
    });

    test("accepts multiple node IDs with colon separators", () => {
      const result = validateNodeId("1:2;3:4");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4");
      expect(result.ids).toEqual(["1:2", "3:4"]);
    });

    test("accepts multiple node IDs with dash separators (URL format)", () => {
      const result = validateNodeId("1-2;3-4");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4");
      expect(result.ids).toEqual(["1:2", "3:4"]);
    });

    test("accepts mixed format node IDs", () => {
      const result = validateNodeId("1-2;3:4;I5-6");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4;I5:6");
      expect(result.ids).toEqual(["1:2", "3:4", "I5:6"]);
    });

    test("rejects invalid format - missing separator", () => {
      const result = validateNodeId("12");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("rejects invalid format - invalid characters", () => {
      const result = validateNodeId("abc:def");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("rejects empty string", () => {
      const result = validateNodeId("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("normalizeNodeId", () => {
    test("converts dash separator to colon", () => {
      expect(normalizeNodeId("1-2")).toBe("1:2");
    });

    test("handles multiple nodes with dash separators", () => {
      expect(normalizeNodeId("1-2;3-4")).toBe("1:2;3:4");
    });

    test("leaves colon separator unchanged", () => {
      expect(normalizeNodeId("1:2")).toBe("1:2");
    });

    test("handles mixed separators", () => {
      expect(normalizeNodeId("1-2;3:4")).toBe("1:2;3:4");
    });

    test("handles instance node IDs with dash", () => {
      expect(normalizeNodeId("I5666-180910")).toBe("I5666:180910");
    });
  });

  describe("extractNodeIdFromUrl", () => {
    test("extracts node-id from valid Figma URL", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard?node-id=6001-47121";
      expect(extractNodeIdFromUrl(url)).toBe("6001-47121");
    });

    test("extracts node-id with additional query parameters", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard?node-id=6001-47121&t=YL11smk8HUqlLrik-4";
      expect(extractNodeIdFromUrl(url)).toBe("6001-47121");
    });

    test("returns undefined when node-id is not present", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard";
      expect(extractNodeIdFromUrl(url)).toBeUndefined();
    });

    test("returns undefined for invalid URL", () => {
      expect(extractNodeIdFromUrl("not-a-url")).toBeUndefined();
    });
  });
});
