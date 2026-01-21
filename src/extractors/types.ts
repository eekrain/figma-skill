/**
 * Extractor type definitions
 * Consolidated from types/ directory to match mcp-reference structure
 */
import type { Node } from "@figma/rest-api-spec";

// =====================================================
// Core Extractor Types
// =====================================================

/**
 * Simplified node output from extraction pipeline
 */
export interface SimplifiedNode {
  /** Node ID */
  id: string;
  /** Node name */
  name: string;
  /** Node type */
  type: string;
  /** Whether node is visible */
  visible?: boolean;
  /** Layout information (if layout extractor enabled) */
  layout?: import("../transformers/layout").SimplifiedLayout;
  /** Text content (if text extractor enabled) */
  text?: string;
  /** Text style (if text extractor enabled) */
  textStyle?: import("../transformers/text").SimplifiedTextStyle;
  /** Fill colors (if visuals extractor enabled) */
  fills?: Array<Record<string, unknown> | string>;
  /** Stroke colors (if visuals extractor enabled) */
  strokes?: Array<Record<string, unknown> | string>;
  /** Stroke weight (if visuals extractor enabled) */
  strokeWeight?: string;
  /** Stroke dashes (if visuals extractor enabled) */
  strokeDashes?: number[];
  /** Individual stroke weights (if visuals extractor enabled) */
  strokeWeights?: string;
  /** Effects (if visuals extractor enabled) */
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  /** Opacity (if visuals extractor enabled) */
  opacity?: number;
  /** Border radius (if visuals extractor enabled) */
  borderRadius?: string;
  /** Component ID (if component extractor enabled) */
  componentId?: string;
  /** Component properties (if component extractor enabled) */
  componentProperties?: Array<{ name: string; value: string; type: string }>;
  /** Child nodes */
  children?: SimplifiedNode[];
}

/**
 * Global variables (styles, etc.)
 */
export interface GlobalVars {
  /** Named styles referenced by nodes */
  styles: Record<string, unknown>;
  /** Extra styles from API response (meta information) */
  extraStyles?: Record<string, { name: string }>;
}

/**
 * Simplified component definition
 */
export interface SimplifiedComponentDefinition {
  /** Component key */
  key: string;
  /** Component ID */
  id: string;
  /** Component name */
  name: string;
  /** Component set ID if part of a set */
  componentSetId?: string | null;
  /** Description */
  description?: string;
}

/**
 * Simplified component set definition
 */
export interface SimplifiedComponentSetDefinition {
  /** Component set key */
  key: string;
  /** Component set ID */
  id: string;
  /** Component set name */
  name: string;
  /** Variant component keys */
  componentKeys: string[];
}

/**
 * Complete simplified design output
 */
export interface SimplifiedDesign {
  /** Design file name */
  name: string;
  /** Extracted nodes */
  nodes: SimplifiedNode[];
  /** Component definitions */
  components: Record<string, SimplifiedComponentDefinition>;
  /** Component set definitions */
  componentSets: Record<string, SimplifiedComponentSetDefinition>;
  /** Global variables */
  globalVars: GlobalVars;
}

// =====================================================
// Traversal Types
// =====================================================

/**
 * Traversal context passed to extractors
 */
export interface TraversalContext {
  /** Global variables being built during extraction */
  globalVars: GlobalVars;
  /** Current traversal depth */
  currentDepth: number;
  /** Maximum depth to traverse */
  maxDepth: number;
  /** Extra styles from API response */
  extraStyles: Record<string, unknown>;
  /** Parent node if available */
  parent?: Node;
}

/**
 * Traversal options for controlling extraction behavior
 */
export interface TraversalOptions {
  /** Maximum depth to traverse (default: unlimited) */
  maxDepth?: number;
  /** Custom node filter function */
  nodeFilter?: (node: Node) => boolean;
  /** Called after children are processed to modify parent or control which children to include */
  afterChildren?: (
    node: Node,
    result: SimplifiedNode,
    children: SimplifiedNode[]
  ) => SimplifiedNode[];
}

/**
 * Extractor function type
 * Extracts data from a Figma node and adds it to the result
 */
export type ExtractorFn = (
  node: Node,
  result: SimplifiedNode,
  context: TraversalContext
) => void | Promise<void>;

// =====================================================
// API Types (from types/api.ts)
// =====================================================

/**
 * Supported output formats for design data
 */
export type OutputFormat = "json" | "toon";

/**
 * Image format options
 */
export type ImageFormat = "png" | "jpg" | "svg" | "pdf";

/**
 * Image scale options (0.1 to 4, typically 1, 2, or 3)
 */
