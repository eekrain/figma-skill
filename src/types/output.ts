/**
 * Simplified design output types
 * These types represent the transformed Figma data optimized for AI consumption
 */

/**
 * Style types that can be referenced globally
 */
export type StyleType = "fill" | "stroke" | "effect" | "text" | "grid";

/**
 * Named style reference
 */
export interface StyleRef {
  /** Style key in globalVars */
  key: string;
  /** Style type */
  type: StyleType;
}

/**
 * Paint/fill representation
 */
export interface SimplifiedPaint {
  /** Paint type (SOLID, GRADIENT_LINEAR, etc.) */
  type: string;
  /** Color value (hex or rgba) */
  color?: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Gradient positions for linear/radial gradients */
  gradientHandlePositions?: Array<{ x: number; y: number; position: number }>;
  /** Gradient stops */
  gradientStops?: Array<{ position: number; color: string }>;
}

/**
 * Layout positioning and sizing
 */
export interface SimplifiedLayout {
  /** AutoLayout mode ("NONE", "HORIZONTAL", "VERTICAL") */
  mode?: string;
  /** Primary axis alignment */
  primaryAxisAlignItems?: string;
  /** Counter axis alignment */
  counterAxisAlignItems?: string;
  /** Primary axis spacing (px) */
  itemSpacing?: number;
  /** Counter axis spacing (px) */
  counterAxisSpacing?: number;
  /** Padding */
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Rotation */
  rotation?: number;
  /** Constraints */
  constraints?: {
    horizontal?: string;
    vertical?: string;
  };
}

/**
 * Text style properties
 */
export interface SimplifiedTextStyle {
  /** Font family */
  fontFamily?: string;
  /** Font weight */
  fontWeight?: number;
  /** Font size (px) */
  fontSize?: number;
  /** Line height (px or percentage) */
  lineHeight?: { value: number; unit: string };
  /** Letter spacing (px or percentage) */
  letterSpacing?: { value: number; unit: string };
  /** Text align horizontal */
  textAlignHorizontal?: string;
  /** Text align vertical */
  textAlignVertical?: string;
  /** Text case */
  textCase?: string;
  /** Text decoration */
  textDecoration?: string;
}

/**
 * Effect (shadow, blur, etc.)
 */
export interface SimplifiedEffect {
  /** Effect type */
  type: string;
  /** Color */
  color?: string;
  /** Offset X */
  offset?: { x: number; y: number };
  /** Radius */
  radius?: number;
  /** Visible */
  visible?: boolean;
}

/**
 * Component reference
 */
export interface SimplifiedComponent {
  /** Component ID */
  id: string;
  /** Component key */
  key: string;
  /** Component name */
  name: string;
  /** Component set ID if part of a variant set */
  componentSetId?: string;
}

/**
 * Simplified node representation
 */
export interface SimplifiedNode {
  /** Node ID */
  id: string;
  /** Node type (FRAME, TEXT, INSTANCE, etc.) */
  type: string;
  /** Node name */
  name: string;
  /** Whether node is visible */
  visible?: boolean;
  /** Layout information */
  layout?: SimplifiedLayout;
  /** Text style (for text nodes) */
  textStyle?: SimplifiedTextStyle;
  /** Fills */
  fills?: SimplifiedPaint[];
  /** Strokes */
  strokes?: SimplifiedPaint[];
  /** Effects */
  effects?: SimplifiedEffect[];
  /** Component reference (if instance) */
  componentId?: string;
  /** Children */
  children?: SimplifiedNode[];
  /** Custom data from extractors */
  [key: string]: unknown;
}

/**
 * Component definition
 */
export interface SimplifiedComponentDefinition {
  /** Component ID */
  id: string;
  /** Component key */
  key: string;
  /** Component name */
  name: string;
  /** Description */
  description?: string;
  /** Component set ID if part of variant set */
  componentSetId?: string;
}

/**
 * Component set (variant) definition
 */
export interface SimplifiedComponentSetDefinition {
  /** Component set ID */
  id: string;
  /** Component set name */
  name: string;
  /** Description */
  description?: string;
  /** Variant component IDs */
  componentIds: string[];
}

/**
 * Global styles reference
 */
export interface GlobalVars {
  /** Named styles by key */
  styles: Record<string, StyleRef>;
}

/**
 * Simplified design output
 * Main output type for Figma data extraction
 */
export interface SimplifiedDesign {
  /** File/metadata name */
  name: string;
  /** Extracted nodes */
  nodes: SimplifiedNode[];
  /** Component definitions */
  components: Record<string, SimplifiedComponentDefinition>;
  /** Component set definitions */
  componentSets: Record<string, SimplifiedComponentSetDefinition>;
  /** Global variables and styles */
  globalVars: GlobalVars;
}
