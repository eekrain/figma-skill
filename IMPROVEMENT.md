# Figma-Skill Improvement Plan

## Executive Summary

This plan details the enhancements needed to achieve feature parity with the `mcp-reference` package while preserving all of `figma-skill`'s unique advantages (streaming, Toon format, rate limiting, caching).

**Scope:**

- ✅ **Implement**: SVG Optimization, Style Deduplication, Advanced CSS Generation
- ❌ **Skip**: MCP Server (using Claude Skill directly), YAML Output (using Toon format)

**Goals:**

1. Achieve same capabilities as mcp-reference
2. Follow mcp-reference naming conventions and structure
3. Preserve all figma-skill ahead features
4. Minimize exported utility functions where possible

---

## Gap Analysis

### Current State Comparison

| Feature                 | figma-skill   | mcp-reference              | Gap        |
| ----------------------- | ------------- | -------------------------- | ---------- |
| **Layout Extraction**   | ✅ Basic      | ✅ Advanced + dedup        | ⚠️ Partial |
| **Text Extraction**     | ✅ Basic      | ✅ Advanced + dedup        | ⚠️ Partial |
| **Style Extraction**    | ✅ Simplified | ✅ Full + dedup + CSS vars | ❌ Gap     |
| **Effects**             | ✅            | ✅                         | ✅ Parity  |
| **Components**          | ✅            | ✅                         | ✅ Parity  |
| **SVG Optimization**    | ❌            | ✅ Container collapse      | ❌ Gap     |
| **Style Deduplication** | ❌            | ✅ Global vars system      | ❌ Gap     |
| **Advanced CSS**        | ❌            | ✅ Responsive vars         | ❌ Gap     |
| **Streaming**           | ✅            | ❌                         | ✅ Ahead   |
| **Toon Format**         | ✅            | ❌                         | ✅ Ahead   |
| **Rate Limiting**       | ✅            | ❌                         | ✅ Ahead   |
| **Caching**             | ✅            | ❌                         | ✅ Ahead   |

### Key Differences in Architecture

| Aspect                | figma-skill   | mcp-reference                      |
| --------------------- | ------------- | ---------------------------------- |
| **Style Handling**    | Direct values | Variable references + global dedup |
| **Named Styles**      | Not resolved  | Resolved to global vars            |
| **CSS Output**        | Basic values  | Production-ready CSS               |
| **Transformer Types** | Simplified    | Full-featured with CSS metadata    |

---

## Implementation Plan

**⚠️ CRITICAL REMINDER: Create a git commit after EACH successful phase!**

After completing any phase and verifying all checks pass:
```bash
git add .
git commit -m "refactor: phase X - [brief description]

- Summary of changes
- Verification results

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Phase 0: Structural Refactoring

**Goal:** Reorganize figma-skill directory structure to match mcp-reference for codebase familiarity.

This phase ensures both codebases share the same organizational structure, making it easier to navigate and maintain familiarity between them.

#### 0.1 Directory Structure Comparison

**Current figma-skill structure:**

```
src/
├── client/              # FigmaExtractor client (unique)
├── extractors/          # Data extraction
├── images/              # Image processing (unique)
├── streaming/           # Streaming support (unique)
├── transformers/        # Data transformation
├── types/               # Type definitions (separate dir)
├── utils/               # Utilities
├── index.ts             # Main exports
└── integration.test.ts  # Integration test
```

**mcp-reference structure (target):**

```
src/
├── extractors/          # Data extraction
│   ├── index.ts
│   ├── types.ts         # Types WITHIN extractors
│   ├── built-in.ts
│   ├── design-extractor.ts
│   └── node-walker.ts
├── transformers/        # Data transformation
├── utils/               # Utilities
├── services/            # Figma API service
├── tests/               # All tests in one place
├── index.ts             # Library exports
├── config.ts            # Configuration
├── server.ts            # HTTP server
└── bin.ts               # CLI entry
```

#### 0.2 File Moves and Restructuring

**New Files to Create:**

| Action | From | To                              |
| ------ | ---- | ------------------------------- |
| CREATE | —    | `src/utils/identity.ts`         |
| CREATE | —    | `src/utils/image-processing.ts` |
| CREATE | —    | `src/tests/` (directory)        |

**Files to Move:**

| Action | From                            | To                                                |
| ------ | ------------------------------- | ------------------------------------------------- |
| MOVE   | `src/types/api.ts`              | `src/extractors/types.ts` (merge)                 |
| MOVE   | `src/types/output.ts`           | `src/extractors/types.ts` (merge)                 |
| MOVE   | `src/types/index.ts`            | `src/extractors/types.ts` (merge)                 |
| MOVE   | `src/utils/node-id.ts`          | `src/utils/image-processing.ts` (merge functions) |
| MOVE   | `src/images/crop-calculator.ts` | `src/utils/image-processing.ts` (merge)           |
| MOVE   | `src/images/processor.ts`       | `src/utils/image-processing.ts` (merge)           |
| MOVE   | `src/integration.test.ts`       | `src/tests/integration.test.ts`                   |
| MOVE   | `src/streaming/*.test.ts`       | `src/tests/streaming/*.test.ts`                   |
| MOVE   | `src/images/*.test.ts`          | `src/tests/images/*.test.ts`                      |
| MOVE   | `src/utils/*.test.ts`           | `src/tests/utils/*.test.ts`                       |

**Files to Keep (figma-skill unique):**

- `src/client/` — Keep as-is (main client class)
- `src/streaming/` — Keep as-is (unique advantage)
- `src/images/downloader.ts` — Keep (downloader logic)
- `src/images/manager.ts` — Keep (manager logic)
- `src/transformers/toon.ts` — Keep (unique Toon format)

#### 0.3 New File: src/utils/identity.ts

Create new file matching mcp-reference `src/utils/identity.ts`:

```typescript
// Match mcp-reference/src/utils/identity.ts
import type { Node } from "@figma/rest-api-spec";

/**
 * Check if node has a specific property
 */
export function hasValue<K extends keyof Node>(
  key: K,
  node: Node,
  guard?: (value: Node[K]) => boolean
): node is Node & Record<K, NonNullable<Node[K]>> {
  if (node[key] === null || node[key] === undefined) {
    return false;
  }
  return guard ? guard(node[key]) : true;
}

/**
 * Type guards for specific node types
 */
export function isFrame(
  node: Node
): node is Node & { type: "FRAME" | "COMPONENT" | "INSTANCE" } {
  return (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

export function isLayout(node: Node): node is Node & {
  layoutAlign?: string;
  layoutPositioning?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
} {
  return "layoutAlign" in node || "layoutPositioning" in node;
}

export function isRectangle<K extends keyof Node>(
  key: K,
  node: Node
): node is Node & Record<K, NonNullable<Node[K]>> {
  return key in node && node[key] !== null && node[key] !== undefined;
}

export function isRectangleCornerRadii(
  value: unknown
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === "number")
  );
}

export function isStrokeWeights(value: unknown): value is {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "top" in value &&
    "right" in value &&
    "bottom" in value &&
    "left" in value
  );
}

export function isInAutoLayoutFlow(node: Node, parent?: Node): boolean {
  if (!parent || !isFrame(parent)) return false;
  if (parent.layoutMode === "NONE") return false;
  if (node.layoutPositioning === "ABSOLUTE") return false;
  return true;
}

export function isTextNode(node: Node): node is Node & { type: "TEXT" } {
  return node.type === "TEXT";
}

