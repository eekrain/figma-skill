/**
 * Compression module - Component-based compression for Figma designs
 *
 * Reduces file size by 70-75% through component deduplication while preserving
 * perfect-pixel design representation for LLM coding agents.
 */
import type {
  GlobalVars,
  SimplifiedDesign,
  SimplifiedFill,
  SimplifiedNode,
  StyleTypes,
} from "@/extractors/types";
import type { SimplifiedStrokes } from "@/transformers/style";

// =====================================================
// Core Compression Types
// =====================================================

/**
 * Compression options for controlling behavior
 */
export interface CompressionOptions {
  /** Minimum instances required to extract as component (default: 2) */
  minInstances?: number;
  /** Extract layout grids for positioning (default: true) */
  extractGrids?: boolean;
  /** Preserve original node order (default: true) */
  preserveOrder?: boolean;
  /** Minimum similarity ratio for slot detection (default: 0.8) */
  minSlotSimilarity?: number;
}

/**
 * Structured slot reference - clean YAML-friendly slot marker
 * Replaces "__SLOT:slot_id__" string markers
 */
export interface SlotReference {
  /** Slot ID to reference */
  $slot: string;
  /** Optional: Mark as optional slot */
  optional?: boolean;
}

/**
 * Value that can be either a direct value or a slot reference
 */
export type SlotValue = unknown | SlotReference;

/**
 * Minimal template node - only structure, no content
 * This drastically reduces component definition size by storing only the template structure
 * Updated in Phase 2 to use structured slot references
 */
export interface MinimalTemplateNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean | SlotReference; // Can be slot reference
  /** Slot placeholder instead of actual value - DEPRECATED, use structured refs */
  isSlot?: boolean;
  /** Slot ID if this is a slot position - DEPRECATED, use $slot */
  slotId?: string;
  /** For component references - preserve as reference (don't expand) */
  componentId?: string;
  /** Text content - can be slot reference */
  text?: string | SlotReference;
  /** Fill colors - can be slot reference */
  fills?: SimplifiedFill[] | string | SlotReference;
  /** Stroke colors - can be slot reference */
  strokes?: SimplifiedStrokes | SlotReference;
  /** Opacity - can be slot reference */
  opacity?: number | SlotReference;
  /** Layout - can be slot reference */
  layout?:
    | {
        mode?: string;
        dimensions?: { width?: number; height?: number; aspectRatio?: number };
      }
    | SlotReference;
  /** Minimal template children */
  children?: MinimalTemplateNode[];
}

/**
 * Component definition - stores template once
 */
export interface ComponentDefinition {
  /** Component ID (from componentId or generated) */
  id: string;
  /** Component name */
  name: string;
  /** Node type ('INSTANCE' or 'COMPONENT') */
  type: "INSTANCE" | "COMPONENT";
  /** Component properties from Figma */
  componentProperties?: Record<string, unknown>;
  /** Minimal template instead of full tree - NEW */
  template: MinimalTemplateNode;
  /** Slot IDs found in this component */
  slotIds: string[];
  /** Slot definitions by slot ID */
  slots: Map<string, SlotDefinition>;
}

/**
 * Code generation hints for AI coding agents
 * Maps Figma properties to TypeScript/React/CSS equivalents
 */
export interface CodeHint {
  /** TypeScript type */
  tsType?: string;
  /** React prop name or style path (e.g., "style.backgroundColor") */
  reactProp?: string;
  /** CSS property name (e.g., "background-color") */
  cssProperty?: string;
  /** Example value */
  example?: unknown;
  /** Whether this is a style prop */
  isStyleProp?: boolean;
}

/**
 * Slot definition - represents variable content
 * Updated in Phase 2 to include semantic name for better LLM understanding
 */
export interface SlotDefinition {
  /** Unique slot identifier */
  slotId: string;
  /** Path to node within component (e.g., "children[0].fills" in bracket notation) */
  nodePath: string;
  /** Type of value that varies */
  valueType:
    | "text"
    | "fills"
    | "strokes"
    | "opacity"
    | "visibility"
    | "property";
  /** Default value from most common instance */
  defaultValue: unknown;
  /** All variations found across instances */
  variations: Map<string, unknown>;
  /** How many instances use this slot */
  instanceCount: number;
  /** Code generation hints for AI agents */
  codeHint?: CodeHint;
  /** Semantic name for LLM understanding (e.g., "icon-color", "button-text") */
  semanticName?: string;
}

/**
 * Compressed instance - minimal reference with overrides
 */
export interface CompressedInstance {
  /** Instance node ID */
  id: string;
  /** Reference to component definition */
  componentId: string;
  /** Instance name */
  name: string;
  /** Whether instance is visible */
  visible?: boolean;
  /** Layout grid reference (if detected) */
  layout?: string;
  /** Slot overrides - only values different from default */
  overrides?: Record<string, unknown>;
  /** Original layout data for positioning */
  layoutData?: LayoutPosition;
}

