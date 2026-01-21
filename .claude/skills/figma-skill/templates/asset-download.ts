/**
 * Template: Figma Design + Asset Download
 *
 * Extracts Figma design and downloads image assets.
 * Use this when user mentions downloading images, icons, or assets.
 *
 * SETUP:
 * 1. Replace FILE_KEY with actual Figma file key
 * 2. Replace YYYY-MM-DD-name with meaningful output directory name
 * 3. Replace design-name with meaningful output file name
 * 4. Run: bun install && bun --print script.ts && bun run script.ts
 * 5. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
 */
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv("../../.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 10,
});

const FILE_KEY = "your-file-key-here";
const OUTPUT_DIR = ".claude/figma-outputs/YYYY-MM-DD-name";

// Extract design (json for accessing nodes, toon for saving)
const design = await figma.getFile(FILE_KEY, { format: "json" });
const toonDesign = await figma.getFile(FILE_KEY, { format: "toon" });
await Bun.write(`${OUTPUT_DIR}/design-name.toon`, toonDesign);

// Separate nodes by type for appropriate formats
const vectorNodes = design.nodes
  .filter((n: { type: string; name: string }) => n.type === "VECTOR")
  .map((n: { id: string }) => n.id);

const iconNodes = design.nodes
  .filter(
    (n: { type: string; name: string }) =>
      n.type === "FRAME" && n.name.toLowerCase().includes("icon")
  )
  .map((n: { id: string }) => n.id);

const frameNodes = design.nodes
  .filter(
    (n: { type: string; name: string }) =>
      n.type === "FRAME" && !n.name.toLowerCase().includes("icon")
  )
  .map((n: { id: string }) => n.id);

// Download each group with appropriate format
const results = [];

// 1. Vectors → SVG (best for icons, logos)
if (vectorNodes.length > 0) {
  const svg = await figma.downloadImages(FILE_KEY, {
    ids: vectorNodes,
    outputDir: `${OUTPUT_DIR}/assets/vectors`,
    format: "svg",
    parallel: 5,
  });
  results.push(...svg);
}

// 2. Icons as frames → SVG
if (iconNodes.length > 0) {
  const icons = await figma.downloadImages(FILE_KEY, {
    ids: iconNodes,
    outputDir: `${OUTPUT_DIR}/assets/icons`,
    format: "svg",
    parallel: 5,
  });
  results.push(...icons);
}

// 3. Complex graphics → PNG@2x (high resolution)
if (frameNodes.length > 0) {
  const png = await figma.downloadImages(FILE_KEY, {
    ids: frameNodes,
    outputDir: `${OUTPUT_DIR}/assets/frames`,
    format: "png",
    scale: 2,
    parallel: 3,
  });
  results.push(...png);
}

console.log(`Downloaded ${results.length} assets to ${OUTPUT_DIR}/assets/`);
console.log(`  - ${vectorNodes.length} vectors as SVG`);
console.log(`  - ${iconNodes.length} icons as SVG`);
console.log(`  - ${frameNodes.length} frames as PNG@2x`);
