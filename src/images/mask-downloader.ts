/**
 * Mask-aware image downloader - Extend downloader for mask compositing
 *
 * Downloads images and applies mask compositing when masks are detected.
 * Gracefully handles errors by falling back to original downloads.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ProgressEmitter } from "@/streaming/progress-emitter";

import type { DownloadOptions, DownloadResult } from "./downloader";
import {
  type AlignedAssets,
  alignCoordinateSpaces,
  type BoundingBox,
} from "./index";
import type { MaskRelationship } from "./mask-detector";
import {
  applyVectorMask,
  applyLuminanceMask,
  type CompositeOptions,
} from "./mask-compositor";

// Re-export MaskRelationship for convenience
export type { MaskRelationship };

// =====================================================
// Type Definitions
// =====================================================

/**
 * Mask download options extending base download options
 */
export interface MaskDownloadOptions extends DownloadOptions {
  /** Disable mask detection and compositing (default: true/enabled) */
  enableMasks?: boolean;
  /** Output suffix for masked images (default: "-masked") */
  maskedSuffix?: string;
}

/**
 * Mask download result extending base download result
 */
export interface MaskDownloadResult extends DownloadResult {
  /** Whether mask was applied */
  hasMask?: boolean;
  /** Mask type if applied */
  maskType?: "ALPHA" | "VECTOR" | "LUMINANCE";
}

/**
 * Item with mask relationship information
 */
interface ItemWithMask {
  id: string;
  url: string;
  path: string;
  maskRelationship?: MaskRelationship;
}

// =====================================================
// Mask Download Functions
// =====================================================

/**
 * Download images with mask compositing
 *
 * Downloads images and applies mask compositing when mask relationships exist.
 * Gracefully skips mask compositing on error, falling back to original download.
 *
 * @param items - Items to download with optional mask relationships
 * @param maskRelationships - Mask relationships detected from Figma
 * @param options - Download options (includes progress in options.progress)
 * @returns Download results with mask status
 */
export async function downloadImagesWithMasks(
  items: Array<{ id: string; url: string }>,
  maskRelationships: MaskRelationship[],
  options: MaskDownloadOptions
): Promise<MaskDownloadResult[]> {
  const {
    outputDir,
    parallel = 5,
    timeout = 5000,
    enableMasks = true,
    maskedSuffix = "-masked",
    progress,
  } = options;

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Create map of target IDs to their mask relationships
  const maskMap = new Map<string, MaskRelationship>();
  for (const rel of maskRelationships) {
    maskMap.set(rel.targetNodeId, rel);
  }

  // Group items by mask for efficient processing
  const groupedItems = groupTargetsByMask(items, maskMap);

  // Start progress tracking
  if (progress) {
    progress.start(items.length, "downloading with masks");
  }

  const results: MaskDownloadResult[] = [];
  let processed = 0;

  // Process each item
  for (const item of items) {
    const maskRel = maskMap.get(item.id);
    const hasMask = !!maskRel;

    try {
      if (hasMask && enableMasks) {
        // Download with mask compositing
        const result = await downloadWithMaskCompositing(
          item,
          maskRel!,
          outputDir,
          maskedSuffix,
          parallel,
          timeout
        );
        results.push(result);
      } else {
        // Regular download without mask
        const regularResult = await downloadSingle(item, outputDir, parallel, timeout);
        results.push({
          ...regularResult,
          hasMask: false,
        });
      }
    } catch (error) {
      // On mask compositing error, fall back to regular download
      if (hasMask && enableMasks) {
        console.warn(
          `Mask compositing failed for ${item.id}, falling back to original:`,
          error
        );
        try {
          const regularResult = await downloadSingle(
            item,
            outputDir,
            parallel,
            timeout
          );
          results.push({
            ...regularResult,
            success: true,
            hasMask: false,
          });
        } catch (fallbackError) {
          results.push({
            id: item.id,
            url: item.url,
            path: join(outputDir, `${item.id}.png`),
            success: false,
            error: fallbackError as Error,
            hasMask: false,
          });
        }
      } else {
        results.push({
          id: item.id,
          url: item.url,
          path: join(outputDir, `${item.id}.png`),
          success: false,
          error: error as Error,
          hasMask: false,
        });
      }
    }

    processed++;
    if (progress) {
      progress.increment();
    }
  }

  // Mark progress complete
  if (progress) {
    progress.complete();
  }

  return results;
}