/**
 * Layout position data for grid placement
 */
export interface LayoutPosition {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
}

/**
 * Layout grid for positioning instances
 */
export interface LayoutGrid {
  /** Grid ID */
  id: string;
  /** Grid name */
  name: string;
  /** Number of columns */
  columns: number;
  /** Number of rows */
  rows: number;
  /** Column width */
  columnWidth?: number;
  /** Row height */
  rowHeight?: number;
  /** Horizontal gap */
  gapX?: number;
  /** Vertical gap */
  gapY?: number;
  /** Instance positions by ID */
  positions: Record<string, { column: number; row: number }>;
}

/**
 * Compressed design output
 */
export interface CompressedDesign {
  /** Design file name */
  name: string;
  /** Component definitions by ID */
  components: Map<string, ComponentDefinition>;
  /** Layout grids by ID */
  layouts?: Map<string, LayoutGrid>;
  /** Compressed instances */
  instances: CompressedInstance[];
  /** Non-component nodes (pass-through) */
  nodes: SimplifiedNode[];
  /** Global style variables */
  globalVars: GlobalVars;
}

// =====================================================
// Analysis Types
// =====================================================

/**
 * Component inventory from analysis
 */
export interface ComponentInventory {
  /** Instance groups by component ID */
  instancesByComponent: Map<string, SimplifiedNode[]>;
  /** Component usage counts */
  componentCounts: Map<string, number>;
  /** Estimated size reduction (bytes) */
  estimatedSavings: number;
  /** Original size (bytes) */
  originalSize: number;
  /** Compressed size estimate (bytes) */
  compressedSize: number;
}

/**
 * Node path representation
 */
export type NodePath = Array<string | number>;

/**
 * Node value comparison result
 */
export interface NodeComparison {
  /** Path being compared */
  path: NodePath;
  /** Whether values are equal */
  equal: boolean;
  /** Value from first instance */
  value1: unknown;
  /** Value from second instance */
  value2: unknown;
  /** Type of difference */
  differenceType?: "value" | "type" | "missing" | "extra";
}

/**
 * Slot detection result
 */
export interface SlotDetectionResult {
  /** Detected slots by path string */
  slots: Map<string, SlotDefinition>;
  /** Similarity score (0-1) */
  similarityScore: number;
  /** Total paths compared */
  totalPaths: number;
  /** Matching paths */
  matchingPaths: number;
}

// =====================================================
// Serialization Types
// =====================================================

/**
 * Component hierarchy metadata for understanding relationships
 */
export interface ComponentHierarchy {
  /** Component IDs this component contains (nested) */
  children?: string[];
  /** Parent component IDs (where this is used) */
  parents?: string[];
  /** Depth in component tree (0 = root level) */
  depth?: number;
}

/**
 * Compressed design ready for serialization
 * Maps are converted to Records for JSON/Toon encoding
 */
export interface SerializableCompressedDesign {
  /** Design file name */
  name: string;
  /** Component definitions by ID */
  components: Record<string, SerializableComponentDefinition>;
  /** Component hierarchy metadata */
  componentHierarchy?: Record<string, ComponentHierarchy>;
  /** Layout grids by ID */
  layouts?: Record<string, LayoutGrid>;
  /** Compressed instances */
  instances: CompressedInstance[];
  /** Non-component nodes (pass-through) */
  nodes: SimplifiedNode[];
  /** Global style variables */
  globalVars: GlobalVars;
}

/**
 * Serializable component definition
 */
export interface SerializableComponentDefinition {
  /** Component ID */
  id: string;
  /** Component name */
  name: string;
  /** Node type */
  type: "INSTANCE" | "COMPONENT";
  /** Component properties */
  componentProperties?: Record<string, unknown>;
  /** Minimal template instead of full children - NEW */
  template: MinimalTemplateNode;
  /** Slot IDs */
  slotIds: string[];
  /** Slot definitions (CodeHint included) */
  slots: Record<string, SlotDefinition>;
}

// =====================================================
// Utility Types
// =====================================================

/**
 * Node with potential component marker
 */
export interface NodeWithComponentInfo extends SimplifiedNode {
  /** Component ID if instance */
  componentId?: string;
  /** Whether this node should be extracted */
  shouldExtract?: boolean;
}

/**
 * Compression result with metadata
 */
export interface CompressionResult {
  /** Compressed design */
  design: SerializableCompressedDesign;
  /** Compression statistics */
  stats: CompressionStats;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  /** Original node count */
  originalNodeCount: number;
  /** Compressed instance count */
  instanceCount: number;
  /** Component definition count */
  componentCount: number;
  /** Original size (bytes) */
  originalSize: number;
  /** Compressed size (bytes) */
  compressedSize: number;
  /** Size reduction percentage */
  reductionPercent: number;
  /** Slots detected */
  slotCount: number;
  /** Layout grids detected */
  gridCount: number;
}
