# Batch Processing Example

Extract multiple Figma designs and download all image assets.

## User Request

"Extract these Figma designs and download all image assets:

- https://www.figma.com/design/4BzNqT9dVpLxQmYaC7HkR2/User-Onboarding-Flow?node-id=7203-38120&t=Ax93JqL6WzPoRmTn-8
- https://www.figma.com/design/9KpVgF4wJuSeTmRbQ1YdH6/Product-Card-Interaction?node-id=9125-45011&t=Qr82MnF4XyLtPkVz-5
- https://www.figma.com/design/2MzQhL8vXrPdYfCbN3GkT0/Settings-Panel-Modal?node-id=6584-29387&t=Wp76KzV5UfLoBnSd-2

This is a large design system, I need all nodes and assets."

## AI Agent Workflow

1. **Extract file keys and node IDs**:
   - `4BzNqT9dVpLxQmYaC7HkR2` with node ID `7203-38120`
   - `9KpVgF4wJuSeTmRbQ1YdH6` with node ID `9125-45011`
   - `2MzQhL8vXrPdYfCbN3GkT0` with node ID `6584-29387`

2. **Create output directory**: `.claude/figma-outputs/2025-01-21-design-batch/`

3. **Create package.json** and **tsconfig.json** (use templates)

4. **Generate script.ts**:

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

// Load token and throw if missing (stops script immediately)
const token = await requireEnv("../../.env", "FIGMA_TOKEN");

const figma = new FigmaExtractor({
  token,
  cache: true,
  concurrent: 5,
});

// Define files to process
// Use nodeId when URL contains ?node-id= parameter
const files = [
  {
    key: "4BzNqT9dVpLxQmYaC7HkR2",
    nodeId: "7203-38120",
    name: "onboarding-flow",
  },
  { key: "9KpVgF4wJuSeTmRbQ1YdH6", nodeId: "9125-45011", name: "product-card" },
  {
    key: "2MzQhL8vXrPdYfCbN3GkT0",
    nodeId: "6584-29387",
    name: "settings-modal",
  },
];

const results = [];

for (const { key, nodeId, name } of files) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Extract design (automatic fallback for large files)
    console.log(`[1/3] Extracting design...`);

    const design = await figma.getFile(key, {
      nodeId, // Extract specific node only
      format: "json",
    });
    const toonDesign = await figma.getFile(key, {
      nodeId, // Extract specific node only
      format: "toon",
    });
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

## Batch Processing with Node IDs

When URLs contain `node-id` parameters:

```typescript
// Define files with their node IDs
const files = [
  { key: "abc123", nodeId: "7203-38120", name: "onboarding" },
  { key: "def456", nodeId: "9125-45011", name: "product-card" },
  { key: "ghi789", nodeId: "6584-29387", name: "settings" },
];

// Extract each specific node
for (const { key, nodeId, name } of files) {
  const design = await figma.getFile(key, {
    nodeId, // Extract only the specified node
    format: "json",
  });
  // ... process design
}
```

**Benefits of using nodeId in batch:**

- Faster extraction (only fetches needed nodes)
- Reduced bandwidth
- Targeted asset extraction
- Ideal for design system component exports

## Automatic Fallback

The script automatically handles files of any size:

- **Small files** use the fast single-request path
- **Large files** (like the component-library in this example) automatically fall back to paginated fetching when the API returns a size error

You don't need to specify which approach to use - it's handled transparently.
