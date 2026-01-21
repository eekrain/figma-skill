# figma-skill

[![npm version](https://badge.fury.io/js/figma-skill.svg)](https://www.npmjs.com/package/figma-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A high-performance TypeScript SDK for extracting Figma design data. Optimized for AI workflows with token-efficient TOON format (30-60% smaller), automatic pagination for large files, and parallel image processing.

## Why figma-skill?

- **AI-Optimized**: TOON format reduces token usage by 30-60% compared to JSON, perfect for LLM consumption
- **Handles Any File Size**: Automatic fallback to paginated fetching - no configuration needed
- **Streaming API**: Memory-efficient chunk-based processing for files with 10K+ nodes
- **Built-in Image Processing**: Parallel download with crop, resize, and format conversion
- **Smart Caching**: LRU cache with 80%+ hit rate reduces API calls
- **Type-Safe**: Full TypeScript with @figma/rest-api-spec types
- **Resilient**: Auto-retry with exponential backoff, rate limiting, timeout handling

## Features

- **TOON Format**: 30-60% smaller than JSON, optimized for AI consumption
- **Automatic Fallback**: Handles files of any size without configuration
- **Streaming API**: Memory-efficient chunk-based processing for 10K+ nodes
- **Smart Caching**: LRU cache with 80%+ hit rate
- **Image Processing**: Parallel download with crop, resize, and format conversion
- **Pluggable Extractors**: Modular extraction pipeline for custom data needs
- **Type-Safe**: Full TypeScript with @figma/rest-api-spec types
- **Resilient**: Auto-retry with exponential backoff, rate limiting
- **Utility Functions**: `requireEnv`, logging, deduplication helpers

## Installation

```bash
npm install figma-skill
```

```bash
yarn add figma-skill
```

```bash
pnpm add figma-skill
```

```bash
bun add figma-skill
```

## Quick Start

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({
  token: process.env.FIGMA_ACCESS_TOKEN,
});

// Extract in TOON format (token-efficient)
const design = await client.getFile("abc123DEF", { format: "toon" });

// design is a string in TOON format
await Bun.write("design.toon", design);
```

## Table of Contents

- [Usage](#usage)
- [TOON Format](#toon-format)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

## Usage

### Basic File Extraction

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

const design = await client.getFile("fileKey", { format: "json" });

// Access extracted data
design.nodes.forEach((node) => {
  console.log(`${node.name}: ${node.type}`);
});
```

### Extract with TOON Format (Recommended)

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

// TOON format is 30-60% smaller than JSON
const toonDesign = await client.getFile("fileKey", { format: "toon" });
await Bun.write("design.toon", toonDesign);

// For programmatic access, use JSON format
const jsonDesign = await client.getFile("fileKey", { format: "json" });
console.log(jsonDesign.nodes.length);
```

### Get Specific Nodes

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

const design = await client.getNodes("fileKey", {
  ids: ["1:2", "1:3", "1:4"],
});
```

### Download Images

```typescript
import { FigmaExtractor } from "figma-skill";
// Deduplicated download (removes duplicates)
import { downloadImagesDeduplicated } from "figma-skill/images";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

// Basic download
const downloaded = await client.downloadImages("fileKey", {
  ids: ["1:2", "1:3"],
  outputDir: "./output/images",
  format: "svg",
  parallel: 5,
});

const deduped = await downloadImagesDeduplicated(
  [
    { id: "1:2", url: "https://..." },
    { id: "1:3", url: "https://..." },
    { id: "1:2", url: "https://..." }, // duplicate removed
  ],
  { outputDir: "./output/images" }
);
```

### Stream Large Files

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

// For progress tracking on very large files (10K+ nodes)
const stream = await client.streamFile("fileKey", {
  chunkSize: 100,
});

stream.progress.on("progress", (p) => {
  console.log(`${p.percent}% - ${p.processed}/${p.total} nodes`);
});

for await (const chunk of stream) {
  // Process chunk.nodes
}

// Note: getFile() also handles large files automatically via pagination
```

## TOON Format

TOON is a token-efficient format for design data that reduces file size by 30-60% compared to JSON. It's optimized for AI consumption and processing.

### Benefits

- **Smaller**: 30-60% reduction in tokens
- **AI-Friendly**: Optimized structure for LLM processing
- **Preserves Structure**: Maintains design hierarchy and relationships
- **Convert Back**: Can convert back to full JSON when needed

### Usage

```typescript
import { FigmaExtractor, toToon, fromToon } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

// Extract directly to TOON
const toonString = await client.getFile("fileKey", { format: "toon" });

// Or convert existing design
const design = await client.getFile("fileKey", { format: "json" });
const toonString = toToon(design);

// Convert back from TOON
const restored = fromToon(toonString);
```

### When to Use TOON vs JSON

| Use Case                | Format | Reason                 |
| ----------------------- | ------ | ---------------------- |
| AI processing           | `toon` | Token efficiency       |
| File storage            | `toon` | Smaller file size      |
| Node filtering/counting | `json` | Need structured access |
| Debugging               | `json` | Human-readable         |
| Final output            | `toon` | Always use TOON        |

## API Reference

### FigmaExtractor

Main client class for Figma API interactions.

#### Constructor

```typescript
new FigmaExtractor(config: FigmaExtractorConfig)
```

**Options:**

- `token` (string, required): Figma access token
- `baseUrl` (string, optional): API base URL (default: `https://api.figma.com/v1`)
- `timeout` (number, optional): Request timeout in ms (default: `30000`)
- `maxRetries` (number, optional): Max retry attempts (default: `3`)
- `cache` (boolean, optional): Enable caching (default: `true`)
- `cacheSize` (number, optional): Cache size (default: `100`)
- `concurrent` (number, optional): Max concurrent requests (default: `10`)

#### Methods

##### `getFile(fileKey, options?)`

Extract complete Figma file with automatic pagination fallback.

**Returns:** `Promise<SimplifiedDesign | string>` (string when `format: "toon"`)

**Options:**

- `format` (`"json" | "toon"`): Output format (default: `"json"`)
- `extractors`: Custom extractor functions
- `maxDepth`: Maximum traversal depth
- `nodeFilter`: Filter function for nodes
- `includeComponents`: Include component definitions (default: `true`)
- `includeComponentSets`: Include component set definitions (default: `true`)

##### `getNodes(fileKey, options)`

Extract specific nodes by IDs.

**Returns:** `Promise<SimplifiedDesign>`

**Options:**

- `ids` (string[], required): Node IDs to fetch
- `extractors`: Custom extractor functions
- `maxDepth`: Maximum traversal depth
- `nodeFilter`: Filter function for nodes

##### `streamFile(fileKey, config?)`

Stream file with chunk-based processing and automatic pagination fallback.

**Returns:** `AsyncGenerator` with attached `progress` emitter

##### `streamNodes(fileKey, ids, config?)`

Stream specific nodes.

**Returns:** `AsyncGenerator` with attached `progress` emitter

##### `getImageUrls(fileKey, options)`

Get image URLs for nodes.

**Returns:** `Promise<ImageUrlResult[]>`

##### `downloadImages(fileKey, options)`

Download images to local directory.

**Returns:** `Promise<DownloadedImageResult[]>`

##### `getComponents(fileKey)`

Get all components from file.

**Returns:** `Promise<Record<string, SimplifiedComponentDefinition>>`

##### `getComponentSets(fileKey)`

Get all component sets from file.

**Returns:** `Promise<Record<string, SimplifiedComponentSetDefinition>>`

##### `clearCache()`

Clear the internal cache.

**Returns:** `void`

##### `getCacheStats()`

Get cache statistics.

**Returns:** Cache stats object or `null` if cache disabled

##### `getRateLimiterStats()`

Get rate limiter statistics.

**Returns:** Rate limiter stats object

### Transformers

```typescript
import {
  buildSimplifiedEffects,
  buildSimplifiedLayout,
  buildSimplifiedStrokes,
  extractNodeText,
  extractTextStyle,
  formatRGBAColor,
  fromToon,
  hasTextStyle,
  isTextNode,
  parsePaint,
  simplifyComponentSets,
  simplifyComponents,
  toToon,
} from "figma-skill/transformers";
```

### Extractors

```typescript
import {
  SVG_ELIGIBLE_TYPES,
  allExtractors,
  collapseSvgContainers,
  componentExtractor,
  contentOnly,
  layoutAndText,
  layoutExtractor,
  layoutOnly,
  textExtractor,
  visualsExtractor,
  visualsOnly,
} from "figma-skill/extractors";
```

### Utilities

```typescript
import { requireEnv } from "figma-skill";

// Load environment variable with validation
const token = await requireEnv(".env", "FIGMA_TOKEN");
// Throws if not found, with clear error message
```

```typescript
import {
  debug,
  error,
  getLogLevel,
  info,
  setLogLevel,
  warn,
} from "figma-skill";

// Set logging level
setLogLevel(0); // 0=debug, 1=info, 2=warn, 3=error, 4=silent
```

### Image Processing

```typescript
import {
  calculateCropFromTransform,
  calculateCropRegions,
  convertFormat,
  cropImage,
  deduplicateDownloads,
  downloadImages,
  downloadImagesDeduplicated,
  generateDimensionCSS,
  getImageMetadata,
  processImage,
} from "figma-skill/images";

// Process image (crop, resize, convert)
const processed = await processImage("./input.png", "./output.webp", {
  crop: { left: 10, top: 10, width: 100, height: 100 },
  resize: { width: 50, height: 50 },
  format: "webp",
  quality: 80,
});

// Calculate crop from Figma transform
const crop = calculateCropFromTransform(transformMatrix);
```

## Advanced Usage

### Custom Extractors

Create custom extraction logic:

```typescript
const myExtractor = (node, result, context) => {
  if (node.type === "TEXT") {
    result.myCustomData = {
      content: node.characters,
      style: node.style,
    };
  }
};

const design = await client.getFile("fileKey", {
  extractors: [myExtractor],
});
```

### Node Filtering

Filter nodes during extraction:

```typescript
const design = await client.getFile("fileKey", {
  nodeFilter: (node) => {
    // Only process visible nodes
    return node.visible !== false;
  },
});
```

### Image Processing

Download and process images with crop calculation:

```typescript
import { calculateCropFromTransform } from "figma-skill/images";

// Calculate crop from Figma transform
const crop = calculateCropFromTransform(node.transform);

// Process with crop
const processed = await processImage(inputPath, outputPath, { crop });
```

### Progress Tracking

Track progress for long-running operations:

```typescript
// Streaming with progress
const stream = await client.streamFile("fileKey", { chunkSize: 100 });

stream.progress.on("progress", (p) => {
  console.log(`[${p.percent.toFixed(1)}%] ${p.processed}/${p.total} nodes`);
});

stream.progress.on("complete", (stats) => {
  console.log(`Complete: ${stats.totalNodes} nodes in ${stats.duration}ms`);
});

for await (const chunk of stream) {
  // Process chunk
}
```

### Error Handling

```typescript
import {
  AuthenticationError,
  FigmaApiError,
  NetworkError,
  RateLimitError,
} from "figma-skill";

try {
  const design = await client.getFile("fileKey");
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid Figma token");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited - automatic retry scheduled");
  } else if (error instanceof NetworkError) {
    console.error("Network issue - automatic retry scheduled");
  } else if (error instanceof FigmaApiError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`);
  }
}
```

## Examples

See `.claude/figma-skill/examples/` for comprehensive usage examples:

### [Basic Extraction](./.claude/figma-skill/examples/basic-extraction.md)

Extract a single Figma design to TOON format. Includes optional streaming for very large files.

### [Asset Download](./.claude/figma-skill/examples/asset-download.md)

Extract design and download image assets with automatic deduplication.

### [Batch Processing](./.claude/figma-skill/examples/batch-processing.md)

Process multiple Figma files with comprehensive error handling and progress tracking.

### Example: Single File Extraction

```typescript
import { FigmaExtractor } from "figma-skill";