export function hasTextStyle(node: Node): node is Node & {
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: { value?: number; unit?: string };
  letterSpacing?: { value?: number; unit?: string };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textCase?: string;
  textDecoration?: string;
} {
  return "fontSize" in node;
}
```

#### 0.4 Update: src/utils/common.ts

Expand existing `src/utils/common.ts` to match mcp-reference functions:

```typescript
// Add these functions to src/utils/common.ts

export type StyleId = `${string}_${string}` & { __brand: "StyleId" };

/**
 * Generate a 6-character random variable ID
 * Matches mcp-reference: generateVarId
 */
export function generateVarId(prefix: string = "var"): StyleId {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${result}` as StyleId;
}

/**
 * Generate CSS shorthand for TRBL values
 * Matches mcp-reference: generateCSSShorthand
 */
export function generateCSSShorthand(
  values: { top: number; right: number; bottom: number; left: number },
  { ignoreZero = true, suffix = "px" } = {}
): string | undefined {
  const { top, right, bottom, left } = values;
  if (ignoreZero && top === 0 && right === 0 && bottom === 0 && left === 0) {
    return undefined;
  }
  if (top === right && right === bottom && bottom === left) {
    return `${top}${suffix}`;
  }
  if (right === left) {
    if (top === bottom) {
      return `${top}${suffix} ${right}${suffix}`;
    }
    return `${top}${suffix} ${right}${suffix} ${bottom}${suffix}`;
  }
  return `${top}${suffix} ${right}${suffix} ${bottom}${suffix} ${left}${suffix}`;
}

/**
 * Check if element is visible
 * Matches mcp-reference: isVisible
 */
export function isVisible(element: { visible?: boolean }): boolean {
  return element.visible ?? true;
}

/**
 * Round to 2 decimals for pixel values
 * Matches mcp-reference: pixelRound
 */
export function pixelRound(num: number): number {
  if (isNaN(num)) throw new TypeError(`Input must be a valid number`);
  return Number(Number(num).toFixed(2));
}

/**
 * Remove empty keys from objects
 * Matches mcp-reference: removeEmptyKeys
 */
export function removeEmptyKeys<T>(input: T): T {
  if (typeof input !== "object" || input === null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => removeEmptyKeys(item)) as T;
  }
  const result = {} as T;
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = removeEmptyKeys(input[key]);
      if (
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0) &&
        !(
          typeof value === "object" &&
          value !== null &&
          Object.keys(value).length === 0
        )
      ) {
        result[key] = value;
      }
    }
  }
  return result;
}
```

#### 0.5 New File: src/utils/image-processing.ts

Create consolidated image processing utilities:

```typescript
// Consolidate image processing functions
// Matches mcp-reference/src/utils/image-processing.ts
import type { Transform } from "@figma/rest-api-spec";

/**
 * Generate a short hash from a transform matrix
 * Matches mcp-reference: generateTransformHash
 */
export function generateTransformHash(transform: Transform): string {
  const values = transform.flat();
  const hash = values.reduce((acc, val) => {
    const str = val.toString();
    for (let i = 0; i < str.length; i++) {
      acc = ((acc << 5) - acc + str.charCodeAt(i)) & 0xffffffff;
    }
    return acc;
  }, 0);

  return Math.abs(hash).toString(16).substring(0, 6);
}

// Export other image processing functions from existing files
export * from "./image-processing-crop";
export * from "./image-processing-processor";
```

#### 0.6 Update: src/extractors/types.ts

Consolidate all type definitions into one file (matching mcp-reference pattern):

```typescript
// Match mcp-reference/src/extractors/types.ts

// Re-export from @figma/rest-api-spec
export type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";

// Core extractor types
export interface ExtractorFn {
  (
    node: FigmaDocumentNode,
    result: SimplifiedNode,
    context: TraversalContext
  ): void;
}

export interface TraversalContext {
  globalVars: GlobalVars;
  currentDepth: number;
  parent?: FigmaDocumentNode;
}

export interface TraversalOptions {
  maxDepth?: number;
  nodeFilter?: (node: FigmaDocumentNode) => boolean;
  afterChildren?: (
    node: FigmaDocumentNode,
    result: SimplifiedNode,
    children: SimplifiedNode[]
  ) => SimplifiedNode[];
}

// Output types
export interface SimplifiedNode {
  id: string;
  name: string;
  type: string;
  layout?: string;
  text?: string;
  textStyle?: string;
  fills?: string;
  strokes?: string;
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
  effects?: string;
  opacity?: number;
  borderRadius?: string;
  componentId?: string;
  componentProperties?: Array<{ name: string; value: string; type: string }>;
  children?: SimplifiedNode[];
}

// Global variables for style deduplication
export type StyleTypes =
  | import("../transformers/layout").SimplifiedLayout
  | import("../transformers/text").SimplifiedTextStyle
  | SimplifiedFill[]
  | import("../transformers/style").SimplifiedStroke
  | import("../transformers/effects").SimplifiedEffects;

export type SimplifiedFill =
  | import("../transformers/style").SimplifiedImageFill
  | import("../transformers/style").SimplifiedGradientFill
  | import("../transformers/style").SimplifiedPatternFill
  | import("../transformers/style").CSSRGBAColor
  | import("../transformers/style").CSSHexColor;

export interface GlobalVars {
  styles: Record<string, StyleTypes>;
  extraStyles?: Record<string, { name: string }>;
}

export interface SimplifiedDesign {
  nodes: SimplifiedNode[];
  globalVars: GlobalVars;
}
```

#### 0.7 Update Import Paths

After restructuring, update all imports:

**Pattern changes:**

```typescript
// Before
import { hasValue } from "@/utils/common";
import type { SimplifiedNode } from "@/types/output";

// After (matching mcp-reference)
import { hasValue } from "@/utils/identity.js";
import type { SimplifiedNode } from "@/extractors/types.js";
```

#### 0.8 Delete Removed Files

After merging and moving, delete these files:

- `src/types/` directory (contents moved to `src/extractors/types.ts`)
- `src/utils/node-id.ts` (functions merged to `src/utils/image-processing.ts`)
- `src/images/crop-calculator.ts` (functions merged)
- `src/images/processor.ts` (functions merged)
- `src/utils/index.ts` (re-export only, functions used directly)

#### 0.9 Final Structure After Phase 0

```
src/
├── client/              # FigmaExtractor client (unique, keep)
│   └── index.ts
├── extractors/          # Data extraction
│   ├── index.ts         # Export extractors
│   ├── types.ts         # ALL types (merged from types/)
│   ├── built-in.ts      # Built-in extractors
│   ├── node-walker.ts   # Node traversal
│   └── design-extractor.ts # High-level extraction
├── images/              # Image management (unique, keep)
│   ├── downloader.ts    # Download logic
│   ├── manager.ts       # Manager logic
│   └── index.ts         # Barrels
├── streaming/           # Streaming support (unique, keep)
│   ├── file-streamer.ts
│   ├── node-streamer.ts
│   ├── paginated-fetcher.ts
│   ├── progress-emitter.ts
│   └── index.ts
├── transformers/        # Data transformation
│   ├── layout.ts
│   ├── text.ts
│   ├── style.ts
│   ├── effects.ts
│   ├── component.ts
│   ├── toon.ts          # Toon format (unique)
│   └── index.ts
├── utils/               # Utilities (matching mcp-reference)
│   ├── common.ts        # generateVarId, generateCSSShorthand, etc.
│   ├── identity.ts      # NEW: hasValue, type guards
│   ├── image-processing.ts # NEW: consolidated image utils
│   ├── fetch-with-retry.ts
│   ├── logger.ts
│   ├── cache.ts
│   ├── rate-limiter.ts
│   └── dotenv.ts
├── tests/               # NEW: All tests in one place
│   ├── integration.test.ts
│   ├── streaming/
│   │   ├── file-streamer.test.ts
│   │   ├── node-streamer.test.ts
│   │   ├── paginated-fetcher.test.ts
│   │   └── progress-emitter.test.ts
│   ├── images/
│   │   ├── crop-calculator.test.ts
│   │   ├── downloader.test.ts
│   │   └── processor.test.ts
│   └── utils/
│       ├── cache.test.ts
│       ├── dotenv.test.ts
│       ├── fetch-with-retry.test.ts
│       ├── node-id.test.ts
│       └── rate-limiter.test.ts
└── index.ts             # Main exports
```

#### 0.10 Export Consolidation (Minimize Public API)

**Goal:** Reduce exported utility functions to only what users genuinely need. Internal implementation details should not be part of the public API.

**Current Exports Analysis:**

```typescript
// CURRENT: src/index.ts (too many exports)
export { FigmaExtractor } from "@/client/index";

export type {} from /* 16 types */ "@/types/index";

export {
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warn,
  error,
} from "@/utils/logger";
export {
  FigmaApiError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
} from "@/utils/fetch-with-retry";
export { FigmaCache } from "@/utils/cache";
export { RateLimiter } from "@/utils/rate-limiter";
export { requireEnv } from "@/utils/dotenv";
export type { EnvVars } from "@/utils/dotenv";
export {
  EnvParseError,
  EnvFileNotFoundError,
  EnvReadError,
} from "@/utils/dotenv";
```

**Removed Exports (internal implementation details):**

| Export                                              | Reason                  | User Alternative                                |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `debug, info, warn, error`                          | Logger functions        | Users can use `console.log` or their own logger |
| `AuthenticationError, RateLimitError, NetworkError` | Subclass errors         | Users catch `FigmaApiError` base class          |
| `requireEnv`                                        | Internal utility        | Users provide token directly                    |
| `EnvParseError, EnvFileNotFoundError, EnvReadError` | Internal errors         | Not needed for user code                        |
| `StreamChunk`                                       | Internal streaming type | Users only need `StreamProgress`                |

**Removed from Transformers (internal functions):**

| Export                                      | Reason               | User Alternative               |
| ------------------------------------------- | -------------------- | ------------------------------ |
| `buildSimplifiedLayout`                     | Internal transformer | Users use `layoutExtractor`    |
| `isTextNode, hasTextStyle`                  | Internal type guards | Not needed externally          |
| `extractNodeText, extractTextStyle`         | Internal functions   | Users use `textExtractor`      |
| `parsePaint, buildSimplifiedStrokes`        | Internal functions   | Users use `visualsExtractor`   |
| `formatRGBAColor`                           | Internal function    | Not needed externally          |
| `buildSimplifiedEffects`                    | Internal function    | Users use `visualsExtractor`   |
| `simplifyComponents, simplifyComponentSets` | Internal functions   | Users use `componentExtractor` |

**Updated src/index.ts (minimized exports):**

```typescript
// Main client
export { FigmaExtractor } from "@/client/index";

// Essential types for users
export type {
  FigmaExtractorConfig,
  GetFileOptions,
  GetNodesOptions,
  GetImageUrlsOptions,
  DownloadImagesOptions,
  SimplifiedDesign,
  StreamProgress,
  ImageUrlResult,
  DownloadedImageResult,
} from "@/extractors/types";

// Re-export Figma API types users commonly need
export type {
  Node,
  Component,
  ComponentSet,
  GetFileResponse,
  GetImagesResponse,
} from "@figma/rest-api-spec";

// Extractors (for custom extraction)
export {
  extractFromDesign,
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
  allExtractors,
  layoutAndText,
  contentOnly,
  visualsOnly,
  layoutOnly,
  collapseSvgContainers,
  SVG_ELIGIBLE_TYPES,
} from "@/extractors/index";

// Toon format (unique advantage - keep!)
export { toToon, fromToon } from "@/transformers/toon";

// Logger (minimal - users control their own logging)
export { setLogLevel, getLogLevel } from "@/utils/logger";

// Error handling (base class only)
export { FigmaApiError } from "@/utils/fetch-with-retry";

// Advanced utilities (for power users)
export { FigmaCache } from "@/utils/cache";
export { RateLimiter } from "@/utils/rate-limiter";

// NO individual transformer functions
// NO internal utility functions
// NO logger debug/info/warn/error functions
// NO dotenv-related exports
```

**Updated src/transformers/index.ts (types only):**

```typescript
// Types only - for type checking, not for direct use
export type { SimplifiedLayout } from "./layout";
export type { SimplifiedTextStyle } from "./text";
export type {
  SimplifiedFill,
  SimplifiedStroke,
  ColorValue,
  CSSRGBAColor,
  CSSHexColor,
} from "./style";
export type { SimplifiedEffects } from "./effects";
export type {
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
} from "./component";

// Keep only Toon format (public API feature)
export { toToon, fromToon } from "./toon";

// DO NOT export individual transformer functions
// They are internal - users use extractors instead
```

**Deleted: src/utils/index.ts**

```typescript
// DELETE THIS FILE - it's just a re-export barrel
// Users import from specific utility files directly if needed
```

#### 0.11 Phase 0 Checklist

- [ ] Create `src/utils/identity.ts`
- [ ] Create `src/utils/image-processing.ts`
- [ ] Create `src/tests/` directory
- [ ] Move types from `src/types/` to `src/extractors/types.ts`
- [ ] Move image processing to `src/utils/image-processing.ts`
- [ ] Move all test files to `src/tests/`
- [ ] Update all import paths
- [ ] **Consolidate exports:**
  - [ ] Update `src/index.ts` (remove unnecessary exports)
  - [ ] Update `src/transformers/index.ts` (remove function exports)
  - [ ] Delete `src/utils/index.ts`
  - [ ] Verify internal code still works (may need direct imports)
- [ ] Delete `src/types/` directory
- [ ] **Verification:**
  - [ ] Run TypeScript compilation: `npm run build` or `tsc --noEmit`
  - [ ] Run ESLint: `npm run lint` or `eslint src/`
  - [ ] Run tests: `npm test`
  - [ ] Check diagnostics: Verify no TypeScript errors
- [ ] Update tsconfig.json paths if needed
- [ ] Update README.md with new export surface

---

#### 0.12 TypeScript & ESLint Verification (For All Phases)

**After each phase, verify the codebase has no errors:**

##### Verification Commands

```bash
# 1. TypeScript type checking
npm run build
# OR
npx tsc --noEmit

# 2. ESLint checking
npm run lint
# OR
npx eslint src/

# 3. Run tests
npm test
# OR
npm run test

# 4. Using MCP IDE diagnostics
# (if available in your environment)
# Check for TypeScript and ESLint diagnostics
```

##### Expected Results

| Check          | Expected                        | Action on Failure                     |
| -------------- | ------------------------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ No errors                    | Fix type errors before continuing     |
| `eslint src/`  | ✅ No errors (or warnings only) | Fix lint errors before continuing     |
| `npm test`     | ✅ All tests pass               | Fix failing tests before continuing   |
| Diagnostics    | ✅ No red squigglies            | Fix all diagnostics before continuing |

##### Common Issues to Watch For

1. **Import path errors** after moving files
   - Update imports to use new paths
   - Check tsconfig.json `paths` configuration

2. **Type mismatches** after consolidating types
   - Ensure type exports match new structure
   - Re-export types from correct locations

3. **Missing exports** after consolidation
   - Internal files may need direct imports
   - Update imports to use `@/` path aliases

4. **ESLint errors** for unused imports
   - Remove unused imports after consolidation
   - Run `eslint --fix` to auto-fix

##### Pre-Phase Verification Checklist

Before starting ANY phase, verify baseline:

```bash
# Baseline verification
git status                    # Ensure clean working state
git pull                      # Ensure latest code
npm install                   # Ensure dependencies current
npm run build                 # Ensure builds pass
npm run lint                  # Ensure lint passes
npm test                      # Ensure tests pass
```

##### Post-Phase Verification Checklist

**⚠️ IMPORTANT: Create a git commit AFTER each successful phase!**

After completing EACH phase and verifying all checks pass:

```bash
# 1. Type checking
npx tsc --noEmit

# 2. Linting
npx eslint src/ --max-warnings=0

# 3. Tests
npm test

# 4. Build
npm run build

# 5. ✅ CREATE GIT COMMIT (after all verifications pass)
git add .
git commit -m "refactor: phase X - [brief description]

Co-Authored-By: Claude <noreply@anthropic.com>"

# 6. Quick smoke test (if applicable)
node -e "const { FigmaExtractor } = require('./dist'); console.log('✅ Import works')"
```

##### Using MCP IDE Diagnostics

If using the MCP IDE integration:

```typescript
// Get all diagnostics
const diagnostics = await getDiagnostics();

// Check for TypeScript errors
const tsErrors = diagnostics.filter((d) => d.source === "typescript");
if (tsErrors.length > 0) {
  console.error("TypeScript errors:", tsErrors);
  process.exit(1);
}

// Check for ESLint errors
const eslintErrors = diagnostics.filter((d) => d.source === "eslint");
if (eslintErrors.length > 0) {
  console.error("ESLint errors:", eslintErrors);
  process.exit(1);
}
```

---

### Phase 1: Foundation - Type System & Utilities

#### 1.1 Update Type Definitions

**File**: `src/types/index.ts`

Add missing types to match mcp-reference:

```typescript
// Add to existing types
export type StyleTypes =
  | SimplifiedLayout
  | SimplifiedTextStyle
  | SimplifiedFill[]
  | SimplifiedStroke
  | SimplifiedEffects;

export interface GlobalVars {
  styles: Record<string, StyleTypes>;
  extraStyles?: Record<string, { name: string }>;
}

// Update SimplifiedFill to match mcp-reference
export type ColorValue = {
  hex: `#${string}`;
  opacity: number;
};

