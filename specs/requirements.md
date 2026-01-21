# Technical Specifications

## System Architecture Requirements

### Package Overview

**Name**: `figma-skill`
**Version**: 0.1.0
**Type**: ES Module
**Description**: Efficient, modular Figma design data extraction for AI agents and developers

### Module Structure

```
figma-skill/
├── src/
│   ├── index.ts                    # Main entry point - exports all public APIs
│   │
│   ├── client/                     # Main client class
│   │   ├── index.ts                # FigmaExtractor class (main API entry point)
│   │   ├── auth.ts                 # Token management and validation
│   │   ├── cache.ts                # In-memory LRU cache implementation
│   │   ├── rate-limiter.ts         # Request queue and concurrency control
│   │   └── retry.ts                # Exponential backoff with jitter
│   │
│   ├── api/                        # Figma API wrapper layer
│   │   ├── index.ts                # API facade with typed methods
│   │   ├── files.ts                # GET /files/:key endpoint
│   │   ├── nodes.ts                # GET /nodes/:node_ids endpoint
│   │   ├── images.ts               # GET /images/:key endpoint
│   │   ├── components.ts           # Component set endpoints
│   │   └── pagination.ts           # Cursor-based pagination handler
│   │
│   ├── streaming/                  # Streaming API for large designs
│   │   ├── index.ts                # Stream exports (streamFile, streamNodes)
│   │   ├── file-streamer.ts        # File streaming with chunking
│   │   ├── node-streamer.ts        # Node streaming with depth control
│   │   └── progress-emitter.ts     # EventEmitter3-based progress tracking
│   │
│   ├── extractors/                 # Extraction pipeline (ported from mcp-reference)
│   │   ├── index.ts                # Export all extractors and utilities
│   │   ├── types.ts                # ExtractorFn, TraversalOptions, ExtractionContext
│   │   ├── node-walker.ts          # Single-pass tree traversal
│   │   ├── design-extractor.ts     # Main extraction orchestration
│   │   └── built-in.ts             # Built-in extractors (layout, text, visuals, component)
│   │
│   ├── transformers/               # Data transformers (ported from mcp-reference)
│   │   ├── index.ts                # Export all transformers
│   │   ├── layout.ts               # buildSimplifiedLayout()
│   │   ├── text.ts                 # extractTextStyle()
│   │   ├── style.ts                # parsePaint(), parseEffect()
│   │   ├── effects.ts              # buildSimplifiedEffects()
│   │   └── component.ts            # simplifyComponents()
│   │
│   ├── images/                     # Image processing module
│   │   ├── index.ts                # Image manager (downloadImages export)
│   │   ├── downloader.ts           # Parallel download with p-limit
│   │   ├── processor.ts            # Sharp-based crop, resize, format conversion
│   │   └── crop-calculator.ts      # Transform matrix parsing for crop regions
│   │
│   ├── types/                      # TypeScript types
│   │   ├── index.ts                # Main type exports
│   │   ├── api.ts                  # Figma API response types (re-export from @figma/rest-api-spec)
│   │   ├── extractor.ts            # ExtractorFn, TraversalOptions, SimplifiedDesign
│   │   └── output.ts               # SimplifiedNode, SimplifiedStyle types
│   │
│   └── utils/                      # Utilities
│       ├── logger.ts               # Structured logging (debug, info, warn, error)
│       ├── fetch-with-retry.ts     # HTTP client with retry logic
│       └── common.ts               # Shared utilities (deepClone, merge)
│
├── examples/                       # Usage examples for AI agents
│   ├── basic-fetch.js              # Basic file fetching example
│   ├── streaming-fetch.js          # Streaming API example
│   ├── custom-extractors.js        # Custom extractor creation
│   └── image-download.js           # Image download and processing
│
└── claude-skill/                   # Claude Skill distribution
    └── figma-extractor/
        ├── SKILL.md                # Skill instructions for Claude
        ├── scripts/
        │   ├── validate-env.js     # Environment validation helper
        │   └── quick-fetch.js      # Quick fetch utility
        ├── reference/
        │   ├── api-reference.md    # Complete API documentation
        │   ├── examples.md         # Usage examples
        │   └── troubleshooting.md # Common issues and solutions
        └── examples/               # Copied from examples/ above
            ├── basic-fetch.js
            ├── streaming-fetch.js
            ├── custom-extractors.js
            └── image-download.js
```

