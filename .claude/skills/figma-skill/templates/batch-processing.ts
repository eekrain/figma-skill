/**
 * Template: Multiple Figma Designs Batch Extraction
 *
 * Extracts multiple Figma designs and downloads all image assets.
 * Use this when user provides multiple Figma URLs.
 *
 * CRITICAL SETUP NOTES:
 * - Create output directory FIRST: mkdir -p .claude/figma-outputs/YYYY-MM-DD-name
 * - cd into output directory BEFORE running: cd .claude/figma-outputs/YYYY-MM-DD-name
 * - .env file should be at: ../../.env (project root's .claude/.env)
 *
 * TROUBLESHOOTING:
 * - If you get "libstdc++.so.6" error: You're on NixOS, configure nix-ld
 * - If you get "Cannot find module": Check your working directory
 * - If rate limited: Wait 1-2 minutes, then retry (or reduce concurrent setting)
 * - See: references/troubleshooting.md for detailed help
 *
 * SETUP:
 * 1. Replace OUTPUT_DIR with meaningful output directory name
 * 2. Replace fileKeys array with actual file keys and names
 * 3. Run: bun install && bun --print script.ts && bun run script.ts
 * 4. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
 */
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv("../../.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 5,
});

// Define output directory and files to process
const OUTPUT_DIR = ".claude/figma-outputs/YYYY-MM-DD-batch";
const files = [
  { key: "key1", name: "design-name-1" },
  { key: "key2", name: "design-name-2" },
  { key: "key3", name: "design-name-3" },
];

const results = [];

for (const { key, name } of files) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Extract design (automatic fallback for large files)
    console.log(`[1/3] Extracting design...`);
    const design = await figma.getFile(key, { format: "json" });
    const toonDesign = await figma.getFile(key, { format: "toon" });
    await Bun.write(`${OUTPUT_DIR}/${name}.toon`, toonDesign);
    console.log(`✓ Extracted ${design.nodes.length} nodes\n`);

    // Find all image nodes
    console.log(`[2/3] Finding image assets...`);
    const imageNodes = design.nodes
      .filter(
        (n: { type: string }) =>
          n.type === "VECTOR" || n.type === "FRAME" || n.type === "INSTANCE"
      )
      .map((n: { id: string }) => n.id);
    console.log(`✓ Found ${imageNodes.length} image nodes\n`);

    // Download assets
    console.log(`[3/3] Downloading assets...`);
    if (imageNodes.length > 0) {
      const downloaded = await figma.downloadImages(key, {
        ids: imageNodes,
        outputDir: `${OUTPUT_DIR}/${name}-assets`,
        format: "svg",
        parallel: 5,
      });
      console.log(
        `✓ Downloaded ${downloaded.length} assets to ${OUTPUT_DIR}/${name}-assets/\n`
      );

      results.push({
        file: name,
        status: "success",
        nodes: design.nodes.length,
        assets: downloaded.length,
      });
    } else {
      console.log(`✓ No image assets found\n`);
      results.push({
        file: name,
        status: "success",
        nodes: design.nodes.length,
        assets: 0,
      });
    }
  } catch (error) {
    console.error(`✗ Failed to process ${name}:`, error);
    results.push({
      file: name,
      status: "failed",
      error: (error as Error).message,
    });
  }
}

// Summary report
console.log(`\n${"=".repeat(60)}`);
console.log(`BATCH PROCESSING COMPLETE`);
console.log(`${"=".repeat(60)}\n`);

for (const result of results) {
  if ((result as { status: string }).status === "success") {
    const r = result as {
      file: string;
      status: string;
      nodes: number;
      assets: number;
    };
    console.log(`✓ ${r.file}: ${r.nodes} nodes, ${r.assets} assets`);
  } else {
    const r = result as { file: string; status: string; error: string };
    console.log(`✗ ${r.file}: ${r.error}`);
  }
}

const successCount = results.filter(
  (r) => (r as { status: string }).status === "success"
).length;
console.log(
  `\nTotal: ${successCount}/${files.length} files processed successfully`
);