/**
 * Group target nodes by their mask
 *
 * @param items - Items to group
 * @param maskMap - Map of target IDs to mask relationships
 * @returns Map of mask node IDs to arrays of target items
 */
export function groupTargetsByMask(
  items: Array<{ id: string; url: string }>,
  maskMap: Map<string, MaskRelationship>
): Map<string, Array<{ id: string; url: string }>> {
  const grouped = new Map<string, Array<{ id: string; url: string }>>();

  for (const item of items) {
    const maskRel = maskMap.get(item.id);
    if (maskRel) {
      const maskId = maskRel.maskNodeId;
      const existing = grouped.get(maskId) || [];
      existing.push(item);
      grouped.set(maskId, existing);
    } else {
      // Items without masks get grouped under a special key
      const noMaskKey = "__no_mask__";
      const existing = grouped.get(noMaskKey) || [];
      existing.push(item);
      grouped.set(noMaskKey, existing);
    }
  }

  return grouped;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Download a single image with mask compositing applied
 */
async function downloadWithMaskCompositing(
  item: { id: string; url: string },
  maskRel: MaskRelationship,
  outputDir: string,
  maskedSuffix: string,
  parallel: number,
  timeout: number
): Promise<MaskDownloadResult> {
  // First, download the original image
  const originalResult = await downloadSingle(item, outputDir, parallel, timeout);

  if (!originalResult.success) {
    return {
      ...originalResult,
      hasMask: false,
    };
  }

  // Calculate alignment for compositing
  const alignment = alignCoordinateSpaces(
    maskRel.maskBoundingBox || { x: 0, y: 0, width: 100, height: 100 },
    maskRel.targetBoundingBox || { x: 0, y: 0, width: 100, height: 100 }
  );

  // Prepare mask input (could be SVG or raster)
  // For now, we'll use a simple circular SVG as placeholder
  // In real implementation, this would come from Figma's export
  const maskSvg = generateMaskSvg(maskRel);

  const maskedPath = join(outputDir, `${item.id}${maskedSuffix}.png`);

  // Apply mask compositing
  try {
    const compositeResult = await applyMaskByType(
      originalResult.path,
      maskSvg,
      maskedPath,
      alignment,
      maskRel.maskType
    );

    return {
      id: item.id,
      url: item.url,
      path: maskedPath,
      success: true,
      width: compositeResult.width,
      height: compositeResult.height,
      hasMask: true,
      maskType: maskRel.maskType,
    };
  } catch (maskError) {
    // Mask compositing failed - return original result with hasMask=false
    console.warn(
      `Mask compositing failed for ${item.id}, returning original:`,
      maskError
    );
    return {
      ...originalResult,
      hasMask: false,
    };
  }
}

/**
 * Apply mask based on mask type
 */
async function applyMaskByType(
  targetPath: string,
  maskSvg: string,
  outputPath: string,
  alignment: AlignedAssets,
  maskType: "ALPHA" | "VECTOR" | "LUMINANCE"
): Promise<{ width: number; height: number }> {
  const compositeOptions: CompositeOptions = {
    targetImagePath: targetPath,
    maskInput: maskSvg,
    outputPath,
    alignment,
    maskType,
  };

  if (maskType === "LUMINANCE") {
    const result = await applyLuminanceMask(compositeOptions);
    return { width: result.width, height: result.height };
  } else {
    const result = await applyVectorMask(compositeOptions);
    return { width: result.width, height: result.height };
  }
}

/**
 * Download a single image (copied from downloader.ts)
 */
async function downloadSingle(
  item: { id: string; url: string },
  outputDir: string,
  parallel: number,
  timeout: number
): Promise<DownloadResult> {
  // Import the actual downloader function
  const { downloadImages } = await import("./downloader");
  const results = await downloadImages([item], { outputDir, parallel, timeout });
  return results[0];
}

/**
 * Generate a placeholder mask SVG
 * In production, this would come from Figma's SVG export
 */
function generateMaskSvg(maskRel: MaskRelationship): string {
  // Simple circular mask as placeholder
  const bbox = maskRel.maskBoundingBox || { x: 0, y: 0, width: 100, height: 100 };
  const centerX = bbox.width / 2;
  const centerY = bbox.height / 2;
  const radius = Math.min(bbox.width, bbox.height) / 2;

  return `<svg width="${bbox.width}" height="${bbox.height}" viewBox="0 0 ${bbox.width} ${bbox.height}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="black"/>
  </svg>`;
}