---

## Data Models and Structures

### Client Configuration

```typescript
interface FigmaExtractorConfig {
  token: string; // Figma personal access token
  cache?: boolean; // Enable caching (default: true)
  cacheSize?: number; // Max cached items (default: 100)
  maxRetries?: number; // Retry attempts (default: 3)
  timeout?: number; // Request timeout in ms (default: 30000)
  concurrent?: number; // Max parallel requests (default: 10)
  baseURL?: string; // Figma API base URL (default: https://api.figma.com/v1)
}
```

### Simplified Design Output

```typescript
interface SimplifiedDesign {
  fileKey: string;
  name: string;
  document: SimplifiedNode;
  components?: Map<string, SimplifiedNode>;
  styles?: {
    colors?: Map<string, SimplifiedPaint>;
    texts?: Map<string, SimplifiedTextStyle>;
    effects?: Map<string, SimplifiedEffect>;
  };
  metadata: {
    version: string;
    modifiedAt: Date;
    extractedAt: Date;
    nodeCount: number;
  };
}

interface SimplifiedNode {
  id: string;
  name: string;
  type: NodeType;
  visible?: boolean;
  layout?: SimplifiedLayout;
  text?: SimplifiedTextContent;
  styles?: SimplifiedStyles;
  effects?: SimplifiedEffect[];
  components?: ComponentInfo;
  children?: SimplifiedNode[];
  // Additional properties from custom extractors
  [key: string]: any;
}
```

### Extractor Types

```typescript
type ExtractorFn = (
  node: Figma.Node,
  result: SimplifiedNode,
  context: ExtractionContext
) => void | Promise<void>;

interface TraversalOptions {
  maxDepth?: number; // Max traversal depth (default: unlimited)
  nodeFilter?: (node: Figma.Node) => boolean; // Filter nodes
  extractors?: ExtractorFn[]; // Extractors to apply
  afterChildren?: (result: SimplifiedNode) => void; // Post-processing
  progress?: (current: number, total: number) => void; // Progress callback
}

interface ExtractionContext {
  depth: number;
  path: string[];
  components: Map<string, SimplifiedNode>;
  styles: Map<string, SimplifiedStyle>;
  options: TraversalOptions;
}
```

---

## API Specifications

### Main Client API

#### Constructor

```typescript
constructor(config: FigmaExtractorConfig)
```

Creates a new FigmaExtractor instance with the provided configuration.

#### getFile

```typescript
getFile(fileKey: string, options?: GetFileOptions): Promise<SimplifiedDesign>
```

Fetches and processes a complete Figma file.

**Options:**

```typescript
interface GetFileOptions {
  depth?: number; // Max traversal depth
  extractors?: ExtractorFn[]; // Custom extractors
  version?: string; // Specific file version
  branch?: string; // Specific branch
}
```

#### getNodes

```typescript
getNodes(fileKey: string, options: GetNodesOptions): Promise<SimplifiedNode[]>
```

Fetches specific nodes from a Figma file.

**Options:**

```typescript
interface GetNodesOptions {
  ids: string[]; // Node IDs to fetch
  depth?: number; // Max traversal depth
  extractors?: ExtractorFn[]; // Custom extractors
}
```

#### getComponents

```typescript
getComponents(fileKey: string, options?: GetComponentsOptions): Promise<ComponentSet>
```

Fetches all components from a file with automatic pagination.

**Returns:**

```typescript
interface ComponentSet {
  mainComponents: Map<string, SimplifiedNode>;
  componentSets: Map<string, SimplifiedNode>;
  metadata: {
    totalComponents: number;
    totalSets: number;
  };
}
```

#### getImageUrls

```typescript
getImageUrls(fileKey: string, options: GetImageUrlsOptions): Promise<Map<string, string>>
```

Gets image URLs without downloading. Returns map of nodeId → imageUrl.

**Options:**

