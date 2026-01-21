# Figma Skill Examples and Common Tasks

**MANDATORY - READ ENTIRE FILE**

Detailed examples and common tasks for Figma design extraction and processing.

## Table of Contents

- [Workflow Examples](#workflow-examples)
  - [Single Design Extraction](#single-design-extraction)
  - [Asset Download](#asset-download)
  - [Batch Processing](#batch-processing)
- [Common Tasks](#common-tasks)
  - [Extract Text Content](#extract-text-content)
  - [Generate CSS Variables](#generate-css-variables)
  - [Download All Frame Images](#download-all-frame-images)
  - [Analyze Design System](#analyze-design-system)
  - [Extract Components](#extract-components)
- [Error Handling Patterns](#error-handling-patterns)
- [Output Formatting](#output-formatting)

## Workflow Examples

### Single Design Extraction

Extract a single Figma design to TOON format.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

// URL: https://www.figma.com/design/abc123xyz/My-Design
const fileKey = "abc123xyz";

const design = await figma.getFile(fileKey, { format: "toon" });
await Bun.write("output/my-design.toon", design);
console.log("Design saved to output/my-design.toon");
```

### Asset Download

Extract design and download image assets.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";

// Extract both formats
const design = await figma.getFile(fileKey, { format: "json" });
const toonDesign = await figma.getFile(fileKey, { format: "toon" });
await Bun.write("output/design.toon", toonDesign);

// Find all image nodes
const imageNodes = design.nodes
  .filter((n) => n.type === "VECTOR" || n.type === "FRAME")
  .map((n) => n.id);

// Download assets
const downloaded = await figma.downloadImages(fileKey, {
  ids: imageNodes,
  outputDir: "output/assets",
  format: "svg",
  parallel: 5,
});

console.log(`Downloaded ${downloaded.length} assets to output/assets/`);
```

### Batch Processing

Process multiple Figma files with error handling.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true, concurrent: 5 });

const files = [
  { key: "abc123", name: "homepage" },
  { key: "def456", name: "dashboard" },
  { key: "ghi789", name: "components" },
];

const results = [];

for (const { key, name } of files) {
  console.log(`Processing: ${name}`);
  try {
    const design = await figma.getFile(key, { format: "json" });
    const toonDesign = await figma.getFile(key, { format: "toon" });
    await Bun.write(`output/${name}.toon`, toonDesign);

    const imageNodes = design.nodes
      .filter((n) => ["VECTOR", "FRAME", "INSTANCE"].includes(n.type))
      .map((n) => n.id);

    if (imageNodes.length > 0) {
      const downloaded = await figma.downloadImages(key, {
        ids: imageNodes,
        outputDir: `output/${name}-assets`,
        format: "svg",
        parallel: 5,
      });
      results.push({
        file: name,
        status: "success",
        nodes: design.nodes.length,
        assets: downloaded.length,
      });
    } else {
      results.push({
        file: name,
        status: "success",
        nodes: design.nodes.length,
        assets: 0,
      });
    }
  } catch (error) {
    console.error(`Failed: ${name}`, error);
    results.push({
      file: name,
      status: "failed",
      error: (error as Error).message,
    });
  }
}

// Summary
console.log("\nBATCH COMPLETE");
for (const r of results) {
  if (r.status === "success") {
    console.log(`✓ ${r.file}: ${r.nodes} nodes, ${r.assets} assets`);
  } else {
    console.log(`✗ ${r.file}: ${r.error}`);
  }
}
```

## Common Tasks

### Extract Text Content

Extract all text content for documentation or translation.

```typescript
import { FigmaExtractor, requireEnv, contentOnly } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";

// Extract only text content
const design = await figma.getFile(fileKey, {
  extractors: contentOnly,
  format: "json",
});

// Collect all text nodes
const textContent = design.nodes
  .filter((node) => node.text)
  .map((node) => ({
    name: node.name,
    text: node.text,
    type: node.type,
  }));

// Write to JSON
await Bun.write(
  "output/text-content.json",
  JSON.stringify(textContent, null, 2)
);

console.log(`Extracted ${textContent.length} text nodes`);
```

### Generate CSS Variables

Extract colors from design and generate CSS variables.

```typescript
import { FigmaExtractor, requireEnv, allExtractors } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";
const design = await figma.getFile(fileKey, {
  extractors: allExtractors,
  format: "json",
});

// Extract unique colors
const colors = new Map<string, string>();

design.nodes.forEach((node) => {
  if (node.fills) {
    node.fills.forEach((fill, index) => {
      if (typeof fill === "object" && fill.color) {
        const { r, g, b, a = 1 } = fill.color;
        const hex = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
          b * 255
        )}, ${a})`;
        const name = node.name || `color-${colors.size + 1}`;
        colors.set(name, hex);
      }
    });
  }
});

// Generate CSS variables
let css = ":root {\n";
for (const [name, color] of colors) {
  const varName = name.toLowerCase().replace(/\s+/g, "-");
  css += `  --${varName}: ${color};\n`;
}
css += "}";

await Bun.write("output/variables.css", css);
console.log(`Generated ${colors.size} CSS variables`);
```

### Download All Frame Images

Download all frames as high-resolution PNGs.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";
const design = await figma.getFile(fileKey, { format: "json" });

// Find all frames
const frameIds = design.nodes
  .filter((node) => node.type === "FRAME")
  .map((node) => node.id);

// Download as 2x PNG
const images = await figma.downloadImages(fileKey, {
  ids: frameIds,
  format: "png",
  scale: 2,
  outputDir: "output/frames",
  parallel: 5,
});

console.log(`Downloaded ${images.length} frame images`);
images.forEach((img) => {
  console.log(`  - ${img.path}: ${(img.size / 1024).toFixed(1)} KB`);
});
```

### Analyze Design System

Analyze component usage and design system structure.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";

// Get components
const components = await figma.getComponents(fileKey);
const componentSets = await figma.getComponentSets(fileKey);

// Analyze component types
const componentTypes = new Map<string, number>();
Object.values(components).forEach((component) => {
  const type = component.description || "Untitled";
  componentTypes.set(type, (componentTypes.get(type) || 0) + 1);
});

// Generate report
const report = {
  totalComponents: Object.keys(components).length,
  totalComponentSets: Object.keys(componentSets).length,
  componentTypes: Object.fromEntries(componentTypes),
};

await Bun.write(
  "output/design-system-report.json",
  JSON.stringify(report, null, 2)
);

console.log("Design System Analysis:");
console.log(`  Components: ${report.totalComponents}`);
console.log(`  Component Sets: ${report.totalComponentSets}`);
```

### Extract Components

Extract all components with their properties.

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

const fileKey = "abc123xyz";

const design = await figma.getFile(fileKey, {
  format: "json",
  includeComponents: true,
  includeComponentSets: true,
});

// Extract components
const componentsList = Object.entries(design.components).map(
  ([key, component]) => ({
    key,
    name: component.name,
    description: component.description,
    type: component.type,
  })
);

// Extract component sets
const componentSetsList = Object.entries(design.componentSets).map(
  ([key, set]) => ({
    key,
    name: set.name,
    variantCount: set.children?.length || 0,
  })
);

await Bun.write(
  "output/components.json",
  JSON.stringify({ components: componentsList, sets: componentSetsList }, null, 2)
);

console.log(`Extracted ${componentsList.length} components`);
console.log(`Extracted ${componentSetsList.length} component sets`);
```

## Error Handling Patterns

### Basic Error Handling

```typescript
import {
  AuthenticationError,
  RateLimitError,
  FigmaApiError,
} from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token, cache: true });

try {
  const design = await figma.getFile("abc123", { format: "toon" });
  await Bun.write("output/design.toon", design);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid FIGMA_TOKEN - check ../../.env");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited - wait and retry");
  } else if (error instanceof FigmaApiError) {
    console.error("API error:", error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Retry Logic

```typescript
async function extractWithRetry(fileKey: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const design = await figma.getFile(fileKey, { format: "toon" });
      return design;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Output Formatting

### JSON Output

```typescript
const design = await figma.getFile(fileKey, { format: "json" });
await Bun.write("output/design.json", JSON.stringify(design, null, 2));
```

### TOON Output (Recommended)

```typescript
const design = await figma.getFile(fileKey, { format: "toon" });
await Bun.write("output/design.toon", design); // Already a string
```

### Custom Output Format

```typescript
const design = await figma.getFile(fileKey, { format: "json" });

// Custom summary
const summary = {
  name: design.name,
  nodeCount: design.nodes.length,
  componentCount: Object.keys(design.components).length,
  types: new Set(design.nodes.map((n) => n.type)).size,
};

await Bun.write("output/summary.json", JSON.stringify(summary, null, 2));
```

### Markdown Report

```typescript
const design = await figma.getFile(fileKey, { format: "json" });

let markdown = `# ${design.name}\n\n`;
markdown += `## Summary\n`;
markdown += `- Nodes: ${design.nodes.length}\n`;
markdown += `- Components: ${Object.keys(design.components).length}\n`;
markdown += `- Component Sets: ${Object.keys(design.componentSets).length}\n\n`;

markdown += `## Node Types\n`;
const types = new Map<string, number>();
design.nodes.forEach((node) => {
  types.set(node.type, (types.get(node.type) || 0) + 1);
});
for (const [type, count] of types) {
  markdown += `- ${type}: ${count}\n`;
}

await Bun.write("output/report.md", markdown);
```

## Real-World Scenarios

### Design System Migration

```typescript
// Extract design system from old file, prepare for migration
const design = await figma.getFile(oldFileKey, { format: "json" });

const components = Object.entries(design.components).map(([key, comp]) => ({
  key,
  name: comp.name,
  props: extractComponentProps(comp),
}));

await Bun.write("migration-plan.json", JSON.stringify(components, null, 2));
```

### Asset Package Preparation

```typescript
// Prepare assets for development team
const files = ["icons", "illustrations", "photos"];

for (const category of files) {
  const design = await figma.getFile(`${category}-file-key`, {
    format: "json",
  });

  const assets = design.nodes
    .filter((n) => n.type === "VECTOR" || n.type === "FRAME")
    .map((n) => n.id);

  await figma.downloadImages(`${category}-file-key`, {
    ids: assets,
    outputDir: `dist/${category}`,
    format: "svg",
    parallel: 10,
  });
}
```

### Component Documentation

```typescript
// Generate component documentation
const design = await figma.getFile(fileKey, {
  format: "json",
  includeComponents: true,
});

let docs = "# Component Library\n\n";
for (const [key, comp] of Object.entries(design.components)) {
  docs += `## ${comp.name}\n`;
  docs += `${comp.description || "No description"}\n\n`;
  docs += `**Key:** \`${key}\`\n\n`;
}

await Bun.write("docs/components.md", docs);
```
