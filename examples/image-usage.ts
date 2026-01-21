/**
 * Image download and processing usage examples
 *
 * This example demonstrates how to use figma-skill's image processing
 * capabilities including download, crop calculation, and format conversion.
 */
import type { Node } from "@figma/rest-api-spec";

import { downloadAndProcessImages } from "../src/images/index.js";
import { FigmaExtractor } from "../src/index.js";

/**
 * Example 1: Basic image download
 */
async function exampleBasicDownload() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    // Download images from Figma
    const results = await figma.downloadImages("your-file-key", {
      ids: ["1:1", "1:2", "1:3"],
      format: "png",
      scale: 2,
      outputDir: "./output/images",
      parallel: 5,
    });

    console.log(`Downloaded ${results.length} images`);
    for (const result of results) {
      console.log(
        `  ${result.id}: ${result.path} (${result.width}x${result.height})`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 2: Download with progress tracking
 */
async function exampleDownloadWithProgress() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    const { ProgressEmitter } =
      await import("../src/streaming/progress-emitter.js");
    const { downloadImages } = await import("../src/images/index.js");

    const progress = new ProgressEmitter();

    progress.on("progress", (p) => {
      console.log(`Download: ${p.percent}% (${p.processed}/${p.total})`);
    });

    progress.on("complete", (total) => {
      console.log(`Download complete! ${total} images`);
    });

    // Get image URLs first
    const urls = await figma.getImageUrls("your-file-key", {
      ids: ["1:1", "1:2"],
      format: "png",
      scale: 2,
    });

    // Download with progress
    const results = await downloadImages(urls, {
      outputDir: "./output/images",
      parallel: 5,
      progress,
    });

    console.log(
      `Successfully downloaded ${results.filter((r) => r.success).length}/${results.length} images`
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 3: Download with CSS generation
 *
 * Note: Crop processing requires raw Node objects with transform data.
 * This example shows CSS generation which works with the simplified API.
 */
async function exampleDownloadWithCrop() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    // Get image URLs
    const urls = await figma.getImageUrls("your-file-key", {
      ids: ["1:1", "1:2", "1:3"],
      format: "png",
      scale: 2,
    });

    // Download and process with CSS generation
    const result = await downloadAndProcessImages(
      urls,
      [], // No nodes for crop calculation (would require raw Node objects)
      "./output/images",
      {
        generateCSS: true, // Generate CSS variables for dimensions
        cssOutputPath: "./output/images.css",
      }
    );

    console.log("Download Summary:");
    console.log(`  Total: ${result.stats.total}`);
    console.log(`  Downloaded: ${result.stats.downloaded}`);
    console.log(`  Failed: ${result.stats.failed}`);
    console.log(`  Processed: ${result.stats.processed}`);
    console.log(
      `  Total size: ${(result.stats.totalSize / 1024).toFixed(2)} KB`
    );

    if (result.css) {
      console.log("\nGenerated CSS:");
      console.log(result.css);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 4: Batch download with format conversion
 */
async function exampleBatchDownloadWithConversion() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    const urls = await figma.getImageUrls("your-file-key", {
      ids: ["1:1", "1:2", "1:3"],
      format: "png",
      scale: 2,
    });

    const result = await downloadAndProcessImages(
      urls,
      [], // No nodes for crop calculation
      "./output/images",
      {
        convertFormat: "webp", // Convert to WebP
        quality: 85,
      }
    );

    console.log(`Converted ${result.processed.length} images to WebP`);
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 5: Using image utilities directly
 */
async function exampleDirectUtilities() {
  const { calculateCropFromTransform } = await import("../src/images/index.js");

  // Mock Figma node with transform (for demonstration only)
  // Using type assertion since transform is not a standard Node property
  const mockNode = {
    id: "1:1",
    name: "Test Frame",
    type: "FRAME",
    width: 1000,
    height: 1000,
    transform: [
      [0.5, 0, 100],
      [0, 0.5, 50],
    ], // 50% scale, offset
  } as unknown as Node;

  // Calculate crop region
  const crop = calculateCropFromTransform(mockNode);

  if (crop) {
    console.log("Calculated crop region:");
    console.log(`  Left: ${crop.left}`);
    console.log(`  Top: ${crop.top}`);
    console.log(`  Width: ${crop.width}`);
    console.log(`  Height: ${crop.height}`);
  }
}

/**
 * Example 6: Error handling for failed downloads
 */
async function exampleErrorHandling() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    const results = await figma.downloadImages("your-file-key", {
      ids: ["1:1", "1:2", "invalid-id"],
      format: "png",
      scale: 2,
      outputDir: "./output/images",
      parallel: 5,
    });

    // Check for failures
    const failed = results.filter((r) => r.width === 0 && r.height === 0);

    if (failed.length > 0) {
      console.warn(`Failed to download ${failed.length} images:`);
      for (const result of failed) {
        console.warn(`  ${result.id}: ${result.path}`);
      }
    }

    console.log(
      `Successfully downloaded ${results.length - failed.length} images`
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

// Export examples
export {
  exampleBasicDownload,
  exampleDownloadWithProgress,
  exampleDownloadWithCrop,
  exampleBatchDownloadWithConversion,
  exampleDirectUtilities,
  exampleErrorHandling,
};
