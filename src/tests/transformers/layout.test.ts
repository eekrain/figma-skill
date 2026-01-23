/**
 * Tests for transformers/layout module
 *
 * Tests layout transformer functions for converting Figma Auto Layout to CSS flex properties.
 */
import type { Node } from "@figma/rest-api-spec";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  type SimplifiedLayout,
  buildSimplifiedLayout,
} from "@/transformers/layout";

describe("transformers/layout", () => {
  // Mock frame nodes for testing
  let mockRowFrame: any;
  let mockColumnFrame: any;
  let mockNoneFrame: any;
  let mockParentFrame: any;
  let mockChildNode: any;

  beforeEach(() => {
    // Row layout frame (HORIZONTAL)
    mockRowFrame = {
      id: "row-frame-1",
      name: "Row Frame",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      layoutAlign: "INHERIT",
      layoutSizingHorizontal: "FIXED",
      layoutSizingVertical: "FIXED",
      itemSpacing: 10,
      paddingTop: 16,
      paddingBottom: 16,
      paddingLeft: 20,
      paddingRight: 20,
      layoutWrap: "NO_WRAP",
      overflowDirection: [],
      children: [],
    };

    // Column layout frame (VERTICAL)
    mockColumnFrame = {
      id: "col-frame-1",
      name: "Column Frame",
      type: "FRAME",
      layoutMode: "VERTICAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      layoutAlign: "INHERIT",
      layoutSizingHorizontal: "FIXED",
      layoutSizingVertical: "FIXED",
      itemSpacing: 8,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      layoutWrap: "NO_WRAP",
      overflowDirection: [],
      children: [],
    };

    // None layout frame (no AutoLayout)
    mockNoneFrame = {
      id: "none-frame-1",
      name: "None Frame",
      type: "FRAME",
      layoutMode: "NONE",
      children: [],
    };

    // Parent frame for testing parent-child relationships
    mockParentFrame = {
      id: "parent-frame",
      name: "Parent Frame",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      layoutAlign: "INHERIT",
      layoutSizingHorizontal: "FIXED",
      layoutSizingVertical: "FIXED",
      absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
      children: [],
    };

    // Child node with absolute positioning
    mockChildNode = {
      id: "child-node",
      name: "Child Node",
      type: "FRAME",
      layoutAlign: "INHERIT",
      layoutPositioning: "ABSOLUTE",
      layoutSizingHorizontal: "FIXED",
      layoutSizingVertical: "FIXED",
      absoluteBoundingBox: { x: 50, y: 50, width: 100, height: 80 },
      children: [],
    };
  });

  // =====================================================
  // Test Suite 1: buildSimplifiedLayout - Mode Detection
  // =====================================================
  describe("buildSimplifiedLayout - mode detection", () => {
    it("should return mode 'row' for HORIZONTAL layout", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.mode).toBe("row");
    });

    it("should return mode 'column' for VERTICAL layout", () => {
      const result = buildSimplifiedLayout(mockColumnFrame);

      expect(result.mode).toBe("column");
    });

    it("should return mode 'none' for NONE layout", () => {
      const result = buildSimplifiedLayout(mockNoneFrame);

      expect(result.mode).toBe("none");
    });

    it("should return mode 'none' for non-frame nodes", () => {
      const textNode = {
        id: "text-1",
        name: "Text",
        type: "TEXT",
      } as import("@figma/rest-api-spec").Node;

      const result = buildSimplifiedLayout(textNode);

      expect(result.mode).toBe("none");
    });

    it("should default to mode 'none' when layoutMode is undefined", () => {
      const frameWithoutMode = {
        id: "frame-no-mode",
        name: "Frame No Mode",
        type: "FRAME",
        children: [],
      } as any;

      const result = buildSimplifiedLayout(frameWithoutMode);

      expect(result.mode).toBe("none");
    });
  });

  // =====================================================
  // Test Suite 2: Alignment Properties
  // =====================================================
  describe("buildSimplifiedLayout - alignment properties", () => {
    it("should set justifyContent to flex-end for MAX primary axis", () => {
      mockRowFrame.primaryAxisAlignItems = "MAX";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.justifyContent).toBe("flex-end");
    });

    it("should set justifyContent to center for CENTER primary axis", () => {
      mockRowFrame.primaryAxisAlignItems = "CENTER";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.justifyContent).toBe("center");
    });

    it("should set justifyContent to space-between for SPACE_BETWEEN", () => {
      mockRowFrame.primaryAxisAlignItems = "SPACE_BETWEEN";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.justifyContent).toBe("space-between");
    });

    it("should set justifyContent to baseline for BASELINE primary axis", () => {
      mockRowFrame.primaryAxisAlignItems = "BASELINE";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.justifyContent).toBe("baseline");
    });

    it("should not set justifyContent for MIN (default)", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.justifyContent).toBeUndefined();
    });

    it("should set alignItems to flex-end for MAX counter axis", () => {
      mockRowFrame.counterAxisAlignItems = "MAX";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignItems).toBe("flex-end");
    });

    it("should set alignItems to center for CENTER counter axis", () => {
      mockRowFrame.counterAxisAlignItems = "CENTER";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignItems).toBe("center");
    });

    it("should set alignItems to space-between for SPACE_BETWEEN counter axis", () => {
      mockRowFrame.counterAxisAlignItems = "SPACE_BETWEEN";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignItems).toBe("space-between");
    });

    it("should set alignItems to baseline for BASELINE counter axis", () => {
      mockRowFrame.counterAxisAlignItems = "BASELINE";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignItems).toBe("baseline");
    });

    it("should not set alignItems for MIN (default)", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignItems).toBeUndefined();
    });

    it("should set alignSelf to stretch for STRETCH layoutAlign", () => {
      mockRowFrame.layoutAlign = "STRETCH";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignSelf).toBe("stretch");
    });

    it("should set alignSelf to flex-end for MAX layoutAlign", () => {
      mockRowFrame.layoutAlign = "MAX";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignSelf).toBe("flex-end");
    });

    it("should set alignSelf to center for CENTER layoutAlign", () => {
      mockRowFrame.layoutAlign = "CENTER";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignSelf).toBe("center");
    });

    it("should not set alignSelf for MIN (default)", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignSelf).toBeUndefined();
    });

    it("should not set alignSelf for INHERIT (default)", () => {
      mockRowFrame.layoutAlign = "INHERIT";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.alignSelf).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 3: Padding and Gap
  // =====================================================
  describe("buildSimplifiedLayout - padding and gap", () => {
    it("should set gap from itemSpacing", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.gap).toBe("10px");
    });

    it("should not set gap when itemSpacing is undefined", () => {
      delete mockRowFrame.itemSpacing;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.gap).toBeUndefined();
    });

    it("should set padding with all four values", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("16px 20px");
    });

    it("should set padding with only top and bottom", () => {
      delete mockRowFrame.paddingLeft;
      delete mockRowFrame.paddingRight;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("16px 0px");
    });

    it("should set padding with only left and right", () => {
      delete mockRowFrame.paddingTop;
      delete mockRowFrame.paddingBottom;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("0px 20px");
    });

    it("should set padding with all different values", () => {
      mockRowFrame.paddingTop = 10;
      mockRowFrame.paddingRight = 20;
      mockRowFrame.paddingBottom = 30;
      mockRowFrame.paddingLeft = 40;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("10px 20px 30px 40px");
    });

    it("should set padding with equal horizontal values", () => {
      mockRowFrame.paddingTop = 10;
      mockRowFrame.paddingRight = 20;
      mockRowFrame.paddingBottom = 10;
      mockRowFrame.paddingLeft = 20;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("10px 20px");
    });

    it("should not set padding when all values are 0", () => {
      mockRowFrame.paddingTop = 0;
      mockRowFrame.paddingRight = 0;
      mockRowFrame.paddingBottom = 0;
      mockRowFrame.paddingLeft = 0;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBeUndefined();
    });

    it("should not set padding when padding values are undefined", () => {
      delete mockRowFrame.paddingTop;
      delete mockRowFrame.paddingRight;
      delete mockRowFrame.paddingBottom;
      delete mockRowFrame.paddingLeft;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 4: Wrap and Overflow
  // =====================================================
  describe("buildSimplifiedLayout - wrap and overflow", () => {
    it("should set wrap to true for WRAP layoutWrap", () => {
      mockRowFrame.layoutWrap = "WRAP";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.wrap).toBe(true);
    });

    it("should not set wrap for NO_WRAP layoutWrap", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.wrap).toBeUndefined();
    });

    it("should set overflowScroll with x for HORIZONTAL overflow", () => {
      mockRowFrame.overflowDirection = ["HORIZONTAL"];
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.overflowScroll).toEqual(["x"]);
    });

    it("should set overflowScroll with y for VERTICAL overflow", () => {
      mockRowFrame.overflowDirection = ["VERTICAL"];
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.overflowScroll).toEqual(["y"]);
    });

    it("should set overflowScroll with both x and y for BOTH overflow", () => {
      mockRowFrame.overflowDirection = ["HORIZONTAL", "VERTICAL"];
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.overflowScroll).toEqual(["x", "y"]);
    });

    it("should not set overflowScroll for NONE overflow", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.overflowScroll).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 5: Sizing Modes
  // =====================================================
  describe("buildSimplifiedLayout - sizing modes", () => {
    it("should set sizing horizontal to fixed for FIXED", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.horizontal).toBe("fixed");
    });

    it("should set sizing vertical to fixed for FIXED", () => {
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.vertical).toBe("fixed");
    });

    it("should set sizing horizontal to fill for FILL", () => {
      mockRowFrame.layoutSizingHorizontal = "FILL";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.horizontal).toBe("fill");
    });

    it("should set sizing vertical to fill for FILL", () => {
      mockRowFrame.layoutSizingVertical = "FILL";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.vertical).toBe("fill");
    });

    it("should set sizing horizontal to hug for HUG", () => {
      mockRowFrame.layoutSizingHorizontal = "HUG";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.horizontal).toBe("hug");
    });

    it("should set sizing vertical to hug for HUG", () => {
      mockRowFrame.layoutSizingVertical = "HUG";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.vertical).toBe("hug");
    });

    it("should not set sizing when layoutSizing is undefined", () => {
      delete mockRowFrame.layoutSizingHorizontal;
      delete mockRowFrame.layoutSizingVertical;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.sizing?.horizontal).toBeUndefined();
      expect(result.sizing?.vertical).toBeUndefined();
    });

    it("should not set sizing for non-layout nodes", () => {
      const textNode = {
        id: "text-1",
        type: "TEXT",
      } as import("@figma/rest-api-spec").Node;

      const result = buildSimplifiedLayout(textNode);

      expect(result.sizing).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 6: Dimensions
  // =====================================================
  describe("buildSimplifiedLayout - dimensions", () => {
    it("should set width for row mode with fixed sizing", () => {
      mockRowFrame.layoutGrow = 0;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.width).toBeDefined();
    });

    it("should set height for row mode with fixed vertical sizing", () => {
      mockRowFrame.layoutGrow = 0;
      mockRowFrame.layoutAlign = "MIN";
      mockRowFrame.layoutSizingVertical = "FIXED";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.height).toBeDefined();
    });

    it("should set width for column mode with fixed horizontal sizing", () => {
      mockColumnFrame.layoutAlign = "MIN";
      mockColumnFrame.layoutSizingHorizontal = "FIXED";
      const result = buildSimplifiedLayout(mockColumnFrame);

      expect(result.dimensions?.width).toBeDefined();
    });

    it("should set height for column mode with fixed vertical sizing", () => {
      mockColumnFrame.layoutGrow = 0;
      mockColumnFrame.layoutSizingVertical = "FIXED";
      const result = buildSimplifiedLayout(mockColumnFrame);

      expect(result.dimensions?.height).toBeDefined();
    });

    it("should set aspectRatio for column mode with preserveRatio", () => {
      mockColumnFrame.preserveRatio = true;
      mockColumnFrame.layoutAlign = "MIN";
      mockColumnFrame.layoutGrow = 0;
      mockColumnFrame.layoutSizingHorizontal = "FIXED";
      mockColumnFrame.layoutSizingVertical = "FIXED";
      const result = buildSimplifiedLayout(mockColumnFrame);

      expect(result.dimensions?.aspectRatio).toBeDefined();
    });

    it("should not set dimensions for row mode with layoutGrow", () => {
      mockRowFrame.layoutGrow = 1;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.width).toBeUndefined();
    });

    it("should not set width for row mode with STRETCH layoutAlign", () => {
      mockRowFrame.layoutAlign = "STRETCH";
      mockRowFrame.layoutGrow = 0;
      mockRowFrame.layoutSizingHorizontal = "FIXED";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.width).toBeDefined();
    });

    it("should set width and height for none mode", () => {
      const result = buildSimplifiedLayout(mockNoneFrame);

      expect(result.dimensions).toBeUndefined();
    });

    it("should round dimensions to 2 decimals", () => {
      mockRowFrame.absoluteBoundingBox = {
        x: 0,
        y: 0,
        width: 100.4567,
        height: 50.7891,
      };
      mockRowFrame.layoutGrow = 0;
      mockRowFrame.layoutAlign = "MIN";
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.width).toBe(100.46);
      expect(result.dimensions?.height).toBe(50.79);
    });
  });

  // =====================================================
  // Test Suite 7: Absolute Positioning
  // =====================================================
  describe("buildSimplifiedLayout - absolute positioning", () => {
    it("should set position to absolute for ABSOLUTE layoutPositioning", () => {
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.position).toBe("absolute");
    });

    it("should calculate locationRelativeToParent correctly", () => {
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.locationRelativeToParent).toEqual({
        x: 50,
        y: 50,
      });
    });

    it("should handle relative location calculation with offset parent", () => {
      mockParentFrame.absoluteBoundingBox = {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      };
      mockChildNode.absoluteBoundingBox = {
        x: 150,
        y: 150,
        width: 100,
        height: 80,
      };

      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.locationRelativeToParent).toEqual({
        x: 50,
        y: 50,
      });
    });

    it("should not set position for nodes in AutoLayout flow", () => {
      delete mockChildNode.layoutPositioning;
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.position).toBeUndefined();
    });

    it("should not set absolute positioning when parent is not a frame", () => {
      const nonFrameParent = {
        id: "non-frame",
        type: "DOCUMENT",
        children: [],
      } as import("@figma/rest-api-spec").Node;

      const result = buildSimplifiedLayout(mockChildNode, nonFrameParent);

      expect(result.position).toBeUndefined();
    });

    it("should not set absolute positioning for nodes with none mode parent", () => {
      mockParentFrame.layoutMode = "NONE";
      mockChildNode.layoutPositioning = undefined; // Not absolute
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.position).toBeUndefined();
    });

    it("should handle missing parent absoluteBoundingBox", () => {
      delete mockParentFrame.absoluteBoundingBox;
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.locationRelativeToParent).toBeUndefined();
    });

    it("should handle missing child absoluteBoundingBox", () => {
      delete mockChildNode.absoluteBoundingBox;
      const result = buildSimplifiedLayout(mockChildNode, mockParentFrame);

      expect(result.locationRelativeToParent).toBeUndefined();
    });
  });

  // =====================================================
  // Test Suite 8: Edge Cases
  // =====================================================
  describe("buildSimplifiedLayout - edge cases", () => {
    it("should handle undefined parent", () => {
      const result = buildSimplifiedLayout(mockChildNode, undefined);

      expect(result).toBeDefined();
      expect(result.mode).toBe("none");
    });

    it("should handle node with children array", () => {
      mockRowFrame.children = [
        { id: "child-1", type: "FRAME" } as any,
        { id: "child-2", type: "FRAME" } as any,
      ];
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.mode).toBe("row");
    });

    it("should handle empty children array", () => {
      mockRowFrame.children = [];
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.mode).toBe("row");
    });

    it("should handle missing children property", () => {
      delete mockRowFrame.children;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.mode).toBe("row");
    });

    it("should handle COMPONENT node type", () => {
      const componentNode = {
        id: "comp-1",
        name: "Component",
        type: "COMPONENT",
        layoutMode: "HORIZONTAL",
        primaryAxisAlignItems: "CENTER",
        itemSpacing: 5,
        children: [],
      } as any;

      const result = buildSimplifiedLayout(componentNode);

      expect(result.mode).toBe("row");
      expect(result.justifyContent).toBe("center");
      expect(result.gap).toBe("5px");
    });

    it("should handle INSTANCE node type", () => {
      const instanceNode = {
        id: "inst-1",
        name: "Instance",
        type: "INSTANCE",
        layoutMode: "VERTICAL",
        counterAxisAlignItems: "CENTER",
        itemSpacing: 8,
        children: [],
      } as any;

      const result = buildSimplifiedLayout(instanceNode);

      expect(result.mode).toBe("column");
      expect(result.alignItems).toBe("center");
      expect(result.gap).toBe("8px");
    });

    it("should handle NaN dimensions by throwing error", () => {
      mockRowFrame.absoluteBoundingBox = {
        x: NaN,
        y: NaN,
        width: NaN,
        height: NaN,
      };
      mockRowFrame.layoutGrow = 0;
      mockRowFrame.layoutAlign = "MIN";

      // pixelRound throws TypeError on NaN input
      expect(() => buildSimplifiedLayout(mockRowFrame)).toThrow(
        "Input must be a valid number"
      );
    });

    it("should handle zero dimensions", () => {
      mockRowFrame.absoluteBoundingBox = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      mockRowFrame.layoutGrow = 0;
      mockRowFrame.layoutAlign = "MIN";

      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.dimensions?.width).toBe(0);
      expect(result.dimensions?.height).toBe(0);
    });

    it("should handle negative itemSpacing", () => {
      mockRowFrame.itemSpacing = -10;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.gap).toBe("-10px");
    });

    it("should handle negative padding", () => {
      mockRowFrame.paddingTop = -5;
      mockRowFrame.paddingRight = -10;
      const result = buildSimplifiedLayout(mockRowFrame);

      expect(result.padding).toBe("-5px -10px 16px 20px");
    });
  });

  // =====================================================
  // Test Suite 9: Integration with Parent-Child
  // =====================================================
  describe("buildSimplifiedLayout - parent-child integration", () => {
    it("should correctly process child in row parent AutoLayout", () => {
      const rowParent = {
        id: "row-parent",
        type: "FRAME",
        layoutMode: "HORIZONTAL",
        absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
        children: [],
      } as any;

      const child = {
        id: "child",
        type: "FRAME",
        layoutAlign: "MIN",
        layoutSizingHorizontal: "FILL",
        layoutSizingVertical: "FILL",
        absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 50 },
        children: [],
      } as any;

      const result = buildSimplifiedLayout(child, rowParent);

      expect(result.mode).toBe("none"); // child has no layoutMode
      expect(result.sizing?.horizontal).toBe("fill");
      expect(result.sizing?.vertical).toBe("fill");
    });

    it("should correctly process child in column parent AutoLayout", () => {
      const colParent = {
        id: "col-parent",
        type: "FRAME",
        layoutMode: "VERTICAL",
        absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
        children: [],
      } as any;

      const child = {
        id: "child",
        type: "FRAME",
        layoutAlign: "STRETCH",
        layoutSizingHorizontal: "HUG",
        layoutSizingVertical: "FILL",
        absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 50 },
        children: [],
      } as any;

      const result = buildSimplifiedLayout(child, colParent);

      expect(result.sizing?.horizontal).toBe("hug");
      expect(result.sizing?.vertical).toBe("fill");
    });

    it("should handle absolute positioned child in AutoLayout parent", () => {
      const absoluteChild = {
        id: "abs-child",
        type: "FRAME",
        layoutPositioning: "ABSOLUTE",
        layoutSizingHorizontal: "FIXED",
        layoutSizingVertical: "FIXED",
        absoluteBoundingBox: { x: 50, y: 50, width: 100, height: 80 },
        children: [],
      } as any;

      const result = buildSimplifiedLayout(absoluteChild, mockParentFrame);

      expect(result.position).toBe("absolute");
      expect(result.locationRelativeToParent).toEqual({ x: 50, y: 50 });
    });
  });

  // =====================================================
  // Test Suite 10: Return Type
  // =====================================================
  describe("Type definitions", () => {
    it("should return SimplifiedLayout type", () => {
      const result: SimplifiedLayout = buildSimplifiedLayout(mockRowFrame);

      expect(result).toBeDefined();
      expect(typeof result.mode).toBe("string");
    });

    it("should have valid mode values", () => {
      const rowResult = buildSimplifiedLayout(mockRowFrame);
      const colResult = buildSimplifiedLayout(mockColumnFrame);
      const noneResult = buildSimplifiedLayout(mockNoneFrame);

      expect(["row", "column", "none"]).toContain(rowResult.mode);
      expect(["row", "column", "none"]).toContain(colResult.mode);
      expect(["row", "column", "none"]).toContain(noneResult.mode);
    });
  });
});
