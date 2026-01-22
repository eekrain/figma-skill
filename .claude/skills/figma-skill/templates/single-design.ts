/**
 * Template: Single Figma Design Extraction
 *
 * Extracts a single Figma design to TOON format.
 * Use this when user provides one Figma URL without mentioning assets.
 *
 * CRITICAL SETUP NOTES:
 * - Create output directory FIRST: mkdir -p .claude/figma-outputs/YYYY-MM-DD-name
 * - cd into output directory BEFORE running: cd .claude/figma-outputs/YYYY-MM-DD-name
 * - .env file should be at: ../../.env (project root's .claude/.env)
 *
 * TROUBLESHOOTING:
 * - If you get "libstdc++.so.6" error: You're on NixOS, configure nix-ld
 * - If you get "Cannot find module": Check your working directory
 * - If rate limited: Wait 1-2 minutes, then retry
 * - See: references/troubleshooting.md for detailed help
 *
 * SETUP:
 * 1. Replace FILE_KEY with actual Figma file key
 * 2. Replace YYYY-MM-DD-name with meaningful output directory name
 * 3. Replace design-name with meaningful output file name
 * 4. Set NODE_ID to extract specific node (from URL ?node-id= parameter)
 * 5. Run: bun install && bun --print script.ts && bun run script.ts
 * 6. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
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
const OUTPUT_DIR = ".claude/figma-outputs/YYYY-MM-DD-name";

// Set NODE_ID to extract specific node (from URL ?node-id= parameter)
// Example: "6001-47121" or "I5666-180910" (instance node)
// Leave empty string "" to extract entire file
const NODE_ID = ""; // Set to "6001-47121" to extract specific node

// Build options based on NODE_ID
const options: { format: string; nodeId?: string } = { format: "toon" };
if (NODE_ID) {
  options.nodeId = NODE_ID;
}

const design = await figma.getFile(FILE_KEY, options);

// design is a string when format is "toon"
await Bun.write(`${OUTPUT_DIR}/design-name.toon`, design);
console.log(`Design saved to ${OUTPUT_DIR}/design-name.toon`);