```typescript
interface GetImageUrlsOptions {
  ids: string[];
  format: "png" | "jpg" | "svg" | "pdf";
  scale?: 1 | 2 | 3 | 4;
}
```

#### downloadImages

```typescript
downloadImages(fileKey: string, options: DownloadImagesOptions): Promise<DownloadResult[]>
```

Downloads and processes images from Figma.

**Options:**

```typescript
interface DownloadImagesOptions {
  ids: string[];
  format: "png" | "svg";
  scale?: 1 | 2 | 3 | 4;
  outputDir: string;
  parallel?: number; // Parallel downloads (default: 5)
}

interface DownloadResult {
  nodeId: string;
  filePath: string;
  width: number;
  height: number;
  format: string;
}
```

### Streaming API

#### streamFile

```typescript
streamFile(
  client: FigmaExtractor,
  fileKey: string,
  options?: StreamOptions
): FigmaStream
```

Creates a stream for processing large files incrementally.

**Stream Options:**

```typescript
interface StreamOptions {
  depth?: number;                   // Max traversal depth
  extractors?: ExtractorFn[];
  chunkSize?: number;               // Nodes per chunk (default: 50)
}

interface FigmaStream extends EventEmitter {
  on('progress', (progress: ProgressEvent) => void): this;
  on('chunk', (chunk: ChunkEvent) => void): this;
  on('complete', (design: SimplifiedDesign) => void): this;
  on('error', (error: Error) => void): this;
  [Symbol.asyncIterator](): AsyncIterator<ChunkEvent>;
}

interface ProgressEvent {
  percent: number;
  processed: number;
  total: number;
  currentChunk: number;
}

interface ChunkEvent {
  chunkIndex: number;
  nodes: SimplifiedNode[];
  isComplete: boolean;
}
```

### Extractor API

#### simplifyRawFigmaObject

```typescript
simplifyRawFigmaObject(
  raw: GetFileResponse | GetFileNodesResponse,
  extractors?: ExtractorFn[],
  options?: TraversalOptions
): SimplifiedDesign
```

Main extraction pipeline function. Processes raw Figma API response.

#### Built-in Extractors

```typescript
import {
  // Extract component definitions
  allExtractors,
  // Extract fills, strokes, effects
  componentExtractor,
  // Layout + text only
  contentOnly,
  // All of the above
  layoutAndText,
  layoutExtractor,
  // Visuals only
  layoutOnly,
  // Layout only
  // Extract position, size, auto-layout
  textExtractor,
  // Extract text content and typography
  visualsExtractor,
  // Text + visuals only
  visualsOnly,
} from "figma-skill/extractors";
```

#### Transformer API

```typescript
import {
  // Extract typography
  buildSimplifiedEffects,
  // Convert Figma paints to simplified format
  buildSimplifiedLayout,
  // Extract layout information
  extractTextStyle,
  parsePaint,
  // Extract effects
  simplifyComponents, // Extract component metadata
} from "figma-skill/transformers";
```

---

## User Interface Requirements

### Error Messages

All errors should be actionable and include:

- Error type (AuthenticationError, RateLimitError, NetworkError, ValidationError)
- Specific message describing what went wrong
- Suggested action to resolve
- Relevant context (fileKey, nodeId, request details)

**Example:**

```typescript
class RateLimitError extends Error {
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(`Rate limit exceeded. ${message}. Retry after ${retryAfter}s.`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}
```

### Progress Reporting

For long-running operations, provide progress updates:

```typescript
interface ProgressCallback {
  (current: number, total: number, message?: string): void;
}

// Usage
client.getFile(fileKey, {
  progress: (current, total, msg) => {
    console.log(`Progress: ${current}/${total} - ${msg}`);
  },
});
```

---

## Performance Requirements

### Latency Targets

- **API Request**: p95 < 500ms
- **Extraction**: 1000 nodes / 100ms (single-pass)
- **Cache Lookup**: < 1ms
- **Stream Chunk**: < 50ms for 50 nodes

### Memory Limits

- **Per 1000 Nodes**: < 10MB memory
- **Cache Size**: Configurable, default 100 items
- **Stream Buffer**: 1-2 chunks max in memory

