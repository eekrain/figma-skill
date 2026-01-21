/**
 * Unit tests for crop-calculator
 */
import type { Node } from "@figma/rest-api-spec";
import { describe, expect, it } from "@jest/globals";

import {
  type CropRegion,
  type TransformMatrix,
  adjustCropToImageBounds,
  calculateCropFromTransform,
  calculateCropRegions,
} from "@/images/crop-calculator";

describe("calculateCropFromTransform", () => {
  const createMockNode = (
    transform?: TransformMatrix,
    width = 1000,
    height = 1000
  ): Node => {
    return {
      id: "1:1",
      name: "Test Node",
      type: "FRAME",
      width,
      height,
      transform,
      visible: true,
      children: [],
    } as unknown as Node;
  };

  describe("Transform matrix parsing", () => {
    it("should extract scale and translation from transform matrix", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 100],
        [0, 0.5, 50],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop).not.toBeNull();
      expect(crop?.left).toBe(100);
      expect(crop?.top).toBe(50);
    });

    it("should handle identity transform", () => {
      const transform: TransformMatrix = [
        [1, 0, 0],
        [0, 1, 0],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop).not.toBeNull();
      expect(crop?.left).toBe(0);
      expect(crop?.top).toBe(0);
      expect(crop?.width).toBe(1000);
      expect(crop?.height).toBe(1000);
    });

    it("should handle scale only", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.5, 0],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop).not.toBeNull();
      expect(crop?.width).toBe(500);
      expect(crop?.height).toBe(500);
    });

    it("should handle translation only", () => {
      const transform: TransformMatrix = [
        [1, 0, 100],
        [0, 1, 50],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop).not.toBeNull();
      expect(crop?.left).toBe(100);
      expect(crop?.top).toBe(50);
      expect(crop?.width).toBe(900); // 1000 - 100
      expect(crop?.height).toBe(950); // 1000 - 50
    });

    it("should handle skew values", () => {
      const transform: TransformMatrix = [
        [0.5, 0.1, 10],
        [0.1, 0.5, 10],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      // Should not throw, skew values are read but not used in basic crop calc
      expect(crop).not.toBeNull();
    });
  });

  describe("Crop region calculation", () => {
    it("should calculate crop width based on scale", () => {
      const transform: TransformMatrix = [
        [0.75, 0, 0],
        [0, 0.75, 0],
      ];

      const node = createMockNode(transform, 1000, 1000);
      const crop = calculateCropFromTransform(node);

      expect(crop?.width).toBe(750);
      expect(crop?.height).toBe(750);
    });

    it("should calculate different scales for width and height", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.75, 0],
      ];

      const node = createMockNode(transform, 1000, 800);
      const crop = calculateCropFromTransform(node);

      expect(crop?.width).toBe(500); // 1000 * 0.5
      expect(crop?.height).toBe(600); // 800 * 0.75
    });

    it("should adjust crop position based on translation", () => {
      const transform: TransformMatrix = [
        [1, 0, 100],
        [0, 1, 200],
      ];

      const node = createMockNode(transform, 1000, 1000);
      const crop = calculateCropFromTransform(node);

      expect(crop?.left).toBe(100);
      expect(crop?.top).toBe(200);
    });
  });

  describe("Edge cases", () => {
    it("should return null for nodes without transform", () => {
      const node = createMockNode(undefined);
      const crop = calculateCropFromTransform(node);

      expect(crop).toBeNull();
    });

    it("should handle zero scale", () => {
      const transform: TransformMatrix = [
        [0, 0, 0],
        [0, 0, 0],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop).not.toBeNull();
      expect(crop?.width).toBe(0);
      expect(crop?.height).toBe(0);
    });

    it("should handle negative translation (clamped to 0)", () => {
      const transform: TransformMatrix = [
        [1, 0, -50],
        [0, 1, -100],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      expect(crop?.left).toBe(0); // clamped
      expect(crop?.top).toBe(0); // clamped
    });

    it("should handle translation exceeding bounds", () => {
      const transform: TransformMatrix = [
        [1, 0, 1500],
        [0, 1, 2000],
      ];

      const node = createMockNode(transform);
      const crop = calculateCropFromTransform(node);

      // Width/height should be clamped to not exceed image bounds
      expect(crop?.width).toBeGreaterThanOrEqual(0);
      expect(crop?.height).toBeGreaterThanOrEqual(0);
    });

    it("should handle scale larger than 1", () => {
      const transform: TransformMatrix = [
        [2, 0, 0],
        [0, 2, 0],
      ];

      const node = createMockNode(transform, 1000, 1000);
      const crop = calculateCropFromTransform(node);

      expect(crop?.width).toBe(2000);
      expect(crop?.height).toBe(2000);
    });
  });

  describe("Different node types", () => {
    it("should work with FRAME nodes", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.5, 0],
      ];

      const node = {
        id: "1:1",
        type: "FRAME",
        width: 1000,
        height: 1000,
        transform,
        visible: true,
        children: [],
      } as unknown as Node;

      const crop = calculateCropFromTransform(node);
      expect(crop).not.toBeNull();
    });

    it("should work with RECTANGLE nodes", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.5, 0],
      ];

      const node = {
        id: "1:1",
        type: "RECTANGLE",
        width: 1000,
        height: 1000,
        transform,
        visible: true,
        children: [],
      } as unknown as Node;

      const crop = calculateCropFromTransform(node);
      expect(crop).not.toBeNull();
    });

    it("should work with COMPONENT nodes", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.5, 0],
      ];

      const node = {
        id: "1:1",
        type: "COMPONENT",
        width: 1000,
        height: 1000,
        transform,
        visible: true,
        children: [],
      } as unknown as Node;

      const crop = calculateCropFromTransform(node);
      expect(crop).not.toBeNull();
    });

    it("should work with INSTANCE nodes", () => {
      const transform: TransformMatrix = [
        [0.5, 0, 0],
        [0, 0.5, 0],
      ];

      const node = {
        id: "1:1",
        type: "INSTANCE",
        width: 1000,
        height: 1000,
        transform,
        visible: true,
        children: [],
      } as unknown as Node;

      const crop = calculateCropFromTransform(node);
      expect(crop).not.toBeNull();
    });
  });
});

