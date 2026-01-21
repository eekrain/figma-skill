# Asset Download Example

Extract Figma design and download image assets.

## User Request

"Extract the Figma design and download all the icons: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard-NewFlow?node-id=8202-55990&t=Kf92WvG7sYqLpXcD-3
"

## AI Agent Workflow

1. **Extract file key and node ID**: From URL
   - File key: `7kRmPqZ8fTnQJ9bH4LxC0a`
   - Node ID: `8202-55990` (if extracting specific node)

2. **Create output directory**: `.claude/figma-outputs/2025-01-21-icon-set/`

3. **Create package.json** and **tsconfig.json** (use templates)

4. **Generate script.ts**:

   ```typescript
   import { FigmaExtractor, requireEnv } from "figma-skill";

   // Load token and throw if missing (stops script immediately)
   const token = await requireEnv("../../.env", "FIGMA_TOKEN");

   const figma = new FigmaExtractor({ token, cache: true });

   // Extract design (with or without nodeId)
   // Note: Automatic fallback handles files of any size
   const design = await figma.getFile("7kRmPqZ8fTnQJ9bH4LxC0a", {
     nodeId: "8202-55990", // Optional: extract specific node only
     format: "json",
   });
   const toonDesign = await figma.getFile("7kRmPqZ8fTnQJ9bH4LxC0a", {
     nodeId: "8202-55990", // Optional: extract specific node only
     format: "toon",
   });
   await Bun.write("icon-set.toon", toonDesign);

   // Find all image nodes (filter by type or specific IDs)
   const imageNodes = design.nodes
     .filter((n: { type: string }) => n.type === "VECTOR" || n.type === "FRAME")
     .map((n: { id: string }) => n.id);

   // Download assets
   const downloaded = await figma.downloadImages("7kRmPqZ8fTnQJ9bH4LxC0a", {
     ids: imageNodes,
     outputDir: "assets",
     format: "svg", // or "png" with scale
     scale: 1,
     parallel: 5,
   });

   console.log(`Downloaded ${downloaded.length} assets to assets/`);
   ```

5. **Run**: `bun install && bun --print script.ts && bun run script.ts`

6. **Cleanup**: `rm script.ts package.json tsconfig.json && rm -rf node_modules`

## Node ID for Asset Download

When extracting assets from a specific node:

```typescript
// Extract only specific node's assets
const design = await figma.getFile("fileKey", {
  nodeId: "8202-55990", // From URL ?node-id= parameter
  format: "json",
});

// The returned design.nodes only contains children of the specified node
const imageNodes = design.nodes
  .filter((n) => n.type === "VECTOR")
  .map((n) => n.id);
```

**When to use nodeId for assets:**

- URL contains `node-id` parameter (user wants specific frame/component)
- Extracting assets from a specific icon set or component
- Avoiding downloading unnecessary assets from entire file

## Automatic Fallback

The `getFile()` method automatically handles files of **any size**:

- **Small/Medium files** (< 10K nodes): Fast single-request path
- **Large files** (> 10K nodes): Automatic fallback to paginated fetching

You don't need to specify which approach to use - it's handled automatically. If the Figma API returns a size error (413, 500, etc.), the extractor will automatically switch to paginated fetching and continue.

## Final Output

```
.claude/figma-outputs/2025-01-21-icon-set/
├── icon-set.toon
└── assets/
    ├── icon1.svg
    ├── icon2.svg
    └── icon3.svg
```
