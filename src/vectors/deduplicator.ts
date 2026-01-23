/**
 * SVG Deduplicator - Content-addressable deduplication using SHA-256 hashes
 *
 * This module provides functionality to detect and deduplicate identical SVGs
 * regardless of their IDs, positions, or other non-rendering attributes.
 *
 * Phase 4: Vector Optimization
 */

import { promises as fs } from "node:fs";
import { canonicalizeSvg, type CanonicalizedSVG } from "./canonicalizer.js";
import type { ParsedSVG } from "./canonicalizer.js";

// =====================================================
// Types
// =====================================================

/**
 * Input for deduplication process
 */
export interface DeduplicationInput {
  /** SVG content */
  content: string;
  /** Node ID from Figma */
  nodeId: string;
  /** Optional original file path */
  filepath?: string;
}

/**
 * Result of deduplication process
 */
export interface DeduplicationResult {
  /** All processed SVGs (deduplicated) */
  svgs: CanonicalizedSVG[];
  /** Number of unique SVGs found */
  uniqueCount: number;
  /** Number of duplicates found */
  duplicateCount: number;
  /** Space saved by deduplication (bytes) */
  spaceSaved: number;
  /** Deduplication percentage */
  duplicatePercentage: number;
  /** Deduplication registry (hash → filepath) */
  registry: Map<string, string>;
}

/**
 * Options for deduplication
 */
export interface DeduplicationOptions {
  /** Output directory for unique SVGs */
  outputDir: string;
  /** Whether to create symlinks for duplicates (default: false) */
  createSymlinks?: boolean;
  /** Whether to canonicalize before hashing (default: true) */
  canonicalize?: boolean;
  /** Progress callback */
  onProgress?: (current: number, total: number, item: DeduplicationInput) => void;
}

/**
 * Group of duplicate SVGs
 */
export interface DuplicateGroup {
  /** Hash of the duplicate group */
  hash: string;
  /** Canonical SVG */
  canonical: CanonicalizedSVG;
  /** All instances (node IDs) */
  instances: string[];
}

// =====================================================
// Public API
// =====================================================

/**
 * Deduplicate SVGs using content-addressable storage
 *
 * This function:
 * 1. Canonicalizes each SVG (removes non-rendering attributes)
 * 2. Computes SHA-256 hash of canonical content
 * 3. Groups identical SVGs by hash
 * 4. Returns unique SVGs with metadata
 *
 * @param inputs - Array of SVG inputs with node IDs
 * @param options - Deduplication options
 * @returns Deduplication result
 */
export async function deduplicateSvgs(
  inputs: DeduplicationInput[],
  options: DeduplicationOptions
): Promise<DeduplicationResult> {
  const {
    outputDir,
    createSymlinks = false,
    canonicalize = true,
    onProgress,
  } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Step 1: Canonicalize all SVGs and compute hashes
  const canonicalMap = new Map<string, CanonicalizedSVG>();
  const hashToNodeId = new Map<string, string>();

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    onProgress?.(i + 1, inputs.length, input);

    // Canonicalize SVG
    const canonical = await canonicalizeSvg(input.content, input.nodeId);

    // Store canonical SVG by hash
    if (!canonicalMap.has(canonical.hash)) {
      canonicalMap.set(canonical.hash, canonical);
      hashToNodeId.set(canonical.hash, input.nodeId);
    }
  }

  // Step 2: Write unique SVGs to files and create registry
  const registry = new Map<string, string>();
  const uniqueSvgs: CanonicalizedSVG[] = [];
  let totalOriginalSize = 0;
  let totalUniqueSize = 0;

  for (const [hash, canonical] of canonicalMap.entries()) {
    // Use the first node ID as filename
    const filename = `${canonical.originalId}.svg`;
    const filepath = `${outputDir}/${filename}`;

    // Write unique SVG to file
    await fs.writeFile(filepath, canonical.svg, "utf8");
    registry.set(hash, filepath);

    uniqueSvgs.push(canonical);
    totalUniqueSize += canonical.svg.length;
  }

  // Calculate metrics
  totalOriginalSize = inputs.reduce((sum, input) => sum + input.content.length, 0);
  const spaceSaved = totalOriginalSize - totalUniqueSize;
  const duplicatePercentage =
    totalOriginalSize > 0 ? (spaceSaved / totalOriginalSize) * 100 : 0;
  const duplicateCount = inputs.length - uniqueSvgs.length;

  // Step 3: Optionally create symlinks for duplicates
  if (createSymlinks) {
    for (const input of inputs) {
      const canonical = await canonicalizeSvg(input.content, input.nodeId);
      const uniqueFilepath = registry.get(canonical.hash);
      if (!uniqueFilepath) continue;

      const linkPath = `${outputDir}/${input.nodeId}.svg`;
      try {
        await fs.symlink(uniqueFilepath, linkPath);
      } catch (error) {
        // Symlink creation might fail (e.g., on Windows without developer mode)
        // Ignore and continue
      }
    }
  }

  return {
    svgs: uniqueSvgs,
    uniqueCount: uniqueSvgs.length,
    duplicateCount,
    spaceSaved,
    duplicatePercentage,
    registry,
  };
}