export type CSSRGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type CSSHexColor = `#${string}`;

export type SimplifiedImageFill = {
  type: "IMAGE";
  imageRef: string;
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH";
  scalingFactor?: number;
  backgroundSize?: string;
  backgroundRepeat?: string;
  isBackground?: boolean;
  objectFit?: string;
  imageDownloadArguments?: {
    needsCropping: boolean;
    requiresImageDimensions: boolean;
    cropTransform?: Transform;
    filenameSuffix?: string;
  };
};

export type SimplifiedGradientFill = {
  type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  gradient: string;
};

export type SimplifiedPatternFill = {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
};

export type SimplifiedFill =
  | SimplifiedImageFill
  | SimplifiedGradientFill
  | SimplifiedPatternFill
  | CSSRGBAColor
  | CSSHexColor;
```

#### 1.2 Add Common Utilities

**New File**: `src/utils/common.ts` (expand existing or create matching structure)

```typescript
// Match mcp-reference/src/utils/common.ts

export type StyleId = `${string}_${string}` & { __brand: "StyleId" };

/**
 * Generate a 6-character random variable ID
 * Matches mcp-reference naming: generateVarId
 */
export function generateVarId(prefix: string = "var"): StyleId {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${result}` as StyleId;
}

/**
 * Generate CSS shorthand for TRBL values
 * Matches mcp-reference naming: generateCSSShorthand
 */
export function generateCSSShorthand(
  values: { top: number; right: number; bottom: number; left: number },
  { ignoreZero = true, suffix = "px" } = {}
): string | undefined {
  const { top, right, bottom, left } = values;
  if (ignoreZero && top === 0 && right === 0 && bottom === 0 && left === 0) {
    return undefined;
  }
  if (top === right && right === bottom && bottom === left) {
    return `${top}${suffix}`;
  }
  if (right === left) {
    if (top === bottom) {
      return `${top}${suffix} ${right}${suffix}`;
    }
    return `${top}${suffix} ${right}${suffix} ${bottom}${suffix}`;
  }
  return `${top}${suffix} ${right}${suffix} ${bottom}${suffix} ${left}${suffix}`;
}

/**
 * Check if element is visible
 * Matches mcp-reference naming: isVisible
 */
export function isVisible(element: { visible?: boolean }): boolean {
  return element.visible ?? true;
}

/**
 * Round to 2 decimals for pixel values
 * Matches mcp-reference naming: pixelRound
 */
export function pixelRound(num: number): number {
  if (isNaN(num)) throw new TypeError(`Input must be a valid number`);
  return Number(Number(num).toFixed(2));
}

/**
 * Remove empty keys from objects
 * Matches mcp-reference naming: removeEmptyKeys
 */
export function removeEmptyKeys<T>(input: T): T {
  if (typeof input !== "object" || input === null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => removeEmptyKeys(item)) as T;
  }
  const result = {} as T;
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = removeEmptyKeys(input[key]);
      if (
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0) &&
        !(
          typeof value === "object" &&
          value !== null &&
          Object.keys(value).length === 0
        )
      ) {
        result[key] = value;
      }
    }
  }
  return result;
}
```

#### 1.3 Add Identity Utilities

**New File**: `src/utils/identity.ts`

```typescript
// Match mcp-reference/src/utils/identity.ts
import type { Node } from "@figma/rest-api-spec";

/**
 * Check if node has a specific property
 */
export function hasValue<K extends keyof Node>(
  key: K,
  node: Node,
  guard?: (value: Node[K]) => boolean
): node is Node & Record<K, NonNullable<Node[K]>> {
  if (node[key] === null || node[key] === undefined) {
    return false;
  }
  return guard ? guard(node[key]) : true;
}

/**
 * Type guards for specific node types
 */
export function isFrame(
  node: Node
): node is Node & { type: "FRAME" | "COMPONENT" | "INSTANCE" } {
  return (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

export function isLayout(node: Node): node is Node & {
  layoutAlign?: string;
  layoutPositioning?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
} {
  return "layoutAlign" in node || "layoutPositioning" in node;
}

export function isRectangle<K extends keyof Node>(
  key: K,
  node: Node
): node is Node & Record<K, NonNullable<Node[K]>> {
  return key in node && node[key] !== null && node[key] !== undefined;
}

export function isRectangleCornerRadii(
  value: unknown
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === "number")
  );
}

export function isStrokeWeights(value: unknown): value is {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "top" in value &&
    "right" in value &&
    "bottom" in value &&
    "left" in value
  );
}

export function isInAutoLayoutFlow(node: Node, parent?: Node): boolean {
  if (!parent || !isFrame(parent)) return false;
  if (parent.layoutMode === "NONE") return false;
  if (node.layoutPositioning === "ABSOLUTE") return false;
  return true;
}

export function isTextNode(node: Node): node is Node & { type: "TEXT" } {
  return node.type === "TEXT";
}

export function hasTextStyle(node: Node): node is Node & {
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: { value?: number; unit?: string };
  letterSpacing?: { value?: number; unit?: string };
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textCase?: string;
  textDecoration?: string;
} {
  return "fontSize" in node;
}
```

**Phase 1 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: New types compile correctly
- [ ] Verify: Utility functions work as expected

---

### Phase 2: Style Deduplication System

#### 2.1 Update Extractors with Global Variable Support

**File**: `src/extractors/built-in.ts`

Complete rewrite to match mcp-reference pattern with deduplication:

```typescript
// Match mcp-reference/src/extractors/built-in.ts structure
import type {
  ExtractorFn,
  Node as FigmaDocumentNode,
  GlobalVars,
  SimplifiedNode,
  StyleTypes,
  TraversalContext,
} from "@/types/index.js";

import { buildSimplifiedEffects } from "@/transformers/effects.js";
import { buildSimplifiedLayout } from "@/transformers/layout.js";
import { buildSimplifiedStrokes, parsePaint } from "@/transformers/style.js";
import {
  extractNodeText,
  extractTextStyle,
  hasTextStyle,
  isTextNode,
} from "@/transformers/text.js";
import { generateVarId } from "@/utils/common.js";
import { hasValue, isRectangleCornerRadii } from "@/utils/identity.js";

/**
 * Helper function to find or create a global variable
 * Matches mcp-reference: findOrCreateVar
 */
function findOrCreateVar(
  globalVars: GlobalVars,
  value: StyleTypes,
  prefix: string
): string {
  const [existingVarId] =
    Object.entries(globalVars.styles).find(
      ([_, existingValue]) =>
        JSON.stringify(existingValue) === JSON.stringify(value)
    ) ?? [];

  if (existingVarId) return existingVarId;

  const varId = generateVarId(prefix);
  globalVars.styles[varId] = value;
  return varId;
}

/**
 * Helper to get Figma style name for a node
 * Matches mcp-reference: getStyleName
 */
function getStyleName(
  node: FigmaDocumentNode,
  context: TraversalContext,
  keys: string[]
): string | undefined {
  if (!hasValue("styles", node)) return undefined;
  const styleMap = node.styles as Record<string, string>;
  for (const key of keys) {
    const styleId = styleMap[key];
    if (styleId) {
      const meta = context.globalVars.extraStyles?.[styleId];
      if (meta?.name) return meta.name;
    }
  }
  return undefined;
}

/**
 * Extracts layout-related properties
 * Matches mcp-reference: layoutExtractor
 */
export const layoutExtractor: ExtractorFn = (node, result, context) => {
  const layout = buildSimplifiedLayout(node, context.parent);
  if (Object.keys(layout).length > 1) {
    result.layout = findOrCreateVar(context.globalVars, layout, "layout");
  }
};

/**
 * Extracts text content and styling
 * Matches mcp-reference: textExtractor
 */
export const textExtractor: ExtractorFn = (node, result, context) => {
  if (isTextNode(node)) {
    result.text = extractNodeText(node);
  }

  if (hasTextStyle(node)) {
    const textStyle = extractTextStyle(node);
    if (textStyle) {
      const styleName = getStyleName(node, context, ["text", "typography"]);
      if (styleName) {
        context.globalVars.styles[styleName] = textStyle;
        result.textStyle = styleName;
      } else {
        result.textStyle = findOrCreateVar(
          context.globalVars,
          textStyle,
          "style"
        );
      }
    }
  }
};

/**
 * Extracts visual appearance properties
 * Matches mcp-reference: visualsExtractor
 */
export const visualsExtractor: ExtractorFn = (node, result, context) => {
  const hasChildren =
    hasValue("children", node) &&
    Array.isArray(node.children) &&
    node.children.length > 0;

  // fills
  if (
    hasValue("fills", node) &&
    Array.isArray(node.fills) &&
    node.fills.length
  ) {
    const fills = node.fills
      .map((fill) => parsePaint(fill, hasChildren))
      .reverse();
    const styleName = getStyleName(node, context, ["fill", "fills"]);
    if (styleName) {
      context.globalVars.styles[styleName] = fills;
      result.fills = styleName;
    } else {
      result.fills = findOrCreateVar(context.globalVars, fills, "fill");
    }
  }

  // strokes
  const strokes = buildSimplifiedStrokes(node, hasChildren);
  if (strokes.colors.length) {
    const styleName = getStyleName(node, context, ["stroke", "strokes"]);
    if (styleName) {
      context.globalVars.styles[styleName] = strokes.colors;
      result.strokes = styleName;
      if (strokes.strokeWeight) result.strokeWeight = strokes.strokeWeight;
      if (strokes.strokeDashes) result.strokeDashes = strokes.strokeDashes;
      if (strokes.strokeWeights) result.strokeWeights = strokes.strokeWeights;
    } else {
      result.strokes = findOrCreateVar(context.globalVars, strokes, "stroke");
    }
  }

  // effects
  const effects = buildSimplifiedEffects(node);
  if (Object.keys(effects).length) {
    const styleName = getStyleName(node, context, ["effect", "effects"]);
    if (styleName) {
      context.globalVars.styles[styleName] = effects;
      result.effects = styleName;
    } else {
      result.effects = findOrCreateVar(context.globalVars, effects, "effect");
    }
  }

  // opacity
  if (
    hasValue("opacity", node) &&
    typeof node.opacity === "number" &&
    node.opacity !== 1
  ) {
    result.opacity = node.opacity;
  }

  // border radius
  if (hasValue("cornerRadius", node) && typeof node.cornerRadius === "number") {
    result.borderRadius = `${node.cornerRadius}px`;
  }
  if (hasValue("rectangleCornerRadii", node, isRectangleCornerRadii)) {
    result.borderRadius = `${node.rectangleCornerRadii[0]}px ${node.rectangleCornerRadii[1]}px ${node.rectangleCornerRadii[2]}px ${node.rectangleCornerRadii[3]}px`;
  }
};

/**
 * Extracts component-related properties
 * Matches mcp-reference: componentExtractor
 */
export const componentExtractor: ExtractorFn = (node, result) => {
  if (node.type === "INSTANCE") {
    if (hasValue("componentId", node)) {
      result.componentId = node.componentId;
    }

    if (hasValue("componentProperties", node)) {
      result.componentProperties = Object.entries(
        node.componentProperties ?? {}
      ).map(([name, { value, type }]) => ({
        name,
        value: value.toString(),
        type,
      }));
    }
  }
};

// Convenience combinations (matches mcp-reference)
export const allExtractors = [
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
];

export const layoutAndText = [layoutExtractor, textExtractor];
export const contentOnly = [textExtractor];
export const visualsOnly = [visualsExtractor];
export const layoutOnly = [layoutExtractor];
```

**Phase 2 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: Style deduplication creates variable references
- [ ] Verify: Named styles resolve to global vars

---

### Phase 3: SVG Optimization

#### 3.1 Add SVG Container Collapsing

**File**: `src/extractors/built-in.ts` (add to existing)

```typescript
// Add to src/extractors/built-in.ts

/**
 * Node types that can be exported as SVG images
 * Matches mcp-reference: SVG_ELIGIBLE_TYPES
 */
export const SVG_ELIGIBLE_TYPES = new Set([
  "IMAGE-SVG",
  "STAR",
  "LINE",
  "ELLIPSE",
  "REGULAR_POLYGON",
  "RECTANGLE",
]);

/**
 * afterChildren callback that collapses SVG-heavy containers
 * Matches mcp-reference: collapseSvgContainers
 *
 * If a FRAME, GROUP, or INSTANCE contains only SVG-eligible children,
 * the parent is marked as IMAGE-SVG and children are omitted.
 */
export function collapseSvgContainers(
  node: FigmaDocumentNode,
  result: SimplifiedNode,
  children: SimplifiedNode[]
): SimplifiedNode[] {
  const allChildrenAreSvgEligible = children.every((child) =>
    SVG_ELIGIBLE_TYPES.has(child.type)
  );

  if (
    (node.type === "FRAME" ||
      node.type === "GROUP" ||
      node.type === "INSTANCE") &&
    allChildrenAreSvgEligible
  ) {
    result.type = "IMAGE-SVG";
    return [];
  }

  return children;
}
```

**Phase 3 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: SVG containers collapse correctly
- [ ] Verify: `collapseSvgContainers` callback works

---

### Phase 4: Advanced Transformers

#### 4.1 Update Layout Transformer

**File**: `src/transformers/layout.ts`

Complete rewrite matching mcp-reference:

```typescript
// Match mcp-reference/src/transformers/layout.ts
import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";

import { generateCSSShorthand, pixelRound } from "@/utils/common.js";
import {
  isFrame,
  isInAutoLayoutFlow,
  isLayout,
  isRectangle,
} from "@/utils/identity.js";

export interface SimplifiedLayout {
  mode: "none" | "row" | "column";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "baseline"
    | "stretch";
  alignItems?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "baseline"
    | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;
  locationRelativeToParent?: { x: number; y: number };
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  padding?: string;
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug";
    vertical?: "fixed" | "fill" | "hug";
  };
  overflowScroll?: ("x" | "y")[];
  position?: "absolute";
}

// Convert Figma layout config to flex-like schema
// Matches mcp-reference: buildSimplifiedLayout
export function buildSimplifiedLayout(
  n: FigmaDocumentNode,
  parent?: FigmaDocumentNode
): SimplifiedLayout {
  const frameValues = buildSimplifiedFrameValues(n);
  const layoutValues =
    buildSimplifiedLayoutValues(n, parent, frameValues.mode) || {};

  return { ...frameValues, ...layoutValues };
}

// Process alignment and sizing for flex layouts
// Matches mcp-reference: convertAlign
function convertAlign(
  axisAlign?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN" | "BASELINE",
  stretch?: {
    children: FigmaDocumentNode[];
    axis: "primary" | "counter";
    mode: "row" | "column" | "none";
  }
):
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "baseline"
  | "stretch"
  | undefined {
  if (stretch && stretch.mode !== "none") {
    const { children, mode, axis } = stretch;
    const direction = getDirection(axis, mode);

    const shouldStretch =
      children.length > 0 &&
      children.reduce((shouldStretch, c) => {
        if (!shouldStretch) return false;
        if ("layoutPositioning" in c && c.layoutPositioning === "ABSOLUTE")
          return true;
        if (direction === "horizontal") {
          return (
            "layoutSizingHorizontal" in c && c.layoutSizingHorizontal === "FILL"
          );
        } else {
          return (
            "layoutSizingVertical" in c && c.layoutSizingVertical === "FILL"
          );
        }
      }, true);

    if (shouldStretch) return "stretch";
  }

  switch (axisAlign) {
    case "MIN":
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "SPACE_BETWEEN":
      return "space-between";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

// Matches mcp-reference: convertSelfAlign
function convertSelfAlign(
  align?: "MIN" | "MAX" | "CENTER" | "STRETCH"
): "flex-start" | "flex-end" | "center" | "stretch" | undefined {
  switch (align) {
    case "MIN":
      return undefined;
    case "MAX":
      return "flex-end";
    case "CENTER":
      return "center";
    case "STRETCH":
      return "stretch";
    default:
      return undefined;
  }
}

// Interpret sizing
// Matches mcp-reference: convertSizing
function convertSizing(
  s?: "FIXED" | "FILL" | "HUG"
): "fixed" | "fill" | "hug" | undefined {
  if (s === "FIXED") return "fixed";
  if (s === "FILL") return "fill";
  if (s === "HUG") return "hug";
  return undefined;
}

// Get direction based on axis and mode
// Matches mcp-reference: getDirection
function getDirection(
  axis: "primary" | "counter",
  mode: "row" | "column"
): "horizontal" | "vertical" {
  if (axis === "primary") {
    return mode === "row" ? "horizontal" : "vertical";
  } else {
    return mode === "row" ? "horizontal" : "vertical";
  }
}

// Build frame values (AutoLayout properties)
// Matches mcp-reference: buildSimplifiedFrameValues
function buildSimplifiedFrameValues(
  n: FigmaDocumentNode
): SimplifiedLayout | { mode: "none" } {
  if (!isFrame(n)) {
    return { mode: "none" };
  }

  const frameValues: SimplifiedLayout = {
    mode:
      !n.layoutMode || n.layoutMode === "NONE"
        ? "none"
        : n.layoutMode === "HORIZONTAL"
          ? "row"
          : "column",
  };

  const overflowScroll: SimplifiedLayout["overflowScroll"] = [];
  if (n.overflowDirection?.includes("HORIZONTAL")) overflowScroll.push("x");
  if (n.overflowDirection?.includes("VERTICAL")) overflowScroll.push("y");
  if (overflowScroll.length > 0) frameValues.overflowScroll = overflowScroll;

  if (frameValues.mode === "none") {
    return frameValues;
  }

  frameValues.justifyContent = convertAlign(n.primaryAxisAlignItems ?? "MIN", {
    children: n.children,
    axis: "primary",
    mode: frameValues.mode as "row" | "column",
  });
  frameValues.alignItems = convertAlign(n.counterAxisAlignItems ?? "MIN", {
    children: n.children,
    axis: "counter",
    mode: frameValues.mode as "row" | "column",
  });
  frameValues.alignSelf = convertSelfAlign(n.layoutAlign);

  frameValues.wrap = n.layoutWrap === "WRAP" ? true : undefined;
  frameValues.gap = n.itemSpacing ? `${n.itemSpacing ?? 0}px` : undefined;

  if (n.paddingTop || n.paddingBottom || n.paddingLeft || n.paddingRight) {
    frameValues.padding = generateCSSShorthand({
      top: n.paddingTop ?? 0,
      right: n.paddingRight ?? 0,
      bottom: n.paddingBottom ?? 0,
      left: n.paddingLeft ?? 0,
    });
  }

  return frameValues;
}

// Build layout values (positioning, dimensions, sizing)
// Matches mcp-reference: buildSimplifiedLayoutValues
function buildSimplifiedLayoutValues(
  n: FigmaDocumentNode,
  parent: FigmaDocumentNode | undefined,
  mode: "row" | "column" | "none"
): SimplifiedLayout | undefined {
  if (!isLayout(n)) return undefined;

  const layoutValues: SimplifiedLayout = { mode };

  layoutValues.sizing = {
    horizontal: convertSizing(n.layoutSizingHorizontal),
    vertical: convertSizing(n.layoutSizingVertical),
  };

  if (isFrame(parent) && !isInAutoLayoutFlow(n, parent)) {
    if (n.layoutPositioning === "ABSOLUTE") {
      layoutValues.position = "absolute";
    }
    if (n.absoluteBoundingBox && parent.absoluteBoundingBox) {
      layoutValues.locationRelativeToParent = {
        x: pixelRound(n.absoluteBoundingBox.x - parent.absoluteBoundingBox.x),
        y: pixelRound(n.absoluteBoundingBox.y - parent.absoluteBoundingBox.y),
      };
    }
  }

  if (isRectangle("absoluteBoundingBox", n)) {
    const dimensions: {
      width?: number;
      height?: number;
      aspectRatio?: number;
    } = {};

    if (mode === "row") {
      if (!n.layoutGrow && n.layoutSizingHorizontal == "FIXED") {
        dimensions.width = n.absoluteBoundingBox.width;
      }
      if (n.layoutAlign !== "STRETCH" && n.layoutSizingVertical == "FIXED") {
        dimensions.height = n.absoluteBoundingBox.height;
      }
    } else if (mode === "column") {
      if (n.layoutAlign !== "STRETCH" && n.layoutSizingHorizontal == "FIXED") {
        dimensions.width = n.absoluteBoundingBox.width;
      }
      if (!n.layoutGrow && n.layoutSizingVertical == "FIXED") {
        dimensions.height = n.absoluteBoundingBox.height;
      }
      if (n.preserveRatio) {
        dimensions.aspectRatio =
          n.absoluteBoundingBox?.width / n.absoluteBoundingBox?.height;
      }
    } else {
      if (!n.layoutSizingHorizontal || n.layoutSizingHorizontal === "FIXED") {
        dimensions.width = n.absoluteBoundingBox.width;
      }
      if (!n.layoutSizingVertical || n.layoutSizingVertical === "FIXED") {
        dimensions.height = n.absoluteBoundingBox.height;
      }
    }

    if (Object.keys(dimensions).length > 0) {
      if (dimensions.width) {
        dimensions.width = pixelRound(dimensions.width);
      }
      if (dimensions.height) {
        dimensions.height = pixelRound(dimensions.height);
      }
      layoutValues.dimensions = dimensions;
    }
  }

  return layoutValues;
}
```

#### 4.2 Update Style Transformer

**File**: `src/transformers/style.ts`

Complete rewrite with full paint parsing and advanced CSS:

```typescript
// Match mcp-reference/src/transformers/style.ts
import type {
  Node as FigmaDocumentNode,
  Paint,
  RGBA,
  Transform,
  Vector,
} from "@figma/rest-api-spec";

import { generateCSSShorthand, isVisible } from "@/utils/common.js";
import { hasValue, isStrokeWeights } from "@/utils/identity.js";

export type CSSRGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;
export type CSSHexColor = `#${string}`;

export interface ColorValue {
  hex: CSSHexColor;
  opacity: number;
}

export type SimplifiedImageFill = {
  type: "IMAGE";
  imageRef: string;
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH";
  scalingFactor?: number;
  backgroundSize?: string;
  backgroundRepeat?: string;
  isBackground?: boolean;
  objectFit?: string;
  imageDownloadArguments?: {
    needsCropping: boolean;
    requiresImageDimensions: boolean;
    cropTransform?: Transform;
    filenameSuffix?: string;
  };
};

export type SimplifiedGradientFill = {
  type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  gradient: string;
};

export type SimplifiedPatternFill = {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
};

export type SimplifiedFill =
  | SimplifiedImageFill
  | SimplifiedGradientFill
  | SimplifiedPatternFill
  | CSSRGBAColor
  | CSSHexColor;

export type SimplifiedStroke = {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};

// [Full implementation matching mcp-reference]
// Include all gradient conversion functions, color utilities, etc.
// This is a large file - copy from mcp-reference/src/transformers/style.ts
```

#### 4.3 Update Text Transformer

**File**: `src/transformers/text.ts`

Add CSS conversion capabilities:

```typescript
// Enhance to match mcp-reference/src/transformers/text.ts

export interface SimplifiedTextStyle {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  textCase?: string;
  textDecoration?: string;
}

// Update extractTextStyle to return CSS-ready values
export function extractTextStyle(
  node: Node & { textStyle?: unknown; fontSize?: number /* ... */ }
): SimplifiedTextStyle {
  return {
    fontFamily: node.fontName?.family,
    fontWeight: node.fontWeight,
    fontSize: `${node.fontSize}px`,
    lineHeight:
      node.lineHeight?.unit === "PIXELS"
        ? `${node.lineHeight.value}px`
        : node.lineHeight?.unit === "PERCENT"
          ? `${(node.lineHeight.value * 100).toFixed(0)}%`
          : undefined,
    letterSpacing:
      node.letterSpacing?.unit === "PIXELS"
        ? `${node.letterSpacing.value}px`
        : `${((node.letterSpacing.value! * 1000) / node.fontSize!).toFixed(2)}em`,
    textAlign: node.textAlignHorizontal?.toLowerCase(),
    textCase: node.textCase?.toLowerCase(),
    textDecoration: node.textDecoration?.toLowerCase(),
  };
}
```

#### 4.4 Update Effects Transformer

**File**: `src/transformers/effects.ts`

Ensure full feature parity:

```typescript
// Match mcp-reference/src/transformers/effects.ts

export interface SimplifiedEffects {
  shadows?: Array<{
    type: "drop-shadow" | "inner-shadow";
    color: string;
    offsetX: string;
    offsetY: string;
    blur: string;
    spread?: string;
  }>;
  blur?: string;
  layerBlur?: string;
}

export function buildSimplifiedEffects(node: Node): SimplifiedEffects {
  const effects: SimplifiedEffects = {};

  if (node.effects?.length) {
    const shadows = node.effects
      .filter(
        (e) =>
          e.visible !== false &&
          (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
      )
      .map((e) => ({
        type: e.type === "DROP_SHADOW" ? "drop-shadow" : "inner-shadow",
        color: formatRGBAColor(e.color, e.color?.a ?? 1),
        offsetX: `${e.offset?.x ?? 0}px`,
        offsetY: `${e.offset?.y ?? 0}px`,
        blur: `${e.radius ?? 0}px`,
        spread: e.spread !== undefined ? `${e.spread}px` : undefined,
      }));

    if (shadows.length) effects.shadows = shadows;
  }

  if (node.effect?.layerBlur && node.effect.layerBlur > 0) {
    effects.layerBlur = `${node.effect.layerBlur}px`;
  }

  return effects;
}
```

**Phase 4 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: All transformer outputs match mcp-reference
- [ ] Verify: Gradient conversion works correctly

---

### Phase 5: Image Processing with Responsive CSS Variables

#### 5.1 Update Image Processing

**File**: `src/images/index.ts`

Add responsive CSS variable generation:

```typescript
// Add to existing image processing

/**
 * Generate CSS variables for image dimensions
 * Supports responsive background-size calculation for TILE mode
 * Matches mcp-reference pattern
 */
export function generateImageCSSVariables(
  originalWidth: number,
  originalHeight: number,
  fileName: string
): Record<string, string> {
  return {
    [`--original-width-${fileName}`]: `${originalWidth}px`,
    [`--original-height-${fileName}`]: `${originalHeight}px`,
    [`--aspect-ratio-${fileName}`]: `${(originalWidth / originalHeight).toFixed(4)}`,
  };
}

/**
 * Generate background-size with CSS variables for TILE mode
 * Matches mcp-reference: translateScaleMode
 */
export function generateTileBackgroundSize(
  scalingFactor: number,
  fileName: string
): string {
  return `calc(var(--original-width-${fileName}) * ${scalingFactor}) calc(var(--original-height-${fileName}) * ${scalingFactor})`;
}
```

**Phase 5 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: CSS variables generate for TILE images
- [ ] Verify: Responsive dimension variables work

---

### Phase 6: Export Consolidation

#### 6.1 Minimize Exports

**File**: `src/index.ts`

Consolidate exports to only what users need:

```typescript
// Main client
export { FigmaExtractor } from "@/client/index";

// Essential types for users
export type {
  FigmaExtractorConfig,
  GetFileOptions,
  GetNodesOptions,
  GetImageUrlsOptions,
  DownloadImagesOptions,
  SimplifiedDesign,
  StreamProgress,
  ImageUrlResult,
  DownloadedImageResult,
} from "@/types/index";

// Re-export Figma API types
export type {
  Node,
  Component,
  ComponentSet,
  GetFileResponse,
  GetImagesResponse,
} from "@figma/rest-api-spec";

// Extractors (for custom extraction)
export {
  extractFromDesign,
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
  allExtractors,
  layoutAndText,
  contentOnly,
  visualsOnly,
  layoutOnly,
  collapseSvgContainers,
  SVG_ELIGIBLE_TYPES,
} from "@/extractors/index";

// Toon format (unique advantage)
export { toToon, fromToon } from "@/transformers/toon";

// Utilities (only export what users need for advanced usage)
export { setLogLevel, getLogLevel } from "@/utils/logger";

export { FigmaCache } from "@/utils/cache";

export { RateLimiter } from "@/utils/rate-limiter";

// DO NOT export individual transformer functions
// DO NOT export internal utility functions
```

**File**: `src/transformers/index.ts`

```typescript
// Types only - functions are internal
export type { SimplifiedLayout } from "./layout";
export type { SimplifiedTextStyle } from "./text";
export type {
  SimplifiedFill,
  SimplifiedStroke,
  ColorValue,
  CSSRGBAColor,
  CSSHexColor,
} from "./style";
export type { SimplifiedEffects } from "./effects";
export type {
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
} from "./component";

// Only export Toon format (unique feature)
export { toToon, fromToon } from "./toon";
```

**Phase 6 Verification:**

- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] Run `npx eslint src/` - No ESLint errors
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run build` - Build succeeds
- [ ] Verify: Public API is minimal and clean
- [ ] Verify: Internal functions not exported
- [ ] Verify: Users can still access needed functionality

---

## File Structure Changes

### New Files

```
src/
├── utils/
│   ├── common.ts          # Expand with mcp-reference utilities
│   └── identity.ts        # NEW: Type guards and hasValue
```

### Modified Files

```
src/
├── types/
│   └── index.ts           # Add: StyleTypes, GlobalVars, full SimplifiedFill
├── transformers/
│   ├── layout.ts          # Rewrite: match mcp-reference
│   ├── style.ts           # Rewrite: full paint parsing, gradients
│   ├── text.ts            # Enhance: CSS conversion
│   ├── effects.ts         # Update: ensure parity
│   └── index.ts           # Consolidate: types only export
├── extractors/
│   ├── built-in.ts        # Rewrite: add deduplication
│   ├── node-walker.ts     # Update: pass globalVars context
│   └── index.ts           # Add: SVG_ELIGIBLE_TYPES, collapseSvgContainers
├── images/
│   └── index.ts           # Add: responsive CSS variables
└── index.ts               # Consolidate: minimize exports
```

---

## API Compatibility

### Breaking Changes

1. **SimplifiedFill Type**: Now union of more specific types (breaking, but more accurate)
2. **Extractor Output**: Now returns variable references instead of inline values
3. **GlobalVars**: New required parameter for extraction

### Migration Guide

```typescript
// Before
const result = extractFromDesign(nodes, extractors);

// After
const result = extractFromDesign(
  nodes,
  extractors,
  {},
  { styles: {} }
);
// Returns: { nodes, globalVars } with deduplicated styles
```

---

## Testing Checklist

### TypeScript & ESLint Verification (All Phases)

Before proceeding to the next phase, ensure:

```bash
# Type checking
npx tsc --noEmit

# Linting
npx eslint src/ --max-warnings=0

# Tests
npm test

# Build
npm run build
```

**Expected:**

- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors (warnings acceptable if documented)
- ✅ All tests pass
- ✅ Build succeeds

### Functional Testing

- [ ] SVG container collapsing works for FRAME/GROUP/INSTANCE
- [ ] Style deduplication creates variables correctly
- [ ] Named styles resolve to global vars
- [ ] Layout transformer produces same output as mcp-reference
- [ ] Style transformer handles all paint types (SOLID, GRADIENT\_\*, IMAGE, PATTERN)
- [ ] Text transformer produces CSS-ready values
- [ ] Effects transformer includes shadows and blur
- [ ] Responsive CSS variables generate for TILE images
- [ ] Streaming still works with new extractors
- [ ] Toon format still works
- [ ] Backward compatibility via migration guide

### Final Verification (After All Phases)

```bash
# Complete verification suite
npm run build        # TypeScript compilation
npm run lint         # ESLint checking
npm test             # All tests pass
npm run test:coverage # Coverage maintained (if applicable)

# Using MCP IDE diagnostics (if available)
# Check for TypeScript errors, ESLint errors, and warnings
```

---

## Implementation Order

1. **Phase 0**: Structural refactoring (DO THIS FIRST!)
2. **Phase 1**: Foundation (types, utilities)
3. **Phase 2**: Style deduplication system
4. **Phase 3**: SVG optimization
5. **Phase 4**: Advanced transformers
6. **Phase 5**: Image processing enhancements
7. **Phase 6**: Export consolidation

Each phase should be tested independently before proceeding.

**⚠️ CRITICAL: Create a git commit after EACH successful phase!**
- Run all verifications (TypeScript, ESLint, tests, build)
- If all pass: `git add . && git commit -m "refactor: phase X - [description]"`
- This ensures you can roll back if issues arise

**IMPORTANT:** Phase 0 is the foundation for all other phases. Without structural alignment to mcp-reference, the subsequent phases will be difficult to implement and maintain.

---

## Post-Implementation Benefits

| Benefit                     | Description                                    |
| --------------------------- | ---------------------------------------------- |
| **15-30% Smaller Payloads** | Style deduplication reduces redundancy         |
| **20-40% SVG Optimization** | Container collapsing for vector-heavy designs  |
| **Production-Ready CSS**    | Direct mapping to CSS custom properties        |
| **Easier Upstream Sync**    | Matching structure to mcp-reference            |
| **Cleaner API**             | Fewer exported functions, clearer interfaces   |
| **Preserved Advantages**    | Streaming, Toon, rate limiting, caching intact |

---

## Notes

- All function names match mcp-reference exactly
- All file names match mcp-reference structure
- Type definitions match mcp-reference where applicable
- Unique features (streaming, Toon) preserved
- Export surface minimized for cleaner API
