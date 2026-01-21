---
name: figma-skill
description: Extract and process Figma design data with automatic file size handling. Use this skill when the user asks to: (1) Extract Figma designs to TOON/JSON format, (2) Download design assets (icons, images, components), (3) Analyze design systems and component libraries, (4) Process multiple Figma files in batch, or (5) Convert Figma designs to code/frontend artifacts
license: Complete terms in LICENSE.txt
---

# Figma Design Extraction and Processing

## Overview

Extract and process Figma design data using the `figma-skill` npm package. Handles files of any size automatically—small files use fast single-request path, large files (>10K nodes) automatically fall back to paginated fetching.

**Output structure:** `.claude/figma-outputs/YYYY-MM-DD-name/`

- `*.toon` - Compact design format (30-60% smaller than JSON)
- `*-assets/` - Downloaded assets (when applicable)

## Quick Start

**Most common workflow:** Extract a single Figma design to TOON format.

```bash
# Setup (one-time)
bun install && bun --print script.ts && bun run script.ts

# Cleanup
rm script.ts package.json tsconfig.json && rm -rf node_modules
```

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

// Extract file key from URL: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard-NewFlow?node-id=8202-55990
const design = await figma.getFile("7kRmPqZ8fTnQJ9bH4LxC0a", {
  format: "toon",
});
await Bun.write("output/profile-dashboard.toon", design);
console.log(`Design saved to profile-dashboard.toon`);
```

### Extracting Specific Nodes

**When to use:** User provides Figma URL with `node-id` parameter.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

// URL: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/...?node-id=6001-47121
const design = await figma.getFile("7kRmPqZ8fTnQJ9bH4LxC0a", {
  nodeId: "6001-47121", // Auto-converts - to :
  format: "json",
});
```

**Node ID formats supported:**

- Standard: `"1:2"` or `"1-2"` (URL format)
- Instance: `"I5666:180910"` or `"I5666-180910"`
- Multiple: `"1:2;3:4"` or `"1-2;3-4"`

## Workflow Decision Tree

### Single Design Extraction

**When to use:** User provides one Figma URL without mentioning assets.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

// Extract file key from URL: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/...
const design = await figma.getFile("7kRmPqZ8fTnQJ9bH4LxC0a", {
  format: "toon",
});
await Bun.write("output/profile-dashboard.toon", design);
```

### With Asset Download

**When to use:** User mentions downloading images, icons, or assets.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

// Extract both formats
const design = await figma.getFile("abc123", { format: "json" });
const toonDesign = await figma.getFile("abc123", { format: "toon" });
await Bun.write("output/design-name.toon", toonDesign);

// Find image nodes
const imageNodes = design.nodes
  .filter((n) => n.type === "VECTOR" || n.type === "FRAME")
  .map((n) => n.id);

// Download assets
const downloaded = await figma.downloadImages("abc123", {
  ids: imageNodes,
  outputDir: "output/assets",
  format: "svg",
  parallel: 5,
});

console.log(`Downloaded ${downloaded.length} assets`);
```

### Batch Processing

**When to use:** User provides multiple Figma URLs or mentions processing multiple files.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true, concurrent: 5 });

const files = [
  { key: "abc123", name: "homepage" },
  { key: "def456", name: "dashboard" },
];

for (const { key, name } of files) {
  try {
    const design = await figma.getFile(key, { format: "toon" });
    await Bun.write(`output/${name}.toon`, design);
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error);
  }
}
```

## Reference Files

This skill includes templates and examples for common workflows:

**Templates:**

- `templates/single-design.ts` - Extract a single Figma design
- `templates/node-extraction.ts` - Extract specific nodes by nodeId
- `templates/asset-download.ts` - Extract design + download assets
- `templates/batch-processing.ts` - Process multiple files

**Examples:**

- `examples/basic-extraction.md` - Basic extraction workflows
- `examples/asset-download.md` - Asset download patterns
- `examples/batch-processing.md` - Batch processing examples

**References:**

- `references/api.md` - Complete API documentation
- `references/advanced.md` - Streaming for very large files (10K+ nodes)
- `references/examples.md` - Detailed examples and common tasks

## Best Practices

**File Size Handling:**

- The extractor automatically handles files of any size
- No manual configuration needed for large files
- Automatic fallback to paginated fetching when needed

**TOON vs JSON:**

- Use TOON format for storage (30-60% smaller)
- Use JSON format when you need to access node properties

**Asset Download:**

- Filter nodes by type before downloading
- Use `parallel` option to control concurrency
- SVG format preferred for icons/vectors

**Error Handling:**

```typescript
import {
  AuthenticationError,
  FigmaApiError,
  RateLimitError,
} from "figma-skill";

try {
  const design = await figma.getFile(fileKey);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid FIGMA_TOKEN - check ../../.env");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited - wait and retry");
  }
}
```

## Code Style Guidelines

**Keep scripts concise:**

- Use `requireEnv()` for token loading (throws if missing)
- Use template strings for output paths
- Clean up temporary files after completion

**Progressive enhancement:**

- Start with basic extraction
- Add asset download only if needed
- Use streaming only for very large files (10K+ nodes with explicit progress needs)

## Dependencies

**Runtime:** Bun (for ESM support and performance)

```bash
curl -fsSL https://bun.sh/install | bash
```

**Token Configuration:** Store in `.claude/.env`

```bash
FIGMA_TOKEN=your_token_here
```

**Package Installation:** Included in templates

```json
{
  "dependencies": { "figma-skill": "0.1.0" },
  "devDependencies": { "@types/bun": "latest" }
}
```

## Getting File Keys and Node IDs

Extract from Figma URL: `https://www.figma.com/design/{fileKey}/...?node-id={nodeId}`

Example: `https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard?node-id=6001-47121`

- File key: `7kRmPqZ8fTnQJ9bH4LxC0a`
- Node ID: `6001-47121` (use directly in `getFile()` options)

## Next Steps

- For complete API reference, see `references/api.md`
- For streaming very large files, see `references/advanced.md`
- For detailed examples and common tasks, see `references/examples.md`
