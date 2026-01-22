/**
 * Template: Extract Specific Nodes by nodeId
 *
 * Extracts specific nodes from a Figma file using nodeId parameter.
 * Use this when user provides Figma URL with node-id query parameter.
 *
 * URL Example: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/...?node-id=6001-47121
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
 * 3. Replace NODE_ID with node ID from URL (can use - or : separator)
 * 4. Run: bun install && bun --print script.ts && bun run script.ts
 * 5. Cleanup: rm script.ts package.json tsconfig.json && rm -rf node_modules
 *
 * NODE ID FORMATS SUPPORTED:
 * - Standard: "1:2" or "1-2" (URL format with -)
 * - Instance: "I5666:180910" or "I5666-180910"
 * - Multiple: "1:2;3:4" or "1-2;3-4"
 */
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv("../../.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 10,
});

// CRITICAL: Extract from URL: https://www.figma.com/design/{FILE_KEY}/...?node-id={NODE_ID}
const FILE_KEY = "your-file-key-here";
const OUTPUT_DIR = ".claude/figma-outputs/YYYY-MM-DD-name";
const NODE_ID = "6001-47121"; // Can use URL format (-) or API format (:)

// Note: npm package v0.1.0 had outdated types (fixed in v0.1.1+)
// If using v0.1.0, use: const design = await figma.getFile(...) as SimplifiedDesign;

// Extract specific node(s) - nodeId parameter auto-converts - to :
const design = await figma.getFile(FILE_KEY, {
  nodeId: NODE_ID,
  format: "json",
});

// Save to output directory
await Bun.write(
  `${OUTPUT_DIR}/node-extraction.json`,
  JSON.stringify(design, null, 2)
);
console.log(`Node extraction saved to ${OUTPUT_DIR}/node-extraction.json`);
console.log(`Extracted ${design.nodes.length} node(s)`);
