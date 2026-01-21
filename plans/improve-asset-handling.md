# Image & Asset Handling Improvement Plan

**Version**: 1.0
**Date**: 2026-01-22
**Status**: Planning Phase
**Priority**: High

---

## Executive Summary

This plan implements a comprehensive overhaul of the image and asset handling system in figma-skill, transitioning from basic rectangular cropping and header-based format detection to a production-grade extraction engine. The plan is based on extensive research covering Figma's REST API internal data structures, Sharp's compositing capabilities, entropy-based format selection, and high-throughput concurrency patterns.

### Core Architectural Changes

| Area | Current State | Target State |
|------|---------------|--------------|
| **Mask/Crop Handling** | Simple rectangular crops from transform matrices | SVG Matte compositing with dest-in blend mode for complex vector masks |
| **Format Detection** | Content-type header parsing | Entropy-based heuristic analysis (transparency, entropy, palette size) |
| **Batch Conversion** | Individual processing, no concurrency control | p-limit controlled stream architecture with memory-aware batching |
| **Vector Optimization** | Container collapsing only | Content-addressable deduplication + SVGO minification + sprite generation |

---

## Roadmap Integration

> **📍 Main Roadmap**: [`ROADMAP.md - Image & Asset Handling`](../ROADMAP.md#image--asset-handling)

This implementation plan directly addresses the checklist items in the main ROADMAP.md:

### Phase 1 → ROADMAP: "Improved mask/crop handling"
- [ ] Fix complex mask shape exports → SVG Matte Compositing (Section 1.2)
- [ ] Support nested masks and transformations → Nested Stencil Scopes (Section 1.3.2)
- [ ] Better crop boundary detection → Boundary Detection Algorithm (Section 1.4)

### Phase 2 → ROADMAP: "Smart format detection"
- [ ] Auto-detect optimal format based on node properties → Content Analysis Engine (Section 2.1)
- [ ] Batch format conversion (PNG → WebP, SVG → PNG) → Auto-Conversion Pipeline (Section 2.3)
- [ ] Format-specific optimization settings → Encoder Settings (Section 2.2)

### Phase 3 → ROADMAP: Batch Processing (new item)
- [ ] p-limit controlled concurrency → Batch Processing Architecture (Section 3.2)
- [ ] Memory-aware processing → Stream-Based Concurrency (Section 3.2)
- [ ] Download-process pipeline → Integrated Pipeline (Section 3.2)

### Phase 4 → ROADMAP: "Vector optimization"
- [ ] SVG minification and cleanup → SVGO Integration (Section 4.4)
- [ ] Duplicate vector deduplication → Content-Addressable Hashing (Section 4.1-4.3)
- [ ] Icon set consolidation → Sprite Generation (Section 4.5)

### Version Tracking
- **Target Release**: v0.3.0 - Enhanced Transformations
- **Tracking Issue**: TBD
- **Progress**: Updated in ROADMAP.md checklist

---

## Table of Contents

1. [Phase 1: Advanced Mask/Crop Handling](#phase-1-advanced-maskcrop-handling)
2. [Phase 2: Smart Format Detection](#phase-2-smart-format-detection)
3. [Phase 3: Batch Processing & Concurrency](#phase-3-batch-processing--concurrency)
4. [Phase 4: Vector Optimization](#phase-4-vector-optimization)
5. [Phase 5: Testing & Validation](#phase-5-testing--validation)
6. [Dependencies & Integration](#dependencies--integration)
7. [Risk Assessment](#risk-assessment)

---

## Phase 1: Advanced Mask/Crop Handling

**Effort**: High
**Priority**: Critical
**Dependencies**: None

### Problem Statement

The current implementation only handles simple rectangular crops from transform matrices (`crop-calculator.ts`). It has **zero mask handling** - no `isMask` detection, no `maskType` support, and no capability for complex mask shapes (circles, polygons, compound vectors).

### Root Cause Analysis

1. **No mask detection logic**: The code never checks `isMask` property or processes sibling stencil relationships
2. **Sharp limitation**: `extract()` only supports rectangular regions
3. **Missing coordinate space alignment**: No logic to align mask and target bounding boxes
4. **No nested mask support**: Single-level processing only

### Technical Strategy: SVG Matte Compositing

Based on research findings, we will implement the **SVG Matte** technique using Sharp's composite operations with `dest-in` blend mode.

#### 1.1 Figma Mask Detection

**New File**: `src/images/mask-detector.ts`

```typescript
/**
 * Figma mask detection and relationship mapping
 */

export interface MaskRelationship {
  /** The target node being masked */
  targetNodeId: string;
  /** The mask node (sibling with isMask: true) */
  maskNodeId: string;
  /** Mask type from Figma API */
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE";
  /** Bounding box intersection for alignment */
  intersection: BoundingBox;
}

/**
 * Scan node children for mask relationships
 * Implements the "sibling stencil" model where isMask nodes
 * mask all subsequent siblings in the same parent container
 */
export function detectMaskRelationships(
  parentNode: FrameNode | GroupNode | InstanceNode
): MaskRelationship[] {
  const relationships: MaskRelationship[] = [];
  let currentMask: MaskNode | null = null;
  let maskBoundingBox: BoundingBox | null = null;

  for (const child of parentNode.children) {
    // Check if this child is a mask
    if ("isMask" in child && child.isMask === true) {
      currentMask = child as MaskNode;
      maskBoundingBox = child.absoluteBoundingBox;
      continue;
    }

    // If we have an active mask, this node is masked
    if (currentMask && maskBoundingBox) {
      relationships.push({
        targetNodeId: child.id,
        maskNodeId: currentMask.id,
        maskType: currentMask.maskType || "ALPHA",
        intersection: calculateIntersection(
          child.absoluteBoundingBox,
          maskBoundingBox
        ),
      });
    }
  }

  return relationships;
}
```

#### 1.2 Coordinate Space Alignment

**New File**: `src/images/coordinate-aligner.ts`

```typescript
/**
 * Coordinate space normalization for mask compositing
 *
 * Figma provides absoluteBoundingBox for all nodes in page coordinates.
 * To composite correctly, we must normalize the coordinate spaces of
 * the Mask and the Target.
 */

export interface AlignedAssets {
  /** Target image offset relative to mask origin */
  targetOffset: { x: number; y: number };
  /** Composite canvas dimensions (match mask bounds) */
  compositeDimensions: { width: number; height: number };
  /** Mask SVG with embedded transforms */
  maskSvg: string;
}

/**
 * Calculate coordinate alignment for mask compositing
 *
 * The composite canvas must be created with dimensions equal to the
 * mask bounding box (since nothing outside the mask is visible).
 * The target image must be drawn at an offset to align properly.
 */
export function alignCoordinateSpaces(
  maskBoundingBox: BoundingBox,
  targetBoundingBox: BoundingBox
): AlignedAssets {
  const compositeDimensions = {
    width: maskBoundingBox.width,
    height: maskBoundingBox.height,
  };

  const targetOffset = {
    x: targetBoundingBox.x - maskBoundingBox.x,
    y: targetBoundingBox.y - maskBoundingBox.y,
  };

  return { targetOffset, compositeDimensions, maskSvg: "" };
}
```

#### 1.3 SVG Matte Compositing Engine

**New File**: `src/images/mask-compositor.ts`

```typescript
/**
 * SVG Matte compositing for complex mask shapes
 *
 * Uses Sharp's composite operation with dest-in blend mode to
 * apply vector masks exported as SVG from Figma.
 *
 * The dest-in blend mode:
 * - Keeps destination pixels (the photo) only where source pixels (mask) overlap
 * - Result alpha = dest_alpha * source_alpha
 * - For VECTOR masks, the SVG has 100% opacity where fill exists
 */

import sharp from "sharp";

export async function applyVectorMask(
  targetImagePath: string,
  maskSvgContent: string,
  outputPath: string,
  alignment: AlignedAssets
): Promise<void> {
  // Step 1: Create canvas with mask dimensions
  const canvas = sharp({
    create: {
      width: alignment.compositeDimensions.width,
      height: alignment.compositeDimensions.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Step 2: Rasterize SVG mask to get the matte
  const maskBuffer = Buffer.from(maskSvgContent);
  const maskImage = sharp(maskBuffer).resize(
    alignment.compositeDimensions.width,
    alignment.compositeDimensions.height
  );

  // Step 3: Composite target onto canvas with offset
  const targetImage = sharp(targetImagePath);
  const composited = await canvas
    .composite([
      {
        input: await targetImage.toBuffer(),
        left: alignment.targetOffset.x,
        top: alignment.targetOffset.y,
      },
    ])
    .toBuffer();

  // Step 4: Apply mask using dest-in blend mode
  const masked = await sharp(composited).composite([
    {
      input: await maskImage.toBuffer(),
      blend: "dest-in",
    },
  ]);

  // Step 5: Crop to effective render bounds
  const effectiveBounds = calculateEffectiveBounds(alignment);
  await masked
    .extract({
      left: effectiveBounds.left,
      top: effectiveBounds.top,
      width: effectiveBounds.width,
      height: effectiveBounds.height,
    })
    .toFile(outputPath);
}

/**
 * Calculate effective render bounds by intersecting
 * all mask bounds to eliminate empty whitespace
 */
function calculateEffectiveBounds(
  alignment: AlignedAssets
): { left: number; top: number; width: number; height: number } {
  // For now, return full mask bounds
  // TODO: Implement intersection of mask chain for nested masks
  return {
    left: 0,
    top: 0,
    width: alignment.compositeDimensions.width,
    height: alignment.compositeDimensions.height,
  };
}
```

#### 1.4 Luminance Mask Support

**Enhancement to `mask-compositor.ts`**

```typescript
/**
 * Apply LUMINANCE mask type
 *
 * Uses brightness of mask pixel to determine opacity:
 * A_final = A_target * (0.2126*R + 0.7152*G + 0.0722*B)
 */
export async function applyLuminanceMask(
  targetImagePath: string,
  maskImagePath: string,
  outputPath: string,
  alignment: AlignedAssets
): Promise<void> {
  // Step 1: Convert mask to grayscale using luminance formula
  const grayMask = await sharp(maskImagePath)
    .greyscale() // Uses Rec. 601 luma: 0.299*R + 0.587*G + 0.114*B
    .toBuffer();

  // Step 2: Create alpha channel from grayscale
  const maskAlpha = await sharp(grayMask)
    .ensureAlpha()
    .extractChannel(0) // Extract the gray channel as alpha
    .toBuffer();

  // Step 3: Apply to target
  await sharp(targetImagePath)
    .joinChannel(maskAlpha, { raw: { width: alignment.compositeDimensions.width, height: alignment.compositeDimensions.height, channels: 1 } })
    .toFile(outputPath);
}
```

#### 1.5 Integration with Download Pipeline

**Modification**: `src/images/downloader.ts`

```typescript
/**
 * Enhanced download with mask detection and compositing
 */
export async function downloadImagesWithMasks(
  items: Array<{ id: string; url: string }>,
  maskRelationships: MaskRelationship[],
  options: DownloadOptions
): Promise<DownloadResult[]> {
  // Group targets by their masks
  const targetsByMask = groupTargetsByMask(items, maskRelationships);

  // Download base images and masks
  const allItems = [
    ...items,
    ...maskRelationships.map((r) => ({ id: r.maskNodeId, url: getMaskUrl(r.maskNodeId) })),
  ];

  const baseDownloads = await downloadImages(allItems, options);

  // Apply mask compositing
  const compositedResults: DownloadResult[] = [];

  for (const relationship of maskRelationships) {
    const targetResult = baseDownloads.find((r) => r.id === relationship.targetNodeId);
    const maskResult = baseDownloads.find((r) => r.id === relationship.maskNodeId);

    if (targetResult && maskResult) {
      const alignment = alignCoordinateSpaces(
        maskResult.absoluteBoundingBox,
        targetResult.absoluteBoundingBox
      );

      const outputPath = targetResult.path.replace(".png", "-masked.png");

      if (relationship.maskType === "VECTOR") {
        await applyVectorMask(
          targetResult.path,
          maskSvgContent,
          outputPath,
          alignment
        );
      } else if (relationship.maskType === "LUMINANCE") {
        await applyLuminanceMask(
          targetResult.path,
          maskResult.path,
          outputPath,
          alignment
        );
      }

      compositedResults.push({
        ...targetResult,
        path: outputPath,
        width: alignment.compositeDimensions.width,
        height: alignment.compositeDimensions.height,
      });
    }
  }

  return compositedResults;
}
```

### Deliverables

| File | Purpose |
|------|---------|
| `src/images/mask-detector.ts` | Detect isMask nodes and sibling relationships |
| `src/images/coordinate-aligner.ts` | Normalize coordinate spaces for compositing |
| `src/images/mask-compositor.ts` | SVG matte compositing engine |
| `src/images/index.ts` | Export new mask handling APIs |
| `src/images/__tests__/mask-compositor.test.ts` | Unit tests for compositing logic |

### Success Criteria

> **📍 ROADMAP Reference**: [`ROADMAP.md - Improved mask/crop handling`](../ROADMAP.md#image--asset-handling)

| Checklist Item | Status | Test Case |
|----------------|--------|-----------|
| Circular avatars export correctly (not rectangular crops) | [ ] | `mask-compositor.test.ts` |
| Complex polygon masks render accurately | [ ] | `mask-compositor.test.ts` |
| Luminance masks apply brightness-based opacity | [ ] | `mask-compositor.test.ts` |
| Nested mask relationships detected (at least 2 levels) | [ ] | `mask-detector.test.ts` |
| Boundary detection eliminates empty whitespace | [ ] | `coordinate-aligner.test.ts` |

---

## Phase 2: Smart Format Detection

**Effort**: Medium
**Priority**: High
**Dependencies**: None

### Problem Statement

Current format detection relies solely on HTTP `content-type` headers, delegating all decisions to the Figma API which defaults to PNG. This results in:
- Photos exported as PNG-24 (5-10x larger than JPEG)
- Graphics suffering JPEG ringing artifacts
- No transparency-aware format selection
- No quality optimization based on content

### Root Cause Analysis

1. **No content analysis**: Files are accepted at face value without pixel analysis
2. **No transparency detection**: `isOpaque()` check never performed
3. **No entropy calculation**: Cannot distinguish photos from graphics
4. **Static encoder settings**: One-size-fits-all quality settings

### Technical Strategy: Entropy-Based Heuristics

Based on research, implement a three-gate decision system:
1. **Transparency Gate**: `sharp.stats().isOpaque`
2. **Entropy Gate**: Shannon entropy to detect photo vs graphic
3. **Palette Gate**: Unique color count for PNG-8 eligibility

#### 2.1 Content Analysis Engine

**New File**: `src/images/content-analyzer.ts`

```typescript
/**
 * Image content analysis for intelligent format selection
 *
 * Analyzes pixel data to determine optimal encoding format
 * based on transparency, entropy, and palette characteristics.
 */

import sharp from "sharp";

export interface ContentAnalysis {
  /** Image has transparency/alpha channel */
  hasTransparency: boolean;
  /** Shannon entropy (0-8 scale) */
  entropy: number;
  /** Estimated unique color count */
  uniqueColors: number;
  /** Image dimensions */
  dimensions: { width: number; height: number };
  /** Recommended format */
  recommendedFormat: "png" | "jpeg" | "webp" | "png8";
  /** Recommended quality setting (1-100) */
  recommendedQuality: number;
  /** Confidence in recommendation (0-1) */
  confidence: number;
}

/**
 * Analyze image content for format optimization
 *
 * Decision Matrix:
 * - hasTransparency = false → JPEG/WebP candidates
 * - hasTransparency = true → PNG/WebP candidates
 * - entropy > 6.0 → Photograph (use lossy)
 * - entropy < 4.5 → Graphic (use lossless or high-quality lossy)
 * - uniqueColors < 256 + small dimensions → PNG-8 candidate
 */
export async function analyzeImageContent(
  imageBuffer: Buffer
): Promise<ContentAnalysis> {
  const metadata = await sharp(imageBuffer).metadata();
  const stats = await sharp(imageBuffer).stats();

  const dimensions = {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };

  const hasTransparency = stats.isOpaque === false;
  const entropy = stats.entropy;
  const uniqueColors = await estimateUniqueColors(imageBuffer, dimensions);

  const recommendation = generateRecommendation({
    hasTransparency,
    entropy,
    uniqueColors,
    dimensions,
  });

  return {
    hasTransparency,
    entropy,
    uniqueColors,
    dimensions,
    ...recommendation,
  };
}

/**
 * Generate format recommendation based on heuristics
 */
function generateRecommendation(
  analysis: {
    hasTransparency: boolean;
    entropy: number;
    uniqueColors: number;
    dimensions: { width: number; height: number };
  }
): {
  recommendedFormat: "png" | "jpeg" | "webp" | "png8";
  recommendedQuality: number;
  confidence: number;
} {
  // Gate 1: Transparency
  if (analysis.hasTransparency) {
    // Has transparency - JPEG eliminated
    if (analysis.entropy > 6.0) {
      // Complex photo with transparency
      return { recommendedFormat: "webp", recommendedQuality: 85, confidence: 0.9 };
    }
    // Simple graphic with transparency
    return { recommendedFormat: "png", recommendedQuality: 100, confidence: 0.85 };
  }

  // Gate 2: Entropy (Photo vs Graphic)
  if (analysis.entropy > 6.0) {
    // High entropy = photograph
    return { recommendedFormat: "jpeg", recommendedQuality: 85, confidence: 0.95 };
  }

  // Gate 3: Palette size
  if (
    analysis.uniqueColors < 256 &&
    analysis.dimensions.width * analysis.dimensions.height < 512 * 512
  ) {
    // Small graphic with limited palette
    return { recommendedFormat: "png8", recommendedQuality: 100, confidence: 0.9 };
  }

  // Medium entropy graphic
  return { recommendedFormat: "png", recommendedQuality: 100, confidence: 0.7 };
}

/**
 * Estimate unique color count
 *
 * Note: Full color counting is expensive for large images.
 * This uses a sampling approach for performance.
 */
async function estimateUniqueColors(
  imageBuffer: Buffer,
  dimensions: { width: number; height: number }
): Promise<number> {
  const pixelCount = dimensions.width * dimensions.height;

  // Skip counting for large images (too expensive)
  if (pixelCount > 512 * 512) {
    return 256; // Assume full palette for large images
  }

  // Resize to tiny dimensions to get color palette estimate
  const { dominant } = await sharp(imageBuffer)
    .resize(32, 32, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Use stats for estimate (not perfect but fast)
  const stats = await sharp(imageBuffer).stats();
  return stats.channels.reduce((sum, channel) => sum + channel.distinct, 0) / 3;
}
```

#### 2.2 Format-Specific Optimization Settings

**New File**: `src/images/format-optimizer.ts`

```typescript
/**
 * Format-specific encoder settings optimization
 *
 * Tuned for balance between file size and generation speed
 * in high-throughput batch processing scenarios.
 */

import sharp from "sharp";

export interface EncoderSettings {
  format: "png" | "jpeg" | "webp";
  sharpOptions: sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions;
}

/**
 * Get optimized encoder settings based on content analysis
 */
export function getOptimizedSettings(
  analysis: ContentAnalysis
): EncoderSettings {
  switch (analysis.recommendedFormat) {
    case "jpeg":
      return {
        format: "jpeg",
        sharpOptions: optimizeJpegSettings(analysis),
      };

    case "png":
    case "png8":
      return {
        format: "png",
        sharpOptions: optimizePngSettings(analysis),
      };

    case "webp":
      return {
        format: "webp",
        sharpOptions: optimizeWebpSettings(analysis),
      };
  }
}

/**
 * JPEG optimization
 *
 * Key: Chroma subsampling control
 * - 4:2:0 (default): Color at 1/2 resolution (smallest, can bleed)
 * - 4:4:4: Full resolution color (larger, sharp edges)
 */
function optimizeJpegSettings(
  analysis: ContentAnalysis
): sharp.JpegOptions {
  // For graphics (low entropy), use 4:4:4 to prevent color bleed
  const chromaSubsampling = analysis.entropy < 4.5 ? "4:4:4" : "4:2:0";

  return {
    quality: analysis.recommendedQuality,
    chromaSubsampling,
    mozjpeg: true, // Better compression than standard libjpeg
  };
}

/**
 * PNG optimization
 *
 * Use adaptive filtering for better compression
 */
function optimizePngSettings(
  analysis: ContentAnalysis
): sharp.PngOptions {
  if (analysis.recommendedFormat === "png8") {
    return {
      palette: true,
      quality: analysis.recommendedQuality,
      compressionLevel: 9,
      effort: 7, // Balance between speed and size
    };
  }

  return {
    compressionLevel: 9,
    adaptiveFiltering: true,
    effort: 7,
  };
}

/**
 * WebP optimization
 *
 * Use smartSubsample for edge-aware encoding
 */
function optimizeWebpSettings(
  analysis: ContentAnalysis
): sharp.WebpOptions {
  return {
    quality: analysis.recommendedQuality,
    smartSubsample: true, // Detects sharp edges, reduces subsampling there
    effort: 4, // Higher values have diminishing returns
    minSize: true, // Minimize output size
  };
}
```

#### 2.3 Auto-Conversion Pipeline

**New File**: `src/images/auto-converter.ts`

```typescript
/**
 * Automatic format conversion pipeline
 *
 * Analyzes content and converts to optimal format
 */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { analyzeImageContent } from "./content-analyzer.js";
import { getOptimizedSettings } from "./format-optimizer.js";

export interface ConversionResult {
  originalPath: string;
  convertedPath: string;
  originalFormat: string;
  convertedFormat: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  analysis: ContentAnalysis;
}

/**
 * Convert image to optimal format
 */
export async function convertToOptimalFormat(
  inputPath: string,
  outputDir: string
): Promise<ConversionResult> {
  const inputBuffer = await sharp(inputPath).toBuffer();
  const originalMetadata = await sharp(inputPath).metadata();

  // Analyze content
  const analysis = await analyzeImageContent(inputBuffer);

  // Get optimized settings
  const settings = getOptimizedSettings(analysis);

  // Generate output path
  const basename = inputPath.split("/").pop()!.replace(/\.[^.]+$/, "");
  const outputPath = join(outputDir, `${basename}.${settings.format}`);

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Apply conversion
  let pipeline = sharp(inputPath);

  if (settings.format === "jpeg") {
    pipeline = pipeline.jpeg(settings.sharpOptions as sharp.JpegOptions);
  } else if (settings.format === "png") {
    pipeline = pipeline.png(settings.sharpOptions as sharp.PngOptions);
  } else if (settings.format === "webp") {
    pipeline = pipeline.webp(settings.sharpOptions as sharp.WebpOptions);
  }

  await pipeline.toFile(outputPath);

  // Get file sizes
  const fs = await import("node:fs/promises");
  const originalSize = (await fs.stat(inputPath)).size;
  const convertedSize = (await fs.stat(outputPath)).size;

  return {
    originalPath: inputPath,
    convertedPath: outputPath,
    originalFormat: originalMetadata.format || "unknown",
    convertedFormat: settings.format,
    originalSize,
    convertedSize,
    compressionRatio: convertedSize / originalSize,
    analysis,
  };
}
```

### Deliverables

| File | Purpose |
|------|---------|
| `src/images/content-analyzer.ts` | Entropy-based content analysis |
| `src/images/format-optimizer.ts` | Format-specific encoder settings |
| `src/images/auto-converter.ts` | Automatic conversion pipeline |
| `src/images/__tests__/content-analyzer.test.ts` | Unit tests for analysis logic |

### Success Criteria

> **📍 ROADMAP Reference**: [`ROADMAP.md - Smart format detection`](../ROADMAP.md#image--asset-handling)

| Checklist Item | Status | Test Case |
|----------------|--------|-----------|
| Photos (entropy > 6.0) converted to JPEG/WebP with 80%+ size reduction | [ ] | `auto-converter.test.ts` |
| Graphics (entropy < 4.5) preserved as PNG without artifacts | [ ] | `auto-converter.test.ts` |
| Transparency detected correctly (JPEG never selected) | [ ] | `content-analyzer.test.ts` |
| PNG-8 used for icons with <256 colors | [ ] | `format-optimizer.test.ts` |
| Chroma subsampling 4:4:4 used for low-entropy JPEG content | [ ] | `format-optimizer.test.ts` |

---

## Phase 3: Batch Processing & Concurrency

**Effort**: Medium
**Priority**: High
**Dependencies**: Phase 2 (for conversion integration)

### Problem Statement

Current batch processing has no concurrency control and downloads/processes images in an uncontrolled manner. This causes:
- Memory exhaustion with large file batches (500+ assets)
- Libuv thread pool saturation
- glibc memory fragmentation on Linux
- No streaming for large data structures

### Root Cause Analysis

1. **No concurrency limiting**: All images processed simultaneously
2. **Sharp cache enabled**: Holds large buffers in RAM unnecessarily
3. **Worker Thread anti-pattern**: Wrapping multi-threaded libvips in Workers
4. **No memory-aware batching**: Heap usage unchecked

### Technical Strategy: p-limit Stream Architecture

Based on research findings:
- **DO NOT** use Worker Threads (Sharp already multi-threaded via libvips)
- **DO** use p-limit for concurrency control
- **DO** disable Sharp cache for one-pass pipelines
- **DO** control libvips concurrency explicitly

#### 3.1 Dependency Installation

```bash
npm install p-limit
```

#### 3.2 Concurrency-Controlled Pipeline

**New File**: `src/images/batch-processor.ts`

```typescript
/**
 * Concurrency-controlled batch image processing
 *
 * Uses p-limit to prevent memory exhaustion and libuv thread
 * pool saturation during high-throughput batch operations.
 *
 * Based on research findings:
 * - Worker Threads are anti-pattern for Sharp (libvips already multi-threaded)
 * - Concurrency should match os.cpus().length
 * - Sharp cache should be disabled for one-pass pipelines
 */

import pLimit from "p-limit";
import os from "node:os";
import sharp from "sharp";

import { convertToOptimalFormat, ConversionResult } from "./auto-converter.js";

export interface BatchProcessingOptions {
  /** Output directory for converted images */
  outputDir: string;
  /** Max concurrent operations (default: CPU count) */
  concurrency?: number;
  /** Disable Sharp cache (recommended for batch) */
  disableCache?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Process image batch with controlled concurrency
 */
export async function processBatch(
  imagePaths: string[],
  options: BatchProcessingOptions
): Promise<ConversionResult[]> {
  const {
    outputDir,
    concurrency = os.cpus().length,
    disableCache = true,
    onProgress,
  } = options;

  // Disable Sharp cache for one-pass batch processing
  // (prevents holding large buffers in RAM unnecessarily)
  if (disableCache) {
    sharp.cache(false);
  }

  // Set libvips concurrency (only if not already limited by p-limit)
  // This prevents libvips from over-subscribing threads
  sharp.concurrency(1);

  // Create concurrency limiter
  const limit = pLimit(concurrency);

  // Create processing tasks
  const tasks = imagePaths.map((path) =>
    limit(async () => {
      const result = await convertToOptimalFormat(path, outputDir);

      if (onProgress) {
        const completed = results.length + 1;
        onProgress(completed, imagePaths.length);
      }

      return result;
    })
  );

  // Execute all tasks with concurrency control
  const results = await Promise.all(tasks);

  // Re-enable Sharp cache for subsequent operations
  sharp.cache(true);

  return results;
}

/**
 * Stream-based batch processing for very large datasets
 *
 * Processes images in chunks to avoid loading entire dataset
 * into memory at once.
 */
export async function processBatchStream(
  imagePathStream: AsyncIterable<string>,
  options: BatchProcessingOptions
): Promise<ConversionResult[]> {
  const {
    outputDir,
    concurrency = os.cpus().length,
    disableCache = true,
  } = options;

  if (disableCache) {
    sharp.cache(false);
  }
  sharp.concurrency(1);

  const limit = pLimit(concurrency);
  const results: ConversionResult[] = [];
  let completed = 0;

  for await (const path of imagePathStream) {
    const task = limit(async () => {
      const result = await convertToOptimalFormat(path, outputDir);
      completed++;

      if (options.onProgress) {
        options.onProgress(completed, -1); // -1 = unknown total
      }

      return result;
    });

    results.push(await task);
  }

  sharp.cache(true);

  return results;
}
```

#### 3.2 Download-Process Pipeline Integration

**New File**: `src/images/download-process-pipeline.ts`

```typescript
/**
 * Integrated download and processing pipeline
 *
 * Downloads images from Figma and converts to optimal format
 * in a single memory-aware operation.
 */

import { downloadImages } from "./downloader.js";
import { processBatch } from "./batch-processor.js";
import { mkdir } from "node:fs/promises";

export interface PipelineOptions {
  /** Temporary directory for raw downloads */
  tempDir: string;
  /** Final output directory for optimized images */
  outputDir: string;
  /** Download concurrency */
  downloadConcurrency?: number;
  /** Processing concurrency */
  processConcurrency?: number;
  /** Progress callbacks */
  onDownloadProgress?: (completed: number, total: number) => void;
  onProcessProgress?: (completed: number, total: number) => void;
}

export interface PipelineResult {
  downloadResults: Awaited<ReturnType<typeof downloadImages>>;
  conversionResults: Awaited<ReturnType<typeof processBatch>>;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  overallCompressionRatio: number;
}

/**
 * Execute full pipeline: download → convert → cleanup
 */
export async function executePipeline(
  items: Array<{ id: string; url: string }>,
  options: PipelineOptions
): Promise<PipelineResult> {
  // Create directories
  await mkdir(options.tempDir, { recursive: true });
  await mkdir(options.outputDir, { recursive: true });

  // Phase 1: Download raw images
  const downloadResults = await downloadImages(items, {
    outputDir: options.tempDir,
    parallel: options.downloadConcurrency,
    progress: options.onDownloadProgress
      ? {
          start: (total) => options.onDownloadProgress!(0, total),
          increment: () => {
            // Track completed count
          },
          complete: () => {},
        }
      : undefined,
  });

  // Filter successful downloads
  const successfulPaths = downloadResults
    .filter((r) => r.success)
    .map((r) => r.path);

  // Phase 2: Convert to optimal format
  const conversionResults = await processBatch(successfulPaths, {
    outputDir: options.outputDir,
    concurrency: options.processConcurrency,
    onProgress: options.onProcessProgress,
  });

  // Phase 3: Cleanup temporary files
  const fs = await import("node:fs/promises");
  for (const path of successfulPaths) {
    await fs.unlink(path).catch(() => {}); // Ignore errors
  }

  // Calculate statistics
  const totalOriginalSize = conversionResults.reduce(
    (sum, r) => sum + r.originalSize,
    0
  );
  const totalOptimizedSize = conversionResults.reduce(
    (sum, r) => sum + r.convertedSize,
    0
  );

  return {
    downloadResults,
    conversionResults,
    totalOriginalSize,
    totalOptimizedSize,
    overallCompressionRatio: totalOptimizedSize / totalOriginalSize,
  };
}
```

### Deliverables

| File | Purpose |
|------|---------|
| `src/images/batch-processor.ts` | p-limit controlled batch processing |
| `src/images/download-process-pipeline.ts` | Integrated download+convert pipeline |
| `src/images/__tests__/batch-processor.test.ts` | Concurrency control tests |

### Success Criteria

> **📍 ROADMAP Reference**: [`ROADMAP.md - Batch processing & concurrency`](../ROADMAP.md#image--asset-handling)

| Checklist Item | Status | Test Case |
|----------------|--------|-----------|
| Processing 500+ images without memory exhaustion | [ ] | `batch-processor.test.ts` |
| Stable heap usage (no memory leaks) | [ ] | `batch-processor.test.ts` |
| CPU utilization matches concurrency limit | [ ] | `batch-processor.test.ts` |
| Sharp cache properly disabled for batch operations | [ ] | `batch-processor.test.ts` |
| Stream processing handles 1000+ image datasets | [ ] | `batch-processor.test.ts` |

---

## Phase 4: Vector Optimization

**Effort**: High
**Priority**: Medium
**Dependencies**: None

### Problem Statement

Current SVG handling only does container collapsing. Raw Figma SVG exports contain:
- Excessive metadata (data-figma-id, editor attributes)
- Redundant groups and transforms
- Non-canonical structures preventing deduplication
- No minification or optimization

### Root Cause Analysis

1. **No SVGO integration**: Raw exports used directly
2. **No deduplication**: Same icon stored multiple times
3. **No canonicalization**: Identical vectors have different hashes due to IDs/positions
4. **No sprite generation**: N separate HTTP requests instead of 1

### Technical Strategy: Structural Deduplication + SVGO

#### 4.1 Dependency Installation

```bash
npm install svgo
```

#### 4.2 SVG Canonicalization

**New File**: `src/vectors/canonicalizer.ts`

```typescript
/**
 * SVG canonicalization for content-addressable storage
 *
 * Normalizes SVGs to enable structural deduplication by:
 * 1. Removing non-rendering attributes (id, data-figma-id)
 * 2. Sorting attributes alphabetically
 * 3. Normalizing whitespace and transforms
 * 4. Converting shapes to paths (optional)
 */

import { parse, SVGAst } from "svg-parser";

export interface CanonicalizedSVG {
  /** Canonicalized SVG string */
  svg: string;
  /** SHA-256 hash of canonical content */
  hash: string;
  /** Original ID from Figma node */
  originalId: string;
}

/**
 * Canonicalize SVG for content-based deduplication
 */
export async function canonicalizeSvg(
  svgContent: string,
  originalId: string
): Promise<CanonicalizedSVG> {
  // Parse SVG to AST
  const ast = parse(svgContent);

  // Normalize the AST
  const normalized = normalizeAst(ast);

  // Serialize back to string
  const canonical = serialize(normalized);

  // Compute hash
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");

  return {
    svg: canonical,
    hash,
    originalId,
  };
}

/**
 * Normalize SVG AST
 */
function normalizeAst(ast: SVGAst): SVGAst {
  // Remove non-rendering attributes
  // Sort attributes alphabetically
  // Normalize whitespace
  // (Implementation depends on svg-parser or similar library)
  return ast;
}

/**
 * Serialize AST to string
 */
function serialize(ast: SVGAst): string {
  // (Implementation depends on AST structure)
  return "";
}
```

#### 4.3 Content-Addressable Deduplication

**New File**: `src/vectors/deduplicator.ts`

```typescript
/**
 * Content-addressable SVG deduplication
 *
 * Maintains a registry of SVG hashes to eliminate duplicate
 * assets across large component libraries.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";

import { canonicalizeSvg, CanonicalizedSVG } from "./canonicalizer.js";

export interface DeduplicationResult {
  /** All processed SVGs (deduplicated) */
  svgs: CanonicalizedSVG[];
  /** Number of duplicates found */
  duplicateCount: number;
  /** Space saved by deduplication (bytes) */
  spaceSaved: number;
  /** Deduplication registry (hash → filepath) */
  registry: Map<string, string>;
}

export interface DeduplicationOptions {
  /** Output directory for unique SVGs */
  outputDir: string;
  /** Whether to create symlinks for duplicates */
  createSymlinks?: boolean;
  /** Progress callback */
  onProgress?: (current: number, total: number) => void;
}

/**
 * Deduplicate SVGs by content hash
 */
export async function deduplicateSvgs(
  svgContents: Array<{ content: string; nodeId: string }>,
  options: DeduplicationOptions
): Promise<DeduplicationResult> {
  await mkdir(options.outputDir, { recursive: true });

  const registry = new Map<string, string>();
  const uniqueSvgs: CanonicalizedSVG[] = [];
  let duplicateCount = 0;
  let spaceSaved = 0;

  for (let i = 0; i < svgContents.length; i++) {
    const { content, nodeId } = svgContents[i];

    // Canonicalize
    const canonical = await canonicalizeSvg(content, nodeId);

    // Check if already exists
    if (registry.has(canonical.hash)) {
      // Duplicate found
      duplicateCount++;
      spaceSaved += content.length;

      if (options.createSymlinks) {
        const existingPath = registry.get(canonical.hash)!;
        const linkPath = join(options.outputDir, `${nodeId}.svg`);
        await symlink(existingPath, linkPath);
      }
    } else {
      // Unique SVG - save to disk
      const filename = `${canonical.hash}.svg`;
      const filepath = join(options.outputDir, filename);
      await writeFile(filepath, canonical.svg, "utf-8");

      registry.set(canonical.hash, filepath);
      uniqueSvgs.push(canonical);
    }

    if (options.onProgress) {
      options.onProgress(i + 1, svgContents.length);
    }
  }

  return {
    svgs: uniqueSvgs,
    duplicateCount,
    spaceSaved,
    registry,
  };
}
```

#### 4.4 SVGO Integration

**New File**: `src/vectors/optimizer.ts`

```typescript
/**
 * SVG optimization with SVGO
 *
 * Configured specifically for Figma exports with critical
 * plugins to preserve viewBox and enable CSS responsiveness.
 */

import { optimize } from "svgo";

export interface SvgOptimizationOptions {
  /** Preserve viewBox (CRITICAL for responsive SVGs) */
  preserveViewBox?: boolean;
  /** Convert shapes to paths (enables uniform CSS styling) */
  convertShapesToPaths?: boolean;
  /** Prefix IDs to prevent DOM collisions */
  prefixIds?: boolean;
  /** Remove non-rendering elements */
  removeNonRendering?: boolean;
}

/**
 * Default SVGO config for Figma exports
 */
const DEFAULT_SVGO_CONFIG = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // CRITICAL: Never remove viewBox (breaks CSS responsiveness)
          removeViewBox: false,

          // Enable shape-to-path conversion
          convertShapeToPath: true,

          // Prefix IDs to prevent collisions when multiple SVGs on page
          prefixIds: true,

          // Remove editor metadata
          removeEditorsNSData: true,
          removeEmptyAttrs: true,
          removeHiddenElems: true,
        },
      },
    },
  ],
};

/**
 * Optimize SVG with SVGO
 */
export function optimizeSvg(
  svgContent: string,
  options: SvgOptimizationOptions = {}
): string {
  const config = { ...DEFAULT_SVGO_CONFIG };

  // Apply overrides
  if (options.preserveViewBox === false) {
    // Only allow explicit removal (default is preserve)
    config.plugins[0].params.overrides.removeViewBox = true;
  }

  const result = optimize(svgContent, config);

  return result.data;
}

/**
 * Batch optimize SVGs
 */
export async function optimizeSvgBatch(
  svgContents: string[],
  options?: SvgOptimizationOptions
): Promise<string[]> {
  return Promise.all(svgContents.map((svg) => optimizeSvg(svg, options)));
}
```

#### 4.5 Sprite Generation

**New File**: `src/vectors/sprite-generator.ts`

```typescript
/**
 * SVG sprite generation
 *
 * Combines deduplicated SVGs into a single sprite sheet using
 * the <symbol> syntax for optimal network performance.
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CanonicalizedSVG } from "./canonicalizer.js";

export interface SpriteOptions {
  /** Output sprite file path */
  outputPath: string;
  /** Symbol ID prefix (default: "icon") */
  idPrefix?: string;
  /** Include aria-label for accessibility */
  includeAriaLabels?: boolean;
}

/**
 * Generate SVG sprite sheet
 *
 * Creates a single SVG file with <symbol> elements for each
 * unique SVG, reducing HTTP overhead from N requests to 1.
 */
export async function generateSprite(
  svgs: CanonicalizedSVG[],
  options: SpriteOptions
): Promise<void> {
  const { outputPath, idPrefix = "icon", includeAriaLabels = true } = options;

  // Build sprite content
  let spriteContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  spriteContent += `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n`;

  for (const svg of svgs) {
    const symbolId = `${idPrefix}-${svg.hash.substring(0, 12)}`;

    // Extract viewBox and content from SVG
    const { viewBox, content } = extractSymbolContent(svg.svg);

    spriteContent += `  <symbol id="${symbolId}" viewBox="${viewBox}"`;

    if (includeAriaLabels) {
      spriteContent += ` role="img" aria-label="${svg.originalId}"`;
    }

    spriteContent += `>\n`;
    spriteContent += `    ${content}\n`;
    spriteContent += `  </symbol>\n`;
  }

  spriteContent += `</svg>`;

  await writeFile(outputPath, spriteContent, "utf-8");
}

/**
 * Extract viewBox and content from SVG
 */
function extractSymbolContent(svg: string): {
  viewBox: string;
  content: string;
} {
  // Parse viewBox attribute
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";

  // Extract content between <svg> tags
  const contentMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const content = contentMatch ? contentMatch[1].trim() : svg;

  return { viewBox, content };
}

/**
 * Generate sprite usage documentation
 */
export function generateSpriteUsageDocumentation(
  spritePath: string,
  svgs: CanonicalizedSVG[],
  idPrefix: string = "icon"
): string {
  let doc = `# SVG Sprite Usage\n\n`;
  doc += `Sprite file: \`${spritePath}\`\n\n`;
  doc += `## Include in HTML\n\n`;
  doc += `\`\`\`html\n`;
  doc += `<body>\n`;
  doc += `  ${svgs.map(() => "").join("")}\n`;
  doc += `  <script>\n`;
  doc += `    // Inject sprite at top of body\n`;
  doc += `    fetch("${spritePath}")\n`;
  doc += `      .then(r => r.text())\n`;
  doc += `      .then(svg => document.body.insertAdjacentHTML("afterbegin", svg));\n`;
  doc += `  </script>\n`;
  doc += `</body>\n`;
  doc += `\`\`\`\n\n`;
  doc += `## Use Icons\n\n`;
  doc += `\`\`\`html\n`;
  doc += `<svg class="icon" width="24" height="24">\n`;
  doc += `  <use href="#${idPrefix}-HASH"></use>\n`;
  doc += `</svg>\n`;
  doc += `\`\`\`\n\n`;
  doc += `### Available Icons\n\n`;
  doc += `| Hash | Original ID |\n`;
  doc += `|------|------------|\n`;
  for (const svg of svgs) {
    const shortHash = svg.hash.substring(0, 12);
    doc += `| \`${shortHash}\` | ${svg.originalId} |\n`;
  }

  return doc;
}
```

### Deliverables

| File | Purpose |
|------|---------|
| `src/vectors/canonicalizer.ts` | SVG canonicalization for hashing |
| `src/vectors/deduplicator.ts` | Content-addressable deduplication |
| `src/vectors/optimizer.ts` | SVGO integration with Figma-safe config |
| `src/vectors/sprite-generator.ts` | Sprite sheet generation |
| `src/vectors/index.ts` | Export vector APIs |
| `src/vectors/__tests__/deduplicator.test.ts` | Deduplication tests |

### Success Criteria

> **📍 ROADMAP Reference**: [`ROADMAP.md - Vector optimization`](../ROADMAP.md#image--asset-handling)

| Checklist Item | Status | Test Case |
|----------------|--------|-----------|
| Identical SVGs detected regardless of ID/position differences | [ ] | `deduplicator.test.ts` |
| SVGO optimization reduces file size by 30%+ average | [ ] | `optimizer.test.ts` |
| viewBox never removed (CSS responsiveness preserved) | [ ] | `optimizer.test.ts` |
| Sprite sheet reduces HTTP requests from N to 1 | [ ] | `sprite-generator.test.ts` |
| Deduplication achieves 50%+ reduction in icon libraries | [ ] | `deduplicator.test.ts` |

---

## Phase 5: Testing & Validation

**Effort**: Medium
**Priority**: High
**Dependencies**: Phases 1-4

### Test Coverage Requirements

| Area | Target Coverage | Key Test Scenarios |
|------|-----------------|-------------------|
| **Mask Compositing** | 80%+ | Circular masks, polygon masks, nested masks, luminance masks |
| **Format Detection** | 85%+ | Photos, graphics, mixed content, edge cases |
| **Batch Processing** | 75%+ | Concurrency control, memory limits, error handling |
| **Vector Optimization** | 80%+ | Deduplication, SVGO config, sprite generation |

### Test Fixtures Required

```
tests/fixtures/
├── masks/
│   ├── circular-avatar.fig           # Figma file with circular masks
│   ├── polygon-mask.fig              # Complex polygon mask
│   ├── nested-masks.fig              # Mask within mask
│   └── luminance.fig                 # Luminance mask example
├── formats/
│   ├── photo-high-entropy.jpg        # High entropy photograph
│   ├── graphic-low-entropy.png       # Low entropy graphic
│   ├── transparent-bg.png            # Image with transparency
│   └── mixed.fig                     # Mixed content types
├── batch/
│   ├── large-design-system.fig       # 500+ asset file
│   └── memory-test.fig               # Memory pressure test
└── vectors/
    ├── icon-duplicates.fig           # Same icon, multiple instances
    ├── complex-vectors.fig           # Path-heavy vectors
    └── sprite-test.fig               # Icon set for sprite generation
```

### Validation Tests

**New File**: `src/images/__tests__/integration.test.ts`

```typescript
/**
 * Integration tests for asset handling improvements
 */

describe("Asset Handling Integration", () => {
  describe("Mask Compositing", () => {
    it("should correctly apply circular mask to photo", async () => {
      // Test circular avatar export
    });

    it("should handle polygon masks accurately", async () => {
      // Test complex vector masks
    });

    it("should detect and apply sibling stencil masks", async () => {
      // Test isMask sibling detection
    });
  });

  describe("Smart Format Detection", () => {
    it("should convert photos to JPEG with 80%+ size reduction", async () => {
      // Test entropy-based format selection
    });

    it("should preserve graphics as PNG without artifacts", async () => {
      // Test low entropy detection
    });

    it("should never select JPEG for transparent images", async () => {
      // Test transparency gate
    });
  });

  describe("Batch Processing", () => {
    it("should handle 500+ images without memory exhaustion", async () => {
      // Test concurrency control
    });

    it("should maintain stable heap usage", async () => {
      // Test memory leak detection
    });
  });

  describe("Vector Optimization", () => {
    it("should deduplicate identical SVGs", async () => {
      // Test content-addressable hashing
    });

    it("should preserve viewBox after SVGO", async () => {
      // Test viewBox preservation
    });

    it("should generate valid sprite sheets", async () => {
      // Test sprite generation
    });
  });
});
```

---

## Dependencies & Integration

### New Dependencies Required

```json
{
  "dependencies": {
    "p-limit": "^5.0.0",
    "svgo": "^3.2.0",
    "svg-parser": "^2.0.0"
  },
  "devDependencies": {
    "@types/svg-parser": "^2.0.0"
  }
}
```

### Existing Files to Modify

| File | Modifications |
|------|---------------|
| `src/images/index.ts` | Export new mask handling, batch processing, format detection APIs |
| `src/client/index.ts` | Integrate mask detection into `downloadImages()` method |
| `src/extractors/built-in.ts` | Pass mask metadata to download pipeline |
| `package.json` | Add new dependencies, update exports |

### API Changes

**New Client Methods**:

```typescript
// Enhanced download with mask support
client.downloadImages({
  fileKey,
  ids: ["node1", "node2"],
  options: {
    detectMasks: true,        // Enable mask compositing
    smartFormat: true,        // Enable auto format conversion
    outputDir: "./assets",
  },
});

// Batch processing with concurrency control
client.processBatch({
  imagePaths: ["img1.png", "img2.png"],
  concurrency: 8,
  disableCache: true,
});

// Vector deduplication
client.deduplicateVectors({
  svgContents: [...],
  outputDir: "./icons",
  createSymlinks: true,
});
```

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **SVG mask rasterization artifacts** | High | Medium | Test with Figma's own SVG exports; verify dest-in blend mode accuracy |
| **SVGO viewBox removal** | Critical | Low | Explicitly set `removeViewBox: false`; add validation tests |
| **Memory fragmentation on Linux** | High | Medium | Document jemalloc recommendation; add glibc detection warning |
| **Sharp Worker Thread conflicts** | Medium | Low | Document why NOT to use Workers; add architecture notes |
| **Entropy calculation performance** | Medium | Medium | Gate expensive operations; add dimension thresholds |
| **False positive mask detection** | Medium | Low | Validate isMask detection against Figma Plugin API behavior |

### Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking changes to existing API** | High | Low | Add new methods alongside existing; deprecate old methods gradually |
| **Increased dependency size** | Low | High | p-limit (~1KB), svgo (~200KB) - acceptable trade-off |
| **Test fixture file access** | Medium | Medium | Mock Figma API responses; avoid requiring live Figma files for CI |

---

## Implementation Order

### Sprint 1: Foundation (Week 1-2)
1. Install dependencies
2. Implement `content-analyzer.ts` with entropy calculation
3. Implement `format-optimizer.ts` with format-specific settings
4. Add unit tests for content analysis

### Sprint 2: Mask Detection (Week 2-3)
1. Implement `mask-detector.ts` for isMask sibling detection
2. Implement `coordinate-aligner.ts` for bounding box alignment
3. Add tests for mask relationship detection

### Sprint 3: Mask Compositing (Week 3-4)
1. Implement `mask-compositor.ts` with SVG matte technique
2. Implement luminance mask support
3. Add integration tests for various mask types
4. Integration with download pipeline

### Sprint 4: Batch Processing (Week 4-5)
1. Implement `batch-processor.ts` with p-limit
2. Implement `download-process-pipeline.ts`
3. Add memory usage tests
4. Sharp cache integration

### Sprint 5: Vector Optimization (Week 5-6)
1. Implement SVG canonicalization
2. Implement content-addressable deduplication
3. Integrate SVGO with Figma-safe config
4. Implement sprite generation
5. Add vector optimization tests

### Sprint 6: Integration & Documentation (Week 6-7)
1. Update client API methods
2. Update type definitions
3. Add API documentation with JSDoc
4. Create migration guide
5. Performance benchmarking

---

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| **Mask Compositing Speed** | N/A | <500ms per mask |
| **Format Conversion Speed** | N/A | 1000 images/100ms |
| **Batch Memory Usage** | Unbounded | <10MB per 1000 nodes |
| **SVG Minification** | 0% | 30-60% size reduction |
| **Vector Deduplication** | 0% | 50%+ reduction in icon sets |
| **HTTP Requests (Sprites)** | N | 1 (from N) |

---

## Success Metrics

> **📍 ROADMAP Reference**: These metrics correspond to the checklist items in [`ROADMAP.md - Image & Asset Handling`](../ROADMAP.md#image--asset-handling). All items are currently **unchecked** as work has not yet begun.

### Phase 1: Mask/Crop Handling
- [ ] Circular avatar exports match Figma rendering
- [ ] Complex polygon masks render accurately
- [ ] Luminance masks apply correct opacity
- [ ] Nested mask relationships detected (2+ levels)
- [ ] Boundary detection eliminates whitespace

### Phase 2: Smart Format Detection
- [ ] Photos achieve 80%+ size reduction via JPEG/WebP
- [ ] Graphics preserved without JPEG artifacts
- [ ] Transparency detected correctly (100% accuracy)
- [ ] PNG-8 used for eligible icons
- [ ] Format selection matches human judgment in 90%+ cases

### Phase 3: Batch Processing
- [ ] Process 500+ images without OOM
- [ ] Stable heap usage (no leaks)
- [ ] CPU utilization matches concurrency limit
- [ ] Sharp cache disabled for batch operations

### Phase 4: Vector Optimization
- [ ] Identical SVGs detected via content hashing
- [ ] SVGO achieves 30%+ size reduction
- [ ] viewBox preserved in 100% of exports
- [ ] Sprite reduces HTTP requests from N to 1

---

## Open Questions

1. **Figma API mask format**: Does the REST API provide mask nodes as separate downloadable assets? Or must we construct SVG exports from node data?

2. **Transform composition**: How do we handle masks with rotation + scale + translation simultaneously? Does Figma's SVG export include these transforms?

3. **Luminance mask source**: Are luminance masks provided as raster images or can we get the source SVG?

4. **Nested mask performance**: For deeply nested masks (5+ levels), should we use Figma's pre-rendered group export instead of recursive compositing?

5. **SVG parser choice**: `svg-parser` vs `svgo` built-in parsing vs custom regex - which offers best performance/accuracy trade-off?

---

## Appendix: Research Sources

Based on the comprehensive research provided:

1. **SVG Matte Compositing**: NodeJS image processing with polygon masks - StackOverflow
2. **Sharp Composite API**: Sharp composite documentation - pixelplumbing.com
3. **Entropy Analysis**: Sharp stats API - pixelplumbing.com
4. **Memory Fragmentation**: Preventing Memory Issues in Node.js Sharp - Brand.dev
5. **Concurrency Control**: p-limit documentation - GitHub
6. **Content Hashing**: Efficient file deduplication with SHA-256 - Transloadit
7. **SVGO Configuration**: Exporting SVG Icons in Production - Simple Thread
8. **Figma isMask**: Figma Plugin API docs - developers.figma.com
9. **Figma MaskType**: Figma Plugin API docs - developers.figma.com
10. **Worker Threads Anti-pattern**: Handling 100k+ records - Reddit discussion

---

*This plan is a living document and will be updated as implementation progresses and new insights are discovered.*
