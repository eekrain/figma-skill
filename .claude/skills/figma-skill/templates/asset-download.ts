/**
 * Template: Figma Design + Asset Download
 *
 * Extracts Figma design and downloads image assets.
 * Use this when user mentions downloading images, icons, or assets.
 *
 * SETUP:
 * 1. Replace FILE_KEY with actual Figma file key
 * 2. Replace design-name with meaningful output name
 * 3. Run: bun install && bun --print script.ts && bun run script.ts
 * 4. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
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

// Extract design (json for accessing nodes, toon for saving)
const design = await figma.getFile(FILE_KEY, { format: "json" });
const toonDesign = await figma.getFile(FILE_KEY, { format: "toon" });
await Bun.write("output/design-name.toon", toonDesign);

// Find all image nodes (filter by type or specific IDs)
const imageNodes = design.nodes
  .filter((n: { type: string }) => n.type === "VECTOR" || n.type === "FRAME")
  .map((n: { id: string }) => n.id);

// Download assets
const downloaded = await figma.downloadImages(FILE_KEY, {
  ids: imageNodes,
  outputDir: "output/assets",
  format: "svg", // or "png" with scale
  scale: 1,
  parallel: 5,
});

console.log(`Downloaded ${downloaded.length} assets to output/assets/`);