/**
 * Find duplicate groups in SVG inputs
 *
 * @param inputs - Array of SVG inputs
 * @returns Array of duplicate groups
 */
export async function findDuplicateGroups(
  inputs: DeduplicationInput[]
): Promise<DuplicateGroup[]> {
  const hashToInstances = new Map<string, string[]>();

  // Group by hash
  for (const input of inputs) {
    const canonical = await canonicalizeSvg(input.content, input.nodeId);
    if (!hashToInstances.has(canonical.hash)) {
      hashToInstances.set(canonical.hash, []);
    }
    hashToInstances.get(canonical.hash)!.push(input.nodeId);
  }

  // Convert to duplicate groups
  const groups: DuplicateGroup[] = [];
  for (const [hash, instances] of hashToInstances.entries()) {
    if (instances.length > 1) {
      // Only include groups with duplicates
      const canonical = await canonicalizeSvg(
        inputs.find((i) => i.nodeId === instances[0])!.content,
        instances[0]
      );
      groups.push({
        hash,
        canonical,
        instances,
      });
    }
  }

  return groups;
}

/**
 * Group SVGs by their content hash
 *
 * @param svgs - Array of canonicalized SVGs
 * @returns Map of hash to array of canonicalized SVGs
 */
export function groupByHash(
  svgs: CanonicalizedSVG[]
): Map<string, CanonicalizedSVG[]> {
  const groups = new Map<string, CanonicalizedSVG[]>();

  for (const svg of svgs) {
    if (!groups.has(svg.hash)) {
      groups.set(svg.hash, []);
    }
    groups.get(svg.hash)!.push(svg);
  }

  return groups;
}

/**
 * Calculate space saved by deduplication
 *
 * @param duplicateGroups - Array of duplicate groups
 * @returns Bytes saved
 */
export function calculateSpaceSavings(
  duplicateGroups: DuplicateGroup[]
): number {
  let totalSize = 0;
  let uniqueSize = 0;

  for (const group of duplicateGroups) {
    const instanceCount = group.instances.length;
    const uniqueSize_ = group.canonical.svg.length;

    totalSize += uniqueSize_ * instanceCount;
    uniqueSize += uniqueSize_;
  }

  return totalSize - uniqueSize;
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get deduplication statistics for an array of inputs
 *
 * @param inputs - Array of SVG inputs
 * @returns Statistics including duplicate count and percentage
 */
export async function getDeduplicationStats(
  inputs: DeduplicationInput[]
): Promise<{
  total: number;
  unique: number;
  duplicates: number;
  duplicatePercentage: number;
}> {
  const uniqueHashes = new Set<string>();

  for (const input of inputs) {
    const canonical = await canonicalizeSvg(input.content, input.nodeId);
    uniqueHashes.add(canonical.hash);
  }

  const total = inputs.length;
  const unique = uniqueHashes.size;
  const duplicates = total - unique;
  const duplicatePercentage = total > 0 ? (duplicates / total) * 100 : 0;

  return { total, unique, duplicates, duplicatePercentage };
}

/**
 * Check if two SVGs are duplicates (same content hash)
 *
 * @param svg1 - First SVG content
 * @param svg2 - Second SVG content
 * @returns true if SVGs are duplicates
 */
export async function areDuplicates(
  svg1: string,
  svg2: string
): Promise<boolean> {
  const canonical1 = await canonicalizeSvg(svg1, "temp1");
  const canonical2 = await canonicalizeSvg(svg2, "temp2");

  return canonical1.hash === canonical2.hash;
}
