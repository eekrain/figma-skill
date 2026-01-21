// Import extractor types for use in this file
import type { ExtractorFn, TraversalOptions } from "@/extractors/types";

// Re-export error types from utils
export type {
  FigmaApiError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  PayloadTooLargeError,
} from "@/utils/fetch-with-retry";

/**
 * Main type exports for figma-skill
 */

// Re-export Figma API types
export type {
  GetFileResponse,
  GetFileNodesResponse,
  GetImagesResponse,
  Node,
  Component,
  ComponentSet,
  Style,
  FrameNode,
  GroupNode,
  VectorNode,
  BooleanOperationNode,
  StarNode,
  LineNode,
  EllipseNode,
  RegularPolygonNode,
  RectangleNode,
  TextNode,
  SliceNode,
  InstanceNode,
  StickyNode,
  DocumentNode,
  SectionNode,
} from "@figma/rest-api-spec";

// Re-export extractor types from extractors module
export type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
} from "@/extractors/types";

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
  layout?: Record<string, unknown>;
  /** Text content (if text extractor enabled) */
  text?: string;
  /** Text style (if text extractor enabled) */
  textStyle?: Record<string, unknown>;
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
