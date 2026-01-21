import { describe, expect, it } from "@jest/globals";

import {
  extractNodeIdFromUrl,
  normalizeNodeId,
  validateNodeId,
} from "@/utils/node-id";

describe("node-id utilities", () => {
  describe("validateNodeId", () => {
    it("accepts standard node ID with colon separator", () => {
      const result = validateNodeId("1:2");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2");
      expect(result.ids).toEqual(["1:2"]);
    });

    it("accepts standard node ID with dash separator (URL format)", () => {
      const result = validateNodeId("1-2");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2");
      expect(result.ids).toEqual(["1:2"]);
    });

    it("accepts instance node ID with colon separator", () => {
      const result = validateNodeId("I5666:180910");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("I5666:180910");
      expect(result.ids).toEqual(["I5666:180910"]);
    });

    it("accepts instance node ID with dash separator (URL format)", () => {
      const result = validateNodeId("I5666-180910");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("I5666:180910");
      expect(result.ids).toEqual(["I5666:180910"]);
    });

    it("accepts multiple node IDs with colon separators", () => {
      const result = validateNodeId("1:2;3:4");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4");
      expect(result.ids).toEqual(["1:2", "3:4"]);
    });

    it("accepts multiple node IDs with dash separators (URL format)", () => {
      const result = validateNodeId("1-2;3-4");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4");
      expect(result.ids).toEqual(["1:2", "3:4"]);
    });

    it("accepts mixed format node IDs", () => {
      const result = validateNodeId("1-2;3:4;I5-6");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("1:2;3:4;I5:6");
      expect(result.ids).toEqual(["1:2", "3:4", "I5:6"]);
    });

    it("rejects invalid format - missing separator", () => {
      const result = validateNodeId("12");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects invalid format - invalid characters", () => {
      const result = validateNodeId("abc:def");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects empty string", () => {
      const result = validateNodeId("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("normalizeNodeId", () => {
    it("converts dash separator to colon", () => {
      expect(normalizeNodeId("1-2")).toBe("1:2");
    });

    it("handles multiple nodes with dash separators", () => {
      expect(normalizeNodeId("1-2;3-4")).toBe("1:2;3:4");
    });

    it("leaves colon separator unchanged", () => {
      expect(normalizeNodeId("1:2")).toBe("1:2");
    });

    it("handles mixed separators", () => {
      expect(normalizeNodeId("1-2;3:4")).toBe("1:2;3:4");
    });

    it("handles instance node IDs with dash", () => {
      expect(normalizeNodeId("I5666-180910")).toBe("I5666:180910");
    });
  });

  describe("extractNodeIdFromUrl", () => {
    it("extracts node-id from valid Figma URL", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard?node-id=6001-47121";
      expect(extractNodeIdFromUrl(url)).toBe("6001-47121");
    });

    it("extracts node-id with additional query parameters", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard?node-id=6001-47121&t=YL11smk8HUqlLrik-4";
      expect(extractNodeIdFromUrl(url)).toBe("6001-47121");
    });

    it("returns undefined when node-id is not present", () => {
      const url =
        "https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard";
      expect(extractNodeIdFromUrl(url)).toBeUndefined();
    });

    it("returns undefined for invalid URL", () => {
      expect(extractNodeIdFromUrl("not-a-url")).toBeUndefined();
    });
  });
});
