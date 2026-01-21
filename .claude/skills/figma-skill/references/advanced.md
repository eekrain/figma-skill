# Figma Skill Advanced Features

**MANDATORY - READ ENTIRE FILE**

Advanced features for handling very large files (10K+ nodes), streaming, pagination, and performance optimization.

## Automatic File Size Handling

The extractor automatically handles files of any size without manual configuration:

- **Small/Medium files** (< 10K nodes): Fast single-request path
- **Large files** (> 10K nodes): Automatic fallback to paginated fetching
- **Progress tracking**: Automatic for both modes

You don't need to specify which approach. If the Figma API returns a size error (413, 500), the extractor automatically switches to paginated fetching.

## Streaming for Very Large Files

For files requiring explicit progress tracking and memory efficiency, use `streamFile()` or `streamNodes()`.

### When to Use Streaming

- Very large files (10K+ nodes)
- Need granular progress tracking
- Memory-constrained environments
- Real-time progress updates required

### Streaming Specific Nodes

When you need to stream specific nodes (from URL `node-id` parameter):

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token });

// Stream specific nodes by nodeId
const stream = await figma.streamNodes("abc123", ["1:2", "3:4"], {
  chunkSize: 50,
});

stream.progress.on("progress", (progress) => {
  console.log(
    `[${progress.percent.toFixed(1)}%] ${progress.processed}/${progress.total} nodes`
  );
});

const allNodes = [];
for await (const chunk of stream) {
  allNodes.push(...chunk.nodes);
}

console.log(`Total nodes: ${allNodes.length}`);
```

**When to use `streamNodes()` instead of `getFile()` with nodeId:**

- Multiple node IDs to stream
- Need progress tracking for node extraction
- Very large node structures requiring chunked processing

### Basic Streaming (Entire File)

```typescript
import { FigmaExtractor, requireEnv, toToon } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token });

const stream = await figma.streamFile("abc123", { chunkSize: 100 });

// Track progress
stream.progress.on("progress", (progress) => {
  console.log(
    `[${progress.percent.toFixed(1)}%] ${progress.processed}/${progress.total} nodes`
  );
});

// Process chunks
const allNodes = [];
for await (const chunk of stream) {
  allNodes.push(...chunk.nodes);
}

// Convert to TOON for output
const design = {
  name: "my-design",
  nodes: allNodes,
  components: {},
  componentSets: {},
  globalVars: { styles: {} },
};
await Bun.write("output/my-design.toon", toToon(design));
```

### Stream Options

```typescript
const stream = await figma.streamFile(fileKey, {
  chunkSize: 100, // Nodes per chunk (default: 100)
  extractors: allExtractors,
  includeComponents: true,
});
```

**Options:**

- `chunkSize` (number) - Nodes to fetch per chunk
  - Smaller values: More frequent updates, more API calls
  - Larger values: Fewer API calls, less frequent updates
  - Recommended: 50-200

### Progress Event Data

```typescript
stream.progress.on("progress", (progress) => {
  // progress.percent: number (0-100)
  // progress.processed: number (nodes fetched)
  // progress.total: number (estimated total nodes)
  // progress.phase: string ("fetching" | "complete")
});
```

## Memory Optimization

### Process Chunks Incrementally

Instead of accumulating all nodes, process each chunk immediately:

```typescript
for await (const chunk of stream) {
  // Process chunk immediately
  for (const node of chunk.nodes) {
    if (node.type === "TEXT") {
      // Extract text content
      await Bun.write("texts.txt", node.text + "\n", { create: true });
    }
  }
  // Chunk data discarded after iteration
}
```

### Use TOON Format

TOON format is 30-60% smaller than JSON:

```typescript
// Instead of saving JSON
await Bun.write("output.json", JSON.stringify(design)); // Large

// Use TOON format
await Bun.write("output.toon", toToon(design)); // Compact
```

### Minimal Extraction

Extract only needed properties:

```typescript
import { layoutAndText } from "figma-skill";