describe("calculateCropRegions", () => {
  it("should calculate crops for multiple nodes", () => {
    const nodes = [
      {
        id: "1:1",
        type: "FRAME",
        width: 1000,
        height: 1000,
        transform: [
          [0.5, 0, 0],
          [0, 0.5, 0],
        ],
        visible: true,
        children: [],
      },
      {
        id: "1:2",
        type: "FRAME",
        width: 800,
        height: 600,
        transform: [
          [0.75, 0, 10],
          [0, 0.75, 20],
        ],
        visible: true,
        children: [],
      },
    ] as unknown as Node[];

    const crops = calculateCropRegions(nodes);
    const cropsArray = Array.from(crops.entries());

    expect(cropsArray).toHaveLength(2);
    expect(cropsArray[0][0]).toBe("1:1"); // nodeId
    expect(cropsArray[0][1]).toHaveProperty("left");
    expect(cropsArray[1][0]).toBe("1:2"); // nodeId
    expect(cropsArray[1][1]).toHaveProperty("top");
  });

  it("should filter out nodes without transforms", () => {
    const nodes = [
      {
        id: "1:1",
        type: "FRAME",
        width: 1000,
        height: 1000,
        transform: [
          [0.5, 0, 0],
          [0, 0.5, 0],
        ],
        visible: true,
        children: [],
      },
      {
        id: "1:2",
        type: "FRAME",
        width: 1000,
        height: 1000,
        visible: true,
        children: [],
      }, // no transform
    ] as unknown as Node[];

    const crops = calculateCropRegions(nodes);
    const cropsArray = Array.from(crops.entries());

    expect(cropsArray).toHaveLength(1);
    expect(cropsArray[0][0]).toBe("1:1"); // Key is nodeId
    expect(cropsArray[0][1]).toHaveProperty("left"); // Value is CropRegion
  });

  it("should return empty array for empty input", () => {
    const crops = calculateCropRegions([]);
    expect(crops.size).toBe(0);
  });
});

describe("adjustCropToImageBounds", () => {
  it("should adjust crop within image bounds", () => {
    const crop: CropRegion = { left: 100, top: 100, width: 500, height: 500 };
    const imageWidth = 1000;
    const imageHeight = 1000;

    const adjusted = adjustCropToImageBounds(crop, imageWidth, imageHeight);

    expect(adjusted.left).toBe(100);
    expect(adjusted.top).toBe(100);
    expect(adjusted.width).toBe(500);
    expect(adjusted.height).toBe(500);
  });

  it("should clamp crop exceeding image bounds", () => {
    const crop: CropRegion = { left: 100, top: 100, width: 2000, height: 2000 };
    const imageWidth = 1000;
    const imageHeight = 1000;

    const adjusted = adjustCropToImageBounds(crop, imageWidth, imageHeight);

    expect(adjusted.width).toBeLessThanOrEqual(900); // 1000 - 100
    expect(adjusted.height).toBeLessThanOrEqual(900); // 1000 - 100
  });

  it("should clamp negative positions", () => {
    const crop: CropRegion = { left: -50, top: -100, width: 500, height: 500 };
    const imageWidth = 1000;
    const imageHeight = 1000;

    const adjusted = adjustCropToImageBounds(crop, imageWidth, imageHeight);

    expect(adjusted.left).toBe(0);
    expect(adjusted.top).toBe(0);
  });

  it("should handle zero-sized crops", () => {
    const crop: CropRegion = { left: 0, top: 0, width: 0, height: 0 };
    const imageWidth = 1000;
    const imageHeight = 1000;

    const adjusted = adjustCropToImageBounds(crop, imageWidth, imageHeight);

    expect(adjusted.width).toBe(0);
    expect(adjusted.height).toBe(0);
  });

  it("should handle crop at exact image bounds", () => {
    const crop: CropRegion = { left: 0, top: 0, width: 1000, height: 1000 };
    const imageWidth = 1000;
    const imageHeight = 1000;

    const adjusted = adjustCropToImageBounds(crop, imageWidth, imageHeight);

    expect(adjusted.left).toBe(0);
    expect(adjusted.top).toBe(0);
    expect(adjusted.width).toBe(1000);
    expect(adjusted.height).toBe(1000);
  });
});
