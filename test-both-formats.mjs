#!/usr/bin/env node
/**
 * Test script for comparing JSON, Toon, and Compressed Toon format outputs
 * Fetches a Figma file and saves all formats to files
 */
import { writeFileSync } from "fs";

import { FigmaExtractor } from "./dist/index.js";
import { toToon, toToonLines } from "./dist/index.js";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

// Use the test file from the plan
const FILE_KEY = "1ZjbjIzmxOqo8b4eC0sqBE";
const NODE_ID = "6001-46343";

async function main() {
  const client = new FigmaExtractor({
    token: FIGMA_TOKEN,
  });

  console.log("=".repeat(60));
  console.log(`Fetching: ${FILE_KEY} (node: ${NODE_ID})`);
  console.log("=".repeat(60));

  try {
    // Fetch as JSON
    console.log("\n📄 Fetching JSON format...");
    const jsonDesign = await client.getFile(FILE_KEY, {
      nodeId: NODE_ID,
      format: "json",
    });

    // Write JSON to file
    const jsonPath = "./test-output.json";
    writeFileSync(jsonPath, JSON.stringify(jsonDesign, null, 2));
    console.log(`   Saved to: ${jsonPath}`);

    // Fetch as Toon (uncompressed)
    console.log("\n🎨 Fetching Toon format (uncompressed)...");
    const toonString = await client.getFile(FILE_KEY, {
      nodeId: NODE_ID,
      format: "toon",
      compress: false,
    });

    // Write Toon to file
    const toonPath = "./test-output.toon";
    writeFileSync(toonPath, toonString);
    console.log(`   Saved to: ${toonPath}`);

    // Fetch as Compressed Toon
    console.log("\n🗜️  Fetching Toon format (COMPRESSED)...");
    const compressedToonString = await client.getFile(FILE_KEY, {
      nodeId: NODE_ID,
      format: "toon",
      compress: true,
      compressionOptions: {
        minInstances: 2,
        extractGrids: true,
        preserveOrder: true,
      },
    });

    // Write Compressed Toon to file
    const compressedPath = "./test-output-compressed.toon";
    writeFileSync(compressedPath, compressedToonString);
    console.log(`   Saved to: ${compressedPath}`);

    console.log("\n" + "=".repeat(60));

    // Show stats
    const jsonSize = JSON.stringify(jsonDesign).length;
    const toonSize = toonString.length;
    const compressedSize = compressedToonString.length;
    const toonSavings = ((1 - toonSize / jsonSize) * 100).toFixed(1);
    const compressedSavings = ((1 - compressedSize / jsonSize) * 100).toFixed(
      1
    );
    const compressionBonus = ((1 - compressedSize / toonSize) * 100).toFixed(1);

    console.log("\n📊 FORMAT COMPARISON:\n");
    console.log(`JSON size:              ${jsonSize.toLocaleString()} bytes`);
    console.log(
      `Toon size:              ${toonSize.toLocaleString()} bytes (${toonSavings}% vs JSON)`
    );
    console.log(
      `Compressed Toon size:   ${compressedSize.toLocaleString()} bytes (${compressedSavings}% vs JSON)`
    );
    console.log(``);
    console.log(
      `Compression bonus:      ${compressionBonus}% smaller than regular Toon`
    );

    console.log("\n✅ Files saved successfully!");
    console.log(`   - ${jsonPath}`);
    console.log(`   - ${toonPath}`);
    console.log(`   - ${compressedPath}`);

    // Test decompression
    console.log("\n🔄 Testing decompression...");
    const { fromToon } = await import("./dist/index.js");
    const decompressed = fromToon(compressedToonString);
    console.log(
      `   Decompressed ${decompressed.nodes.length} nodes successfully!`
    );
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("401") || error.message.includes("403")) {
      console.error(
        "\n❌ Authentication failed. Please check your Figma token."
      );
    } else if (error.message.includes("404")) {
      console.error(
        "\n❌ File or node not found. Please check the file key and node ID."
      );
    }
    process.exit(1);
  }
}

main();