const stream = await figma.streamFile(fileKey, {
  chunkSize: 100,
  extractors: layoutAndText, // Only layout and text, no visuals
});
```

## Performance Tuning

### Concurrent Requests

Adjust concurrent requests based on rate limits:

```typescript
const figma = new FigmaExtractor({
  token,
  concurrent: 5, // Lower for rate-limited accounts
});
```

**Guidelines:**

- Default: 10 concurrent requests
- Rate-limited: 3-5 concurrent
- High quota: 15-20 concurrent

### Caching

Enable caching for repeated access:

```typescript
const figma = new FigmaExtractor({
  token,
  cache: true, // Enable caching
  cacheSize: 200, // Increase cache size for large projects
});
```

**Cache stats:**

```typescript
const stats = figma.getCacheStats();
if (stats.size >= stats.maxSize) {
  console.log("Cache full, consider increasing cacheSize");
}
```

### Timeout Configuration

Adjust timeout for slow networks:

```typescript
const figma = new FigmaExtractor({
  token,
  timeout: 60000, // 60 seconds for slow networks
  maxRetries: 5, // More retries for unstable connections
});
```

## Rate Limiting

### Understanding Rate Limits

Figma API rate limits:

- **Personal tier**: 120 requests/minute
- **Professional**: 360 requests/minute
- **Organization**: Higher limits

### Rate Limit Handling

The extractor automatically handles rate limits with exponential backoff.

```typescript
// Check rate limiter status
const stats = figma.getRateLimiterStats();
console.log(`Concurrent: ${stats.concurrent}/${stats.maxConcurrent}`);
console.log(`Queued: ${stats.queued}`);
```

### Manual Throttling

For very batch operations, add delays:

```typescript
for (const { key, name } of files) {
  const design = await figma.getFile(key, { format: "toon" });
  await Bun.write(`output/${name}.toon`, design);

  // Small delay between files
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
```

## Pagination Fallback

The extractor automatically falls back to pagination when needed:

```
[INFO] File too large, using paginated approach
[0.0%] Fetching top-level nodes... 15 nodes
[5.2%] Fetched 100/1920 nodes
[10.4%] Fetched 200/1920 nodes
...
[100.0%] Fetched 1920/1920 nodes
```

### Manual Pagination Detection

No need to manually detect. The extractor handles:

1. Initial file fetch
2. Size error detection (413, 500)
3. Automatic pagination switch
4. Progress tracking
5. Node deduplication

### Pagination with Streaming

For explicit control, use streaming:

```typescript
const stream = await figma.streamFile(fileKey, { chunkSize: 50 });

stream.progress.on("progress", (p) => {
  console.log(`[${p.percent.toFixed(1)}%] ${p.processed}/${p.total} nodes`);
});

for await (const chunk of stream) {
  // Process each chunk
  console.log(`Processing chunk with ${chunk.nodes.length} nodes`);
}
```

## Debugging Large Files

### Enable Debug Logging

```typescript
figma.setLogLevel("debug");
```

**Debug output includes:**

- API request details
- Pagination triggers
- Node processing stats
- Memory usage

### Monitor Performance

```typescript
console.time("extraction");
const stream = await figma.streamFile(fileKey);

let nodeCount = 0;
for await (const chunk of stream) {
  nodeCount += chunk.nodes.length;
  console.log(`Processed ${nodeCount} nodes`);
}

console.timeEnd("extraction");
```

### Error Recovery

```typescript
import { FigmaApiError } from "figma-skill";

try {
  const stream = await figma.streamFile(fileKey);
  for await (const chunk of stream) {
    // Process chunk
  }
} catch (error) {
  if (error instanceof FigmaApiError) {
    console.error("API Error:", error.message);
    console.error("Retry with smaller chunk size");

    // Retry with smaller chunk
    const stream = await figma.streamFile(fileKey, { chunkSize: 50 });
    for await (const chunk of stream) {
      // Process chunk
    }
  }
}
```

## Best Practices Summary

1. **Let the extractor decide** - Automatic fallback works for most cases
2. **Use streaming only when needed** - Progress tracking or memory constraints
3. **Optimize chunk size** - 50-200 nodes per chunk
4. **Process incrementally** - Don't accumulate all nodes in memory
5. **Use TOON format** - 30-60% smaller than JSON
6. **Adjust concurrency** - Based on rate limits
7. **Enable caching** - For repeated access
8. **Monitor progress** - Use debug logging for large files
