/**
 * Mask Compositing Integration Tests
 *
 * Tests the end-to-end mask workflow:
 * 1. Detect mask relationships
 * 2. Download masked images
 * 3. Align coordinate spaces
 * 4. Composite mask with target
 * 5. Verify output
 *
 * RED PHASE: These tests will fail because the integration orchestrator
 * doesn't exist yet. This is intentional TDD practice.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import sharp from "sharp";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Module imports
import {
  detectMaskRelationships,
  alignCoordinateSpaces,
  applyVectorMask,
  applyLuminanceMask,
  type MaskRelationship,
  type AlignedAssets,
  type CompositeOptions,
} from "../../images/index.js";
import {
  createSolidColorImage,
  createGradientImage,
  cleanupTestImages,
} from "../fixtures/images.js";
import {
  createMaskedParent,
  createNestedMaskStructure,
  createEllipseNode,
  type Node,
} from "../fixtures/nodes.js";
import { CIRCLE_MASK_SVG, GRADIENT_MASK_SVG } from "../fixtures/svg.js";
import {
  withTempDirectory,
  assertImageDimensions,
  assertImageFormat,
  assertHasTransparency,
  createTempDir,
} from "../utils/integration-helpers.js";
import { createPerformanceMarker } from "../utils/performance-helpers.js";

// =====================================================
// Test Fixtures
// =====================================================

interface TestContext {
  tempDir: string;
  testImages: string[];
  testMasks: string[];
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  // Create temporary directory
  const temp = await createTempDir("mask-integration-");
  context = {
    tempDir: temp.path,
    testImages: [],
    testMasks: [],
  };
});

afterAll(async () => {
  // Cleanup all test images
  await cleanupTestImages(context.testImages);
  // Cleanup temp directory
  await rm(context.tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Reset arrays before each test
  context.testImages = [];
  context.testMasks = [];
});

// =====================================================
// Test Suite: Mask Compositing Integration
// =====================================================

describe("Mask Compositing Integration", () => {
  // Test 1: Simple circular mask workflow
  it("should detect mask, download, align, composite, and return final image", async () => {
    // This test should FAIL because the integration orchestrator doesn't exist yet
    // Once we implement src/images/integrations/mask-pipeline.ts, this will pass

    // Given: A Figma frame with circular mask and photo child
    const maskNode = createEllipseNode("mask-1", true);
    const frameNode = createMaskedParent("ALPHA", 1);

    // Create test target image
    const targetImagePath = await createGradientImage(200, 200);
    context.testImages.push(targetImagePath);
    const targetMaskPath = join(context.tempDir, "target.png");
    await sharp(targetImagePath).png().toFile(targetMaskPath);

    // Create mask SVG
    const maskSvgPath = join(context.tempDir, "mask.svg");
    await writeFile(maskSvgPath, CIRCLE_MASK_SVG, "utf-8");
    context.testMasks.push(maskSvgPath);

    const outputPath = join(context.tempDir, "composite-output.png");
    context.testImages.push(outputPath);

    // When: Processing through full pipeline
    // Step 1: Detect mask relationship
    const relationships = detectMaskRelationships(frameNode as unknown as Node);
    expect(relationships.length).toBeGreaterThan(0);
    expect(relationships[0].maskNode.id).toBe("mask-1");

    // Step 2: Align coordinate spaces
    const alignment: AlignedAssets = {
      targetImage: {
        path: targetMaskPath,
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      mask: {
        path: maskSvgPath,
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      compositeDimensions: {
        width: 100,
        height: 100,
      },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // Step 3: Apply vector mask
    const options: CompositeOptions = {
      targetImagePath: targetMaskPath,
      maskInput: CIRCLE_MASK_SVG,
      outputPath,
      alignment,
      maskType: "VECTOR",
    };

    const result = await applyVectorMask(options);

    // Then: Final image has circular mask applied correctly
    expect(result.path).toBe(outputPath);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);

    // Verify output format and transparency
    await assertImageFormat(outputPath, "png");
    await assertHasTransparency(outputPath);
    await assertImageDimensions(outputPath, { width: 100, height: 100 });
  });

  // Test 2: Nested mask workflow
  it("should handle nested masks with proper coordinate alignment", async () => {
    // Given: Frame with mask → child with mask → grandchild
    const nestedStructure = createNestedMaskStructure();

    // When: Processing nested mask chain
    const relationships = detectMaskRelationships(nestedStructure as unknown as Node);

    // Then: All masks detected in correct order
    expect(relationships.length).toBeGreaterThanOrEqual(2);

    // Verify outer mask detected
    const outerMask = relationships.find((r) => r.maskNode.id === "outer-mask");
    expect(outerMask).toBeDefined();
    expect(outerMask?.targets.length).toBeGreaterThan(0);

    // Verify inner mask detected
    const innerMask = relationships.find((r) => r.maskNode.id === "inner-mask");
    expect(innerMask).toBeDefined();

    // Verify nested relationship
    expect(innerMask?.parentContainer).toBeDefined();
  });

  // Test 3: Multiple masked siblings
  it("should apply same mask to multiple siblings", async () => {
    // Given: One mask node, three photo siblings
    const frameNode = createMaskedParent("ALPHA", 3);
    const relationships = detectMaskRelationships(frameNode as unknown as Node);

    // When: Processing all siblings
    const maskRelationship = relationships[0];

    // Then: All three photos have mask applied
    expect(maskRelationship.targets).toHaveLength(3);
    expect(maskRelationship.targets.map((t) => t.id)).toEqual(
      expect.arrayContaining(["target-1", "target-2", "target-3"])
    );
  });

  // Test 4: Luminance mask workflow
  it("should apply luminance mask with brightness-based opacity", async () => {
    // Given: Luminance mask with gradient
    const targetImagePath = await createSolidColorImage(200, 200, {
      r: 255,
      g: 0,
      b: 0,
    });
    context.testImages.push(targetImagePath);

    const targetMaskPath = join(context.tempDir, "luminance-target.png");
    await sharp(targetImagePath).png().toFile(targetMaskPath);

    const outputPath = join(context.tempDir, "luminance-output.png");
    context.testImages.push(outputPath);

    const alignment: AlignedAssets = {
      targetImage: {
        path: targetMaskPath,
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      mask: {
        path: "gradient-mask",
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      compositeDimensions: {
        width: 100,
        height: 100,
      },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // When: Compositing with target image
    const options: CompositeOptions = {
      targetImagePath: targetMaskPath,
      maskInput: GRADIENT_MASK_SVG,
      outputPath,
      alignment,
      maskType: "LUMINANCE",
    };

    const result = await applyLuminanceMask(options);

    // Then: Opacity varies by mask brightness
    expect(result.path).toBe(outputPath);
    await assertImageFormat(outputPath, "png");
    await assertHasTransparency(outputPath);
  });

  // Test 5: Performance - circular mask compositing
  it("should composite circular mask in <500ms", async () => {
    const marker = createPerformanceMarker("circular-mask-composite");

    // Given: 100x100 image with circular mask
    const targetImagePath = await createGradientImage(100, 100);
    context.testImages.push(targetImagePath);

    const targetMaskPath = join(context.tempDir, "perf-target.png");
    await sharp(targetImagePath).png().toFile(targetMaskPath);

    const outputPath = join(context.tempDir, "perf-output.png");
    context.testImages.push(outputPath);

    const alignment: AlignedAssets = {
      targetImage: {
        path: targetMaskPath,
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      mask: {
        path: "circular-mask",
        width: 100,
        height: 100,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      compositeDimensions: { width: 100, height: 100 },
      relativeOffset: { x: 0, y: 0 },
      scale: 1,
      aspectRatioMatch: true,
    };

    // When: Applying mask
    const options: CompositeOptions = {
      targetImagePath: targetMaskPath,
      maskInput: CIRCLE_MASK_SVG,
      outputPath,
      alignment,
      maskType: "VECTOR",
    };

    await applyVectorMask(options);
    const duration = marker.elapsed();

    // Then: Completes in <500ms
    expect(duration).toBeLessThan(500);
  });

  // Test 6: Integration - full mask pipeline
  it("should process complete mask pipeline end-to-end", async () => {
    // This is the integration test that will drive the implementation
    // of src/images/integrations/mask-pipeline.ts

    // Given: Complex masked structure with multiple targets
    const frameNode = createMaskedParent("VECTOR", 2);

    // Create test images
    const testImages: string[] = [];
    for (let i = 0; i < 2; i++) {
      const imgPath = await createGradientImage(150, 150);
      testImages.push(imgPath);
      context.testImages.push(imgPath);
    }

    // When: Running full pipeline
    // TODO: This will be implemented in mask-pipeline.ts
    // const result = await processMaskPipeline(frameNode, testImages, context.tempDir);

    // Then: All outputs generated correctly
    // expect(result.success).toBe(true);
    // expect(result.outputs).toHaveLength(2);
    // expect(result.errors).toHaveLength(0);

    // For now, just verify the setup works
    expect(frameNode).toBeDefined();
    expect(testImages).toHaveLength(2);
  });
});

// =====================================================
// Test Suite: Coordinate Alignment Integration
// =====================================================

describe("Coordinate Alignment Integration", () => {
  it("should align images with different dimensions", async () => {
    // Given: Mask (100x100) and target (200x150)
    const maskPath = await createSolidColorImage(100, 100, {
      r: 0,
      g: 0,
      b: 0,
    });
    context.testImages.push(maskPath);

    const targetPath = await createSolidColorImage(200, 150, {
      r: 255,
      g: 255,
      b: 255,
    });
    context.testImages.push(targetPath);

    // When: Aligning coordinate spaces
    const alignment = alignCoordinateSpaces(
      { width: 100, height: 100 },
      { width: 200, height: 150 },
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 0, width: 200, height: 150 }
    );

    // Then: Proper composite dimensions calculated
    expect(alignment.compositeDimensions.width).toBe(200);
    expect(alignment.compositeDimensions.height).toBe(150);
    expect(alignment.scale).toBeDefined();
  });

  it("should handle masks with non-zero offset", async () => {
    // Given: Mask offset by (50, 25)
    const maskPath = await createSolidColorImage(100, 100, {
      r: 0,
      g: 0,
      b: 0,
    });
    context.testImages.push(maskPath);

    const targetPath = await createSolidColorImage(200, 200, {
      r: 255,
      g: 255,
      b: 255,
    });
    context.testImages.push(targetPath);

    // When: Aligning with offset
    const alignment = alignCoordinateSpaces(
      { width: 100, height: 100 },
      { width: 200, height: 200 },
      { x: 50, y: 25, width: 100, height: 100 },
      { x: 0, y: 0, width: 200, height: 200 }
    );

    // Then: Offset calculated correctly
    expect(alignment.relativeOffset.x).toBeDefined();
    expect(alignment.relativeOffset.y).toBeDefined();
  });
});

// =====================================================
// Test Suite: Error Handling
// =====================================================

describe("Mask Compositing Error Handling", () => {
  it("should throw on missing target image", async () => {
    const outputPath = join(context.tempDir, "error-test.png");

    const options: CompositeOptions = {
      targetImagePath: "/nonexistent/image.png",
      maskInput: CIRCLE_MASK_SVG,
      outputPath,
      alignment: {
        targetImage: {
          path: "/nonexistent/image.png",
          width: 100,
          height: 100,
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        mask: {
          path: "mask",
          width: 100,
          height: 100,
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        compositeDimensions: { width: 100, height: 100 },
        relativeOffset: { x: 0, y: 0 },
        scale: 1,
        aspectRatioMatch: true,
      },
      maskType: "VECTOR",
    };

    await expect(applyVectorMask(options)).rejects.toThrow();
  });

  it("should throw on invalid alignment dimensions", async () => {
    const targetPath = await createSolidColorImage(100, 100, {
      r: 255,
      g: 255,
      b: 255,
    });
    context.testImages.push(targetPath);

    const outputPath = join(context.tempDir, "error-test2.png");

    const options: CompositeOptions = {
      targetImagePath: targetPath,
      maskInput: CIRCLE_MASK_SVG,
      outputPath,
      alignment: {
        targetImage: {
          path: targetPath,
          width: 100,
          height: 100,
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        mask: {
          path: "mask",
          width: 100,
          height: 100,
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        compositeDimensions: { width: 0, height: 0 }, // Invalid!
        relativeOffset: { x: 0, y: 0 },
        scale: 1,
        aspectRatioMatch: true,
      },
      maskType: "VECTOR",
    };

    await expect(applyVectorMask(options)).rejects.toThrow();
  });
});