### Concurrency

- **Default Parallel Requests**: 10
- **Max Parallel Image Downloads**: 10
- **Default Image Downloads**: 5
- **Request Queue**: FIFO with priority for cache hits

### Caching Strategy

- **Cache Key**: `${method}:${fileKey}:${nodeId}:${version}`
- **Cache TTL**: 5 minutes for files, 1 hour for components
- **Deduplication**: In-flight request deduplication
- **Hit Rate Target**: > 80% for repeated requests

---

## Security Considerations

### Token Management

- Never log or expose Figma access tokens
- Support token rotation without restarting
- Validate token format on initialization
- Clear sensitive data from error messages

### Request Validation

- Validate fileKey format (24-character alphanumeric)
- Validate node ID format
- Sanitize user-provided file paths
- Limit recursion depth to prevent stack overflow

### Rate Limiting

- Respect Figma's rate limits (120 requests/minute for free tier)
- Implement exponential backoff with jitter
- Queue requests when rate limit is approached
- Provide clear error messages when rate limited

---

## Integration Requirements

### Figma API Endpoints

```
GET /v1/files/:key                    # Get file data
GET /v1/files/:key/nodes              # Get specific nodes
GET /v1/images/:key                   # Get image URLs
GET /v1/files/:key/components         # Get component sets
```

### Figma API Headers

```typescript
{
  'X-Figma-Token': process.env.FIGMA_TOKEN,
  'Content-Type': 'application/json'
}
```

### Environment Variables

```bash
FIGMA_TOKEN=figma_personal_access_token
FIGMA_API_BASE_URL=https://api.figma.com/v1  # Optional override
```

---

## Claude Skill Integration

### SKILL.md Structure

```markdown
---
name: figma-extractor
description: Extract Figma design data efficiently using figma-skill npm package
---

# Figma Design Data Extraction

## Activation

Use when user needs to:

- Fetch Figma designs or components
- Extract layout, text, or style information
- Download images from Figma
- Stream large designs (10,000+ nodes)

## Quick Start

[bun setup instructions with package.json]

## Common Patterns

- Fetch Full Design
- Fetch Specific Nodes
- Stream Large Design
- Download Images
- Custom Extractors
```

### Helper Scripts

#### validate-env.js

```javascript
// Validates FIGMA_TOKEN is set and valid
export async function validateEnv() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN required");
  // Test token with minimal API call
}
```

#### quick-fetch.js

```javascript
// Quick fetch utility for common operations
export async function quickFetch(fileKey, options = {}) {
  const client = new FigmaExtractor({ token: process.env.FIGMA_TOKEN });
  return client.getFile(fileKey, options);
}
```

---

## Testing Requirements

### Unit Tests

- All modules have unit tests
- Mock external dependencies (Figma API, filesystem)
- Test error conditions and edge cases
- Target: 90%+ coverage

### Integration Tests

- Test against real Figma API
- Use test file fixtures
- Require `FIGMA_TEST_TOKEN` environment variable
- Test pagination, rate limiting, caching

### Performance Tests

- Benchmark extraction speed (nodes/ms)
- Measure memory usage (MB/1000 nodes)
- Test with files of varying sizes (100, 1000, 10000 nodes)
- Profile cache effectiveness

---

## Migration from MCP Server

### Key Differences

| Feature       | MCP Server          | NPM Package          |
| ------------- | ------------------- | -------------------- |
| Installation  | npx -y (always)     | bun install (once)   |
| Startup Time  | ~2s                 | ~100ms               |
| Caching       | No                  | Yes (in-memory LRU)  |
| Streaming     | No                  | Yes (async iterator) |
| Customization | Limited             | Full API access      |
| Testing       | Hard (MCP protocol) | Easy (standard JS)   |

### Migration Guide

```javascript
// Before (MCP Server)
{
  "mcpServers": {
    "Figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=xxx"]
    }
  }
}

// After (NPM Package + Skill)
import { FigmaExtractor } from 'figma-skill';
const client = new FigmaExtractor({ token: 'xxx' });
const design = await client.getFile('fileKey');
```
