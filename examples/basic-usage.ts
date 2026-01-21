/**
 * Basic usage example for figma-skill
 */
import { FigmaExtractor } from "../src/index.js";
import type { GetFileOptions } from "../src/types/index.js";

async function main() {
  // Initialize the client
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
    cache: true,
    cacheSize: 100,
    maxRetries: 3,
    timeout: 30000,
    concurrent: 10,
  });

  try {
    // Example 1: Get a complete file with default extractors
    const design = await figma.getFile("your-file-key");
    console.log(`Design: ${design.name}`);
    console.log(`Nodes: ${design.nodes.length}`);
    console.log(`Components: ${Object.keys(design.components).length}`);

    // Example 2: Get file with custom options
    const options: GetFileOptions = {
      maxDepth: 3, // Limit traversal depth
      nodeFilter: (node) => node.type === "FRAME" || node.type === "TEXT",
    };

    const filteredDesign = await figma.getFile("your-file-key", options);
    console.log(`Filtered nodes: ${filteredDesign.nodes.length}`);

    // Example 3: Get specific nodes
    const nodes = await figma.getNodes("your-file-key", {
      ids: ["1:1", "1:2", "1:3"],
    });
    console.log(`Specific nodes: ${nodes.nodes.length}`);

    // Example 4: Get image URLs
    const images = await figma.getImageUrls("your-file-key", {
      ids: ["1:1", "1:2"],
      format: "png",
      scale: 2,
    });
    console.log(`Images: ${images.length}`);

    // Example 5: Check cache stats
    const cacheStats = figma.getCacheStats();
    console.log(`Cache: ${cacheStats?.size}/${cacheStats?.maxSize}`);

    // Example 6: Clear cache
    figma.clearCache();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