export type ImageScale = 0.1 | 0.5 | 1 | 2 | 3 | 4;

/**
 * Pagination options for list endpoints
 */
export interface PaginationOptions {
  /** Number of items per page (default: 30, max: 200) */
  pageSize?: number;
  /** Continue from cursor */
  cursor?: string;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  /** Result items */
  data: T[];
  /** Cursor for next page */
  nextCursor: string | null;
  /** Whether more pages exist */
  hasMore: boolean;
}

// =====================================================
// Configuration Types (from types/index.ts)
// =====================================================

/**
 * Configuration options for FigmaExtractor client
 */
export interface FigmaExtractorConfig {
  /** Figma personal access token */
  token: string;
  /** Enable in-memory caching (default: true) */
  cache?: boolean;
  /** Maximum cached items (default: 100) */
  cacheSize?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum concurrent requests (default: 10) */
  concurrent?: number;
  /** Base API URL (default: https://api.figma.com/v1) */
  baseUrl?: string;
}

/**
 * Node ID format validator
 * Supports:
 * - Standard format: "1:2" or "1-2"
 * - Instance format: "I5666:180910" or "I5666-180910"
 * - Multiple nodes: "1:2;3:4" or "1-2;3-4"
 */
export type NodeId = string;

/**
 * Result of nodeId validation
 */
export interface NodeIdValidationResult {
  /** Whether the nodeId is valid */
  valid: boolean;
  /** Normalized nodeId (with : separators) */
  normalized?: string;
  /** Array of individual node IDs */
  ids?: string[];
  /** Error message if invalid */
  error?: string;
}

/**
 * Options for getFile operation
 */
export interface GetFileOptions extends TraversalOptions {
  /** Output format: 'json' (default) or 'toon' */
  format?: "json" | "toon";
  /** Extractors to apply (default: all from built-in) */
  extractors?: ExtractorFn[];
  /** Include components in output (default: true) */
  includeComponents?: boolean;
  /** Include component sets in output (default: true) */
  includeComponentSets?: boolean;
  /** Specific node ID to extract (from URL node-id parameter) */
  nodeId?: NodeId;
}

/**
 * Options for getNodes operation
 */
export interface GetNodesOptions extends GetFileOptions {
  /** Specific node IDs to fetch */
  ids: string[];
}

/**
 * Options for getImageUrls operation
 */
export interface GetImageUrlsOptions {
  /** Node IDs to get images for */
  ids: string[];
  /** Image format: 'png', 'jpg', or 'svg' (default: 'png') */
  format?: "png" | "jpg" | "svg";
  /** Scale factor for export (default: 1) */
  scale?: number;
}

/**
 * Options for downloadImages operation
 */
export interface DownloadImagesOptions extends GetImageUrlsOptions {
  /** Output directory for downloaded images */
  outputDir: string;
  /** Number of parallel downloads (default: 5) */
  parallel?: number;
}

// =====================================================
// Streaming Types (from types/index.ts)
// =====================================================

/**
 * Progress data for streaming operations
 */
export interface StreamProgress {
  /** Percentage complete (0-100) */
  percent: number;
  /** Number of nodes processed */
  processed: number;
  /** Total number of nodes */
  total: number;
  /** Current operation */
  operation: string;
}

/**
 * Chunk data from streaming operations
 */
export interface StreamChunk {
  /** Nodes in this chunk */
  nodes: SimplifiedNode[];
  /** Chunk index */
  index: number;
  /** Total chunks */
  total: number;
}

// =====================================================
// Image Types (from types/index.ts)
// =====================================================

/**
 * Image URL result
 */
export interface ImageUrlResult {
  /** Node ID */
  id: string;
  /** Image URL */
  url: string;
}

/**
 * Downloaded image result
 */
export interface DownloadedImageResult {
  /** Node ID */
  id: string;
  /** Local file path */
  path: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
}

// =====================================================
// Style Types (for Phase 1+ implementation)
// =====================================================

/**
 * Style types that can be referenced globally
 * This will be expanded in Phase 1 for style deduplication
 */
export type StyleTypes =
  | import("../transformers/layout").SimplifiedLayout
  | import("../transformers/text").SimplifiedTextStyle
  | SimplifiedFill[]
  | import("../transformers/style").SimplifiedStroke
  | import("../transformers/effects").SimplifiedEffects;

/**
 * Simplified fill types
 * NOTE: Full implementation with SimplifiedImageFill, SimplifiedGradientFill,
 * SimplifiedPatternFill will be added in Phase 4. For now, we use the existing
 * SimplifiedFill type from the style transformer.
 */
export type SimplifiedFill = import("../transformers/style").SimplifiedFill;
