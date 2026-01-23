/**
 * downloadAssets() - API Redesign Feature
 *
 * Downloads design assets in multiple formats with flexible configuration.
 * Supports SVG, PNG, JPG, WEBP with multiple scales and subdirectories.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { SimplifiedDesign, SimplifiedNode } from "@/extractors/types";

// =====================================================
// Type Definitions
// =====================================================

/**
 * Supported asset formats
 */
export type AssetFormat = "svg" | "png" | "jpg" | "webp";

/**
 * Configuration for a single asset format
 */
export interface AssetFormatConfig {
  /** Format to export */
  format: AssetFormat;
  /** Single scale (for PNG/JPG/WEBP) - 0.1 to 4 */
  scale?: number;
  /** Multiple scales (generates multiple files) */
  scales?: number[];
  /** Subdirectory within outputDir */
  subdir?: string;
}

/**
 * Options for downloadAssets
 */
export interface DownloadAssetsOptions {
  /** Output directory for downloaded assets */
  outputDir: string;
  /** Format configurations to download */
  formats: AssetFormatConfig[];
  /** Number of parallel downloads (default: 5) */
  parallel?: number;
}

/**
 * Result of a single asset download
 */
export interface DownloadedAsset {
  /** Format that was downloaded */
  format: AssetFormat;
  /** Scale (for PNG/JPG/WEBP) */
  scale?: number;
  /** Node ID */
  nodeId: string;
  /** Node path in hierarchy */
  nodePath: string;
  /** Relative path from output directory */
  relativePath: string;
  /** Absolute path on filesystem */
  absolutePath: string;
}

/**
 * Result of downloadAssets operation
 */
export interface DownloadAssetsResult {
  /** Successfully downloaded assets */
  downloaded: DownloadedAsset[];
  /** Failed downloads with error messages */
  failed: Array<{ nodeId: string; format: AssetFormat; error: string }>;
  /** Total number of assets requested */
  total: number;
}

// =====================================================
// Internal Types
// =====================================================

interface NodeWithPath {
  id: string;
  name: string;
  type: string;
  nodePath: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Detect which formats a node supports
 */
export function detectAssetFormats(node: SimplifiedNode): AssetFormat[] {
  const formats: AssetFormat[] = [];
  const type = node.type;

  // Vector nodes only support SVG export
  if (type === "VECTOR") {
    formats.push("svg");
    return formats;
  }

  // Frames, components, instances support all formats
  const exportableTypes = [
    "FRAME",
    "COMPONENT",
    "INSTANCE",
    "GROUP",
    "DOCUMENT",
    "PAGE",
    "SECTION",
    "SLICE",
  ];

  if (exportableTypes.includes(type)) {
    // SVG is supported by nodes with vector content
    formats.push("svg");
    // PNG, JPG, WEBP are supported by all exportable nodes
    formats.push("png", "jpg", "webp");
  }

  return formats;
}

/**
 * Generate download path for an asset
 */
export function generateDownloadPath(options: {
  outputDir: string;
  nodeId: string;
  nodePath: string;
  format: AssetFormat;
  scale?: number;
  subdir?: string;
}): string {
  const { outputDir, nodeId, nodePath, format, scale, subdir } = options;

  // Build base path
  const parts: string[] = [outputDir];

  if (subdir) {
    parts.push(subdir);
  }

  // Add node path if available
  if (nodePath) {
    parts.push(...nodePath.split("/"));
  } else {
    parts.push(nodeId);
  }

  // Generate filename
  const nodeName = parts[parts.length - 1];
  const sanitizedName = sanitizeName(nodeName);

  let filename = sanitizedName;

  // Add scale suffix for raster formats
  if (scale && format !== "svg") {
    filename = `${sanitizedName}@${scale}x`;
  }

  // Add extension
  filename = `${filename}.${format}`;

  // Replace last part with filename
  parts[parts.length - 1] = filename;

  return parts.join("/");
}

/**
 * Sanitize name for filesystem
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Collect all downloadable nodes from design with their paths
 */
export function getNodesForDownload(design: SimplifiedDesign): NodeWithPath[] {
  const result: NodeWithPath[] = [];

  function traverse(nodes: SimplifiedNode[], path: string[]) {
    for (const node of nodes) {
      const currentPath = [...path, node.name];

      // Add node if it supports export
      if (detectAssetFormats(node).length > 0) {
        result.push({
          id: node.id,
          name: node.name,
          type: node.type,
          nodePath: currentPath.join("/"),
        });
      }

      // Recurse into children
      if (node.children && node.children.length > 0) {
        traverse(node.children, currentPath);
      }
    }
  }

  traverse(design.nodes, []);

  return result;
}

/**
 * Ensure directory exists
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

// =====================================================
// Main Function
// =====================================================

/**
 * Download design assets in multiple formats
 *
 * This is the main entry point for the downloadAssets functionality.
 * It will be integrated into FigmaExtractor class as a method.
 */
export async function downloadAssets(
  design: SimplifiedDesign,
  options: DownloadAssetsOptions,
  getImageUrls: (
    ids: string[],
    format: AssetFormat,
    scale?: number
  ) => Promise<Map<string, string>>,
  downloadImage: (url: string, path: string) => Promise<void>
): Promise<DownloadAssetsResult> {
  const result: DownloadAssetsResult = {
    downloaded: [],
    failed: [],
    total: 0,
  };

  // Get all nodes that can be exported
  const nodes = getNodesForDownload(design);

  // Process each format configuration
  for (const formatConfig of options.formats) {
    const { format, scale, scales, subdir } = formatConfig;

    // Determine scales to process
    const scalesToProcess = scales || (scale !== undefined ? [scale] : []);

    // For each scale, process all nodes that support this format
    for (const s of scalesToProcess) {
      // Filter nodes that support this format
      const supportedNodes = nodes.filter((node) =>
        detectAssetFormats(node as unknown as SimplifiedNode).includes(format)
      );

      result.total += supportedNodes.length;

      // Create output directory
      const outputDir = subdir
        ? join(options.outputDir, subdir)
        : options.outputDir;
      await ensureDir(outputDir);

      // Download assets in parallel batches
      const parallel = options.parallel || 5;
      for (let i = 0; i < supportedNodes.length; i += parallel) {
        const batch = supportedNodes.slice(i, i + parallel);

        // Get image URLs for batch
        const nodeIds = batch.map((n) => n.id);
        const urls = await getImageUrls(nodeIds, format, s);

        // Download each asset
        await Promise.all(
          batch.map(async (node) => {
            const url = urls.get(node.id);
            if (!url) {
              result.failed.push({
                nodeId: node.id,
                format,
                error: "No URL returned",
              });
              return;
            }

            try {
              const relativePath = generateDownloadPath({
                outputDir: options.outputDir,
                nodeId: node.id,
                nodePath: node.nodePath,
                format,
                scale: s,
                subdir,
              });

              // Ensure subdirectories exist
              const dirPath = relativePath.substring(
                0,
                relativePath.lastIndexOf("/")
              );
              await ensureDir(dirPath);

              await downloadImage(url, relativePath);

              result.downloaded.push({
                format,
                scale: s,
                nodeId: node.id,
                nodePath: node.nodePath,
                relativePath,
                absolutePath: join(process.cwd(), relativePath),
              });
            } catch (error) {
              result.failed.push({
                nodeId: node.id,
                format,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          })
        );
      }
    }
  }

  return result;
}
