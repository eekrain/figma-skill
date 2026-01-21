# Batch Processing Example

Extract multiple Figma designs and download all image assets.

## User Request

"Extract these Figma designs and download all image assets:

- https://www.figma.com/file/abc123/homepage-design
- https://www.figma.com/file/def456/dashboard-system
- https://www.figma.com/file/ghi789/component-library

This is a large design system, I need all nodes and assets."

## AI Agent Workflow

1. **Extract file keys**: `abc123`, `def456`, `ghi789` from URLs
2. **Create output directory**: `.claude/figma-outputs/2025-01-21-design-batch/`
3. **Create package.json** and **tsconfig.json** (use templates)
4. **Generate script.ts**:

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv(".claude/.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 5,
});

// Define files to process
const files = [
  { key: "abc123", name: "homepage-design" },
  { key: "def456", name: "dashboard-system" },
  { key: "ghi789", name: "component-library" },
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
    await Bun.write(`${name}.toon`, toonDesign);
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
        outputDir: `${name}-assets`,
        format: "svg",
        parallel: 5,
      });
      console.log(
        `✓ Downloaded ${downloaded.length} assets to ${name}-assets/\n`
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
```

5. **Run**: `bun install && bun --print script.ts && bun run script.ts`
6. **Cleanup**: `rm script.ts package.json tsconfig.json && rm -rf node_modules`

## Progress Output During Extraction

```
============================================================
Processing: homepage-design
============================================================

[1/3] Extracting design...
[DEBUG] Starting getFile for abc123...
[DEBUG] API response received, starting extraction...
[DEBUG] Extraction complete: 1250 nodes extracted
✓ Extracted 1250 nodes

[2/3] Finding image assets...
✓ Found 45 image nodes

[3/3] Downloading assets...
[============================================================] 100% | 45/45
✓ Downloaded 45 assets to homepage-design-assets/

============================================================
Processing: dashboard-system
============================================================

[1/3] Extracting design...
[DEBUG] Starting getFile for def456...
[DEBUG] API response received, starting extraction...
[DEBUG] Extraction complete: 45000 nodes extracted
✓ Extracted 45000 nodes

[2/3] Finding image assets...
✓ Found 320 image nodes

[3/3] Downloading assets...
[============================================================] 100% | 320/320
✓ Downloaded 320 assets to dashboard-system-assets/

============================================================
Processing: component-library
============================================================

[1/3] Extracting design...
[DEBUG] Starting getFile for ghi789...
[INFO] File too large, using paginated approach
[0.0%] Fetching top-level nodes... 15 nodes
[5.2%] Fetched 100/1920 nodes
[10.4%] Fetched 200/1920 nodes
...
[100.0%] Fetched 1920/1920 nodes
✓ Extracted 1920 nodes

[2/3] Finding image assets...
✓ Found 85 image nodes

[3/3] Downloading assets...
[============================================================] 100% | 85/85
✓ Downloaded 85 assets to component-library-assets/

============================================================
BATCH PROCESSING COMPLETE
============================================================

✓ homepage-design: 1250 nodes, 45 assets
✓ dashboard-system: 45000 nodes, 320 assets
✓ component-library: 1920 nodes, 85 assets

Total: 3/3 files processed successfully
```

## Final Output

```
.claude/figma-outputs/2025-01-21-design-batch/
├── homepage-design.toon
├── homepage-design-assets/
│   ├── logo.svg
│   ├── icon1.svg
│   └── ...
├── dashboard-system.toon
├── dashboard-system-assets/
│   ├── chart.svg
│   ├── widget.svg
│   └── ...
├── component-library.toon
├── component-library-assets/
│   ├── button.svg
│   ├── input.svg
│   └── ...
└── batch-summary.txt
```

## Automatic Fallback

The script automatically handles files of any size:

- **Small files** use the fast single-request path
- **Large files** (like the component-library in this example) automatically fall back to paginated fetching when the API returns a size error

You don't need to specify which approach to use - it's handled transparently.
