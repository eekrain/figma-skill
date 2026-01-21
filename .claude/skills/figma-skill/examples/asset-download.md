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

## Multi-Format Asset Download

Different asset types require different formats for optimal quality and file size:

| Asset Type      | Best Format | Why                             |
| --------------- | ----------- | ------------------------------- |
| Icons/Logos     | SVG         | Vector, scales infinitely       |
| Screenshots     | PNG@2x      | Raster, needs high resolution   |
| Illustrations   | PNG/WebP    | Complex graphics, raster format |
| Vector Graphics | SVG         | Scalable, small file size       |

### Separate by Node Type

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "7kRmPqZ8fTnQJ9bH4LxC0a";
const design = await figma.getFile(fileKey, { format: "json" });

// Separate nodes by type for different formats
const vectorNodes = design.nodes
  .filter((n) => n.type === "VECTOR")
  .map((n) => n.id);

const frameNodes = design.nodes
  .filter((n) => n.type === "FRAME" && !n.name.toLowerCase().includes("icon"))
  .map((n) => n.id);

const iconNodes = design.nodes
  .filter((n) => n.type === "FRAME" && n.name.toLowerCase().includes("icon"))
  .map((n) => n.id);

// Download each group with appropriate format
const results = [];

// 1. Vectors → SVG (best for icons, logos)
if (vectorNodes.length > 0) {
  const svg = await figma.downloadImages(fileKey, {
    ids: vectorNodes,
    outputDir: "assets/vectors",
    format: "svg",
    parallel: 5,
  });
  results.push(...svg);
  console.log(`Downloaded ${svg.length} vectors as SVG`);
}

// 2. Icons as frames → SVG
if (iconNodes.length > 0) {
  const icons = await figma.downloadImages(fileKey, {
    ids: iconNodes,
    outputDir: "assets/icons",
    format: "svg",
    parallel: 5,
  });
  results.push(...icons);
  console.log(`Downloaded ${icons.length} icons as SVG`);
}

// 3. Complex graphics → PNG@2x (high resolution)
if (frameNodes.length > 0) {
  const png = await figma.downloadImages(fileKey, {
    ids: frameNodes,
    outputDir: "assets/frames",
    format: "png",
    scale: 2, // 2x for retina/high-DPI
    parallel: 3, // Lower for large files
  });
  results.push(...png);
  console.log(`Downloaded ${png.length} frames as PNG@2x`);
}

console.log(`Total: ${results.length} assets downloaded`);
```

### Separate by Naming Convention

```typescript
// Group by asset type using naming patterns
const assetsByType = {
  icons: [] as string[],
  photos: [] as string[],
  illustrations: [] as string[],
};

design.nodes.forEach((node) => {
  const name = node.name.toLowerCase();

  if (
    name.includes("icon") ||
    name.startsWith("ic-") ||
    name.startsWith("icon_")
  ) {
    assetsByType.icons.push(node.id);
  } else if (
    name.includes("photo") ||
    name.includes("image") ||
    name.includes("picture")
  ) {
    assetsByType.photos.push(node.id);
  } else if (
    name.includes("illustration") ||
    name.includes("graphic") ||
    name.includes("art")
  ) {
    assetsByType.illustrations.push(node.id);
  }
});

// Download with appropriate formats
for (const [type, ids] of Object.entries(assetsByType)) {
  if (ids.length === 0) continue;

  const format = type === "icons" ? "svg" : "png";
  const scale = type === "photos" ? 1 : 2;

  const downloaded = await figma.downloadImages(fileKey, {
    ids,
    outputDir: `assets/${type}`,
    format,
    scale,
    parallel: 5,
  });

  console.log(
    `Downloaded ${downloaded.length} ${type} as ${format}${scale > 1 ? `@${scale}x` : ""}`
  );
}
```

### Smart Format Detection

```typescript
// Auto-detect best format based on node properties
function detectBestFormat(node: SimplifiedNode): {
  format: string;
  scale?: number;
} {
  const name = node.name.toLowerCase();

  // Icons and logos → SVG
  if (
    node.type === "VECTOR" ||
    name.includes("icon") ||
    name.includes("logo")
  ) {
    return { format: "svg" };
  }

  // Photos and screenshots → PNG@1x or PNG@2x
  if (name.includes("photo") || name.includes("screenshot")) {
    return { format: "png", scale: 1 };
  }

  // Illustrations and graphics → PNG@2x for quality
  if (name.includes("illustration") || node.type === "FRAME") {
    return { format: "png", scale: 2 };
  }

  // Default: SVG for vectors, PNG for others
  return node.type === "VECTOR"
    ? { format: "svg" }
    : { format: "png", scale: 2 };
}

// Group nodes by their optimal format
const assetsByFormat: Record<string, { ids: string[]; scale?: number }> = {};

design.nodes.forEach((node) => {
  if (node.type !== "VECTOR" && node.type !== "FRAME") return;

  const { format, scale } = detectBestFormat(node);
  const key = scale ? `${format}@${scale}x` : format;

  if (!assetsByFormat[key]) {
    assetsByFormat[key] = { ids: [], scale };
  }
  assetsByFormat[key].ids.push(node.id);
});

// Download each format group
for (const [formatKey, { ids, scale }] of Object.entries(assetsByFormat)) {
  if (ids.length === 0) continue;

  const format = formatKey.split("@")[0] as "svg" | "png" | "jpg";

  const downloaded = await figma.downloadImages(fileKey, {
    ids,
    outputDir: `assets/${formatKey}`,
    format,
    scale: scale || 1,
    parallel: 5,
  });

  console.log(`Downloaded ${downloaded.length} assets as ${formatKey}`);
}
```

## Format Comparison

| Format   | Pros                                        | Cons                         | Best For                 |
| -------- | ------------------------------------------- | ---------------------------- | ------------------------ |
| **SVG**  | Infinite scaling, small file size, editable | Not for photos               | Icons, logos, vector art |
| **PNG**  | Lossless, transparency, wide support        | Large file size              | Screenshots, UI elements |
| **JPG**  | Small file size                             | No transparency, lossy       | Photos, complex images   |
| **WebP** | Modern, excellent compression               | Older browsers don't support | Web graphics, photos     |

**Recommendation:** Use SVG for icons/vectors, PNG@2x for everything else.

## Automatic Fallback

The `getFile()` method automatically handles files of **any size**:

- **Small/Medium files** (< 10K nodes): Fast single-request path
- **Large files** (> 10K nodes): Automatic fallback to paginated fetching

You don't need to specify which approach to use - it's handled automatically. If the Figma API returns a size error (413, 500, etc.), the extractor will automatically switch to paginated fetching and continue.

## Final Output

### Simple (Single Format)

```
.claude/figma-outputs/2025-01-21-icon-set/
├── icon-set.toon
└── assets/
    ├── icon1.svg
    ├── icon2.svg
    └── icon3.svg
```

### Multi-Format

```
.claude/figma-outputs/2025-01-21-icon-set/
├── icon-set.toon
└── assets/
    ├── svg/
    │   ├── icon1.svg
    │   └── logo.svg
    ├── png@2x/
    │   ├── illustration1.png
    │   └── frame1.png
    └── png@1x/
        └── photo1.png
```
