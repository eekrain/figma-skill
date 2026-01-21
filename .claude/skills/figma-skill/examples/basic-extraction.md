# Basic Extraction Example

Extract a single Figma design to TOON format.

## User Request

"Extract this Figma design: https://www.figma.com/design/7kRmPqZ8fTnQJ9bH4LxC0a/Profile-Dashboard-NewFlow?node-id=8202-55990&t=Kf92WvG7sYqLpXcD-3
"

## AI Agent Workflow

1. **Extract file key**: `abc123` from URL
2. **Create output directory**: `.claude/figma-outputs/2025-01-21-my-design/`
3. **Create package.json**:
   ```json
   {
     "name": "2025-01-21-my-design",
     "module": "script.ts",
     "type": "module",
     "private": true,
     "dependencies": { "figma-skill": "0.1.0" },
     "devDependencies": { "@types/bun": "latest" },
     "peerDependencies": { "typescript": "^5" }
   }
   ```
4. **Create tsconfig.json** (use template)
5. **Generate script.ts**:

   ```typescript
   import { FigmaExtractor, requireEnv } from "figma-skill";

   // Load token and throw if missing (stops script immediately)
   const token = await requireEnv("../../.env", "FIGMA_TOKEN");

   const figma = new FigmaExtractor({ token, cache: true });
   const design = await figma.getFile("abc123", { format: "toon" });

   // design is a string when format is "toon"
   await Bun.write("my-design.toon", design);
   console.log(`Design saved to my-design.toon`);
   ```

6. **Run**: `bun install && bun --print script.ts && bun run script.ts`
7. **Cleanup**: `rm script.ts package.json tsconfig.json && rm -rf node_modules`

## How It Works

The extractor automatically handles files of **any size**:

- **Small/Medium files** (< 10K nodes): Fast single-request path
- **Large files** (> 10K nodes): Automatic fallback to paginated fetching

You don't need to specify which approach to use - it's handled automatically. The extractor will:

1. First try the standard single-request approach (fast)
2. If the API returns a size error (413, 500, etc.), automatically fall back to paginated fetching
3. Track progress for both approaches with the same interface

### For Very Large Files (Optional Streaming)

If you want to process extremely large files (10,000+ nodes) with progress tracking and memory efficiency, you can use streaming:

```typescript
import { FigmaExtractor, requireEnv } from "figma-skill";

const token = await requireEnv("../../.env", "FIGMA_TOKEN");
const figma = new FigmaExtractor({ token });

const stream = await figma.streamFile("abc123", {
  chunkSize: 100, // Process 100 nodes per chunk
});

// Track progress
stream.progress.on("progress", (progress) => {
  console.log(
    `[${progress.percent.toFixed(1)}%] ${progress.processed}/${progress.total} nodes`
  );
});

// Process chunks incrementally
const allNodes = [];
for await (const chunk of stream) {
  allNodes.push(...chunk.nodes);
}

// Convert to TOON format for output
const { toToon } = await import("figma-skill");
const design = {
  name: "my-design",
  nodes: allNodes,
  components: {},
  componentSets: {},
  globalVars: { styles: {} },
};
await Bun.write("my-design.toon", toToon(design));
console.log(`Total nodes: ${allNodes.length}`);
```

Streaming also uses automatic fallback - if the file is too large for the standard API, it will automatically switch to paginated fetching.

## Final Output

```
.claude/figma-outputs/2025-01-21-my-design/
└── my-design.toon
```