const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });

// Automatic fallback handles files of any size
const design = await client.getFile("fileKey", { format: "toon" });
await Bun.write("design.toon", design);
```

## Performance

| Metric              | Target                           |
| ------------------- | -------------------------------- |
| API Latency (p95)   | <500ms                           |
| Extraction Speed    | 1000 nodes/100ms                 |
| Memory Usage        | <10MB per 1000 nodes             |
| Cache Hit Rate      | >80%                             |
| Max File Size       | Unlimited (automatic pagination) |
| TOON Size Reduction | 30-60% vs JSON                   |

### Automatic Pagination

For files exceeding API size limits, `getFile()` automatically falls back to paginated fetching:

```typescript
// Works for ANY file size - no configuration needed
const design = await client.getFile("largeFileKey", { format: "toon" });
// Automatically uses pagination if needed
```

No need to check file size or choose between APIs - it's handled transparently.

## Contributing

We welcome contributions! Please follow these guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/figma-skill.git
cd figma-skill

# Install dependencies
bun install

# Run tests
bun test

# Run linter
bun run lint

# Build package
bun run build
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure tests pass and code is linted
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push to your fork
7. Open a pull request

### Code Style

- Use TypeScript for all code
- Follow existing code structure
- Add tests for new features
- Update documentation as needed
- Run `bun run lint` before committing

### Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test src/client/index.test.ts
```

### Reporting Issues

Please report issues via GitHub Issues with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)

## Requirements

- Node.js 18 or higher
- Figma access token with appropriate permissions

## License

MIT

## Acknowledgments

Built with:

- [@figma/rest-api-spec](https://github.com/figma/rest-api-spec) - Figma API TypeScript types
- [eventemitter3](https://github.com/primus/eventemitter3) - Event emitter
- [lru-cache](https://github.com/isaacs/node-lru-cache) - LRU cache
- [sharp](https://github.com/lovell/sharp) - Image processing
