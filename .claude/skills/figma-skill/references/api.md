# Figma Skill API Reference

**MANDATORY - READ ENTIRE FILE**

Complete API documentation for the `figma-skill` npm package.

## FigmaExtractor

### Constructor

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const figma = new FigmaExtractor({
  token: await requireEnv("../../.env", "FIGMA_TOKEN"),
  cache: true,         // Enable caching (default: true)
  cacheSize: 100,      // Max cached items
  maxRetries: 3,       // Retry attempts
  timeout: 30000,      // Request timeout (ms)
  concurrent: 10,      // Max concurrent requests
});
```

**Options:**
- `token` (string, required) - Figma personal access token
- `cache` (boolean, optional) - Enable response caching
- `cacheSize` (number, optional) - Max number of cached responses
- `maxRetries` (number, optional) - Number of retry attempts for failed requests
- `timeout` (number, optional) - Request timeout in milliseconds
- `concurrent` (number, optional) - Maximum concurrent requests

### getFile

Get complete Figma design file.

```typescript
const design = await figma.getFile(fileKey, {
  format: "toon",     // "toon" (string) or "json" (SimplifiedDesign object)
  extractors: allExtractors,  // Optional: customize extraction
  includeComponents: true,
  includeComponentSets: true,
});
```

**Parameters:**
- `fileKey` (string) - Figma file key from URL

**Options:**
- `format` ("toon" | "json") - Output format
  - `"toon"`: Returns string, 30-60% smaller than JSON
  - `"json"`: Returns SimplifiedDesign object
- `extractors` (Extractors) - Customize what properties to extract
- `includeComponents` (boolean) - Include component definitions
- `includeComponentSets` (boolean) - Include component set definitions

**Returns:**
- `format: "toon"` - string (TOON format)
- `format: "json"` - SimplifiedDesign object

**SimplifiedDesign:**
```typescript
interface SimplifiedDesign {
  name: string;
  nodes: SimplifiedNode[];
  components: Record<string, Component>;
  componentSets: Record<string, ComponentSet>;
  globalVars: GlobalVars;
}
```

### getNodes

Get specific nodes by IDs.

```typescript
const result = await figma.getNodes(fileKey, {
  ids: ["node-id-1", "node-id-2"],
});
```

**Parameters:**
- `fileKey` (string) - Figma file key
- `options.ids` (string[]) - Array of node IDs

**Returns:** Promise with nodes matching the provided IDs

### getImageUrls

Get export URLs for images.

```typescript
const images = await figma.getImageUrls(fileKey, {
  ids: ["node-id-1", "node-id-2"],
  format: "png",
  scale: 2,
});
```

**Parameters:**
- `fileKey` (string) - Figma file key
- `options.ids` (string[]) - Node IDs to export
- `options.format` ("png" | "jpg" | "svg" | "pdf") - Export format
- `options.scale` (number) - Scale for PNG/JPG (1-4)

**Returns:** Promise<ImageUrl[]>
```typescript
interface ImageUrl {
  id: string;
  url: string;
  format: string;
  scale: number;
}
```

### downloadImages

Download images to local directory.

```typescript
const downloaded = await figma.downloadImages(fileKey, {
  ids: ["node-id-1", "node-id-2"],
  outputDir: "./assets",
  format: "svg",
  scale: 1,
  parallel: 5,
});
```

**Parameters:**
- `fileKey` (string) - Figma file key
- `options.ids` (string[]) - Node IDs to download
- `options.outputDir` (string) - Output directory path
- `options.format` ("svg" | "png" | "jpg") - Download format
- `options.scale` (number) - Scale for PNG/JPG
- `options.parallel` (number) - Concurrent download limit

**Returns:** Promise<DownloadedImage[]>
```typescript
interface DownloadedImage {
  id: string;
  path: string;
  url: string;
  size: number;
}
```

### getComponents

Get component definitions.

```typescript
const components = await figma.getComponents(fileKey);
```

**Returns:** Promise<Record<string, Component>>

### getComponentSets

Get component set definitions.

```typescript
const componentSets = await figma.getComponentSets(fileKey);
```

**Returns:** Promise<Record<string, ComponentSet>>

## Extraction Options

### Pre-configured Extractors

```typescript
import {
  allExtractors,     // Everything (default)
  layoutAndText,     // Layout + text only
  contentOnly,       // Text content only
  visualsOnly,       // Visual properties only
} from "figma-skill";
```

**allExtractors:** Extract all properties
- Layout: position, size, rotation
- Visual: fills, strokes, effects
- Content: text, characters
- Structure: children, parenting

**layoutAndText:** Layout and text content
- Position, size, rotation
- Text content and styling
- Basic structure

**contentOnly:** Text content only
- Text strings
- Character styles
- Minimal structure

**visualsOnly:** Visual properties
- Fills, strokes, effects
- Colors, gradients
- No position/text

### Custom Extraction

```typescript
const design = await figma.getFile(fileKey, {
  extractors: layoutAndText,
  nodeFilter: (node) => node.type === "FRAME" && node.visible !== false,
  maxDepth: 5,
});
```

**Options:**
- `extractors` (Extractors) - What to extract
- `nodeFilter` (function) - Filter nodes by condition
- `maxDepth` (number) - Maximum depth to traverse

## SimplifiedNode Structure

```typescript
interface SimplifiedNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;

  // Layout
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;

  // Visual
  fills?: Fill[];
  strokes?: Stroke[];
  effects?: Effect[];
  opacity?: number;

  // Content
  text?: string;
  characters?: string;
  fontSize?: number;
  fontFamily?: string;

  // Structure
  children?: SimplifiedNode[];
  parentId?: string;
}
```

## Logging and Debugging

### Set Log Level

```typescript
figma.setLogLevel("debug");
// 'debug' | 'info' | 'warn' | 'error' | 'silent'
```

**Levels:**
- `debug` - Detailed logging for development
- `info` - General information (default)
- `warn` - Warnings only
- `error` - Errors only
- `silent` - No output

### Cache Management

```typescript
// Get cache stats
const stats = figma.getCacheStats();
console.log(stats);
// { size: 45, maxSize: 100, pending: 2 }

// Clear cache
figma.clearCache();
```

### Rate Limiter Stats

```typescript
const limiterStats = figma.getRateLimiterStats();
console.log(limiterStats);
// { concurrent: 3, maxConcurrent: 10, queued: 7 }
```

## Progress Output

During extraction, you'll see progress like:

```
[INFO] File too large, using paginated approach
[0.0%] Fetching top-level nodes... 15 nodes
[5.2%] Fetched 100/1920 nodes
[10.4%] Fetched 200/1920 nodes
...
[100.0%] Fetched 1920/1920 nodes
```

During downloads:

```
[============================================================] 100% | 45/45
```

## Error Types

```typescript
import {
  AuthenticationError,
  FigmaApiError,
  RateLimitError,
} from "figma-skill";
```

**AuthenticationError:** Invalid or missing token
**RateLimitError:** API rate limit exceeded
**FigmaApiError:** General API errors

## Package Structure

**Classes:**
- `FigmaExtractor` - Main client class

**Utilities:**
- `requireEnv()` - Load environment variables with validation
- `toToon()` - Convert SimplifiedDesign to TOON format string

**Types:**
- `SimplifiedDesign` - Complete design structure
- `SimplifiedNode` - Individual node structure
- `Component` - Component definition
- `ComponentSet` - Component set definition

**Constants:**
- `allExtractors` - Extract all properties
- `layoutAndText` - Layout and text only
- `contentOnly` - Text content only
- `visualsOnly` - Visual properties only
