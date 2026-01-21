/**
 * Template: Single Figma Design Extraction
 *
 * Extracts a single Figma design to TOON format.
 * Use this when user provides one Figma URL without mentioning assets.
 *
 * SETUP:
 * 1. Replace FILE_KEY with actual Figma file key
 * 2. Replace design-name with meaningful output name
 * 3. Run: bun install && bun --print script.ts && bun run script.ts
 * 4. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
 *
 * OPTIONAL STREAMING (for very large files 10K+ nodes):
 * If you need progress tracking for very large files, use streamFile() instead:
 * const stream = await figma.streamFile("FILE_KEY", { chunkSize: 100 });
 * stream.progress.on("progress", (p) => console.log(`[${p.percent}%] ${p.processed}/${p.total} nodes`));
 * const allNodes = [];
 * for await (const chunk of stream) { allNodes.push(...chunk.nodes); }
 * const { toToon } = await import("figma-skill");
 * const design = { name: "design-name", nodes: allNodes, components: {}, componentSets: {}, globalVars: { styles: {} } };
 * await Bun.write("output/design-name.toon", toToon(design));
 */
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv("../../.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 10,
});

// CRITICAL: toon format is token-efficient (30-60% smaller than JSON)
const FILE_KEY = "your-file-key-here";
const design = await figma.getFile(FILE_KEY, { format: "toon" });

// design is a string when format is "toon"
await Bun.write("output/design-name.toon", design);
console.log(`Design saved to design-name.toon`);
