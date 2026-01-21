/**
 * Streaming usage example for figma-skill
 *
 * This example demonstrates how to use the streaming API for large designs
 * with 10,000+ nodes efficiently.
 */
import { FigmaExtractor } from "../src/index.js";
import type { StreamChunk } from "../src/types/index.js";

async function exampleStreamFile() {
  // Initialize the client
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    // Stream a complete file with progress events
    const stream = await figma.streamFile("your-file-key", {
      chunkSize: 100, // Process 100 nodes per chunk
      maxDepth: 5, // Limit traversal depth
    });

    // Listen to progress events
    stream.progress.on("progress", (progress) => {
      console.log(
        `Progress: ${progress.percent}% (${progress.processed}/${progress.total} nodes)`
      );
      console.log(`Current operation: ${progress.operation}`);
    });

    stream.progress.on("complete", (processed) => {
      console.log(`Streaming complete! Processed ${processed} nodes`);
    });

    stream.progress.on("error", (error) => {
      console.error("Stream error:", error);
    });

    // Iterate through chunks using async iterator
    for await (const chunk of stream) {
      const streamChunk = chunk as unknown as StreamChunk;
      console.log(
        `Received chunk ${streamChunk.index + 1}/${streamChunk.total}`
      );
      console.log(`  Nodes in chunk: ${streamChunk.nodes.length}`);

      // Process each chunk
      for (const node of streamChunk.nodes) {
        // Process node incrementally
        console.log(`  - ${node.type}: ${node.name}`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function exampleStreamNodes() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    // Stream specific nodes
    const stream = await figma.streamNodes(
      "your-file-key",
      ["1:1", "1:2", "1:3"],
      {
        chunkSize: 50,
        nodeFilter: (node) => node.visible !== false,
      }
    );

    for await (const chunk of stream) {
      const streamChunk = chunk as unknown as StreamChunk;
      console.log(
        `Chunk ${streamChunk.index}: ${streamChunk.nodes.length} nodes`
      );
      // Process chunk...
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function exampleStreamWithCustomExtractors() {
  const { FigmaExtractor: FigmaExtractorImport } =
    await import("../src/index.js");

  const figma = new FigmaExtractorImport({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    // Stream with larger chunk size for faster processing
    const stream = await figma.streamFile("your-file-key", {
      chunkSize: 200,
    });

    for await (const chunk of stream) {
      const streamChunk = chunk as unknown as StreamChunk;
      // Process chunks with custom extraction
      console.log(`Processing ${streamChunk.nodes.length} nodes...`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function exampleStreamWithProgressTracking() {
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  try {
    const stream = await figma.streamFile("your-file-key", {
      chunkSize: 100,
    });

    let totalNodesProcessed = 0;
    let startTime = Date.now();

    stream.progress.on("progress", (progress) => {
      const elapsed = Date.now() - startTime;
      const nodesPerSecond = Math.round((progress.processed / elapsed) * 1000);

      console.log(
        `[${progress.percent}%] ${progress.processed}/${progress.total} nodes (${nodesPerSecond} nodes/sec)`
      );
    });

    stream.progress.on("start", (total) => {
      console.log(`Starting to stream ${total} nodes...`);
      startTime = Date.now();
    });

    stream.progress.on("complete", (processed) => {
      const elapsed = Date.now() - startTime;
      const avgSpeed = Math.round((processed / elapsed) * 1000);
      console.log(
        `Complete! Processed ${processed} nodes in ${elapsed}ms (${avgSpeed} nodes/sec)`
      );
    });

    for await (const chunk of stream) {
      const streamChunk = chunk as unknown as StreamChunk;
      totalNodesProcessed += streamChunk.nodes.length;
      // Process chunk...
    }

    console.log(`Total nodes processed: ${totalNodesProcessed}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run examples
// exampleStreamFile();
// exampleStreamNodes();
// exampleStreamWithCustomExtractors();
// exampleStreamWithProgressTracking();

export {
  exampleStreamFile,
  exampleStreamNodes,
  exampleStreamWithCustomExtractors,
  exampleStreamWithProgressTracking,
};
