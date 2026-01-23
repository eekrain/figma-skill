/**
 * Component Analysis Types
 *
 * Types for analyzing Figma components to detect variants,
 * infer props, classify atomic design levels, and assess
 * implementation readiness.
 *
 * Improved Phase 2: Compression-based architecture that leverages
 * the compression system for intelligent slot-based prop inference.
 */
import type {
  CompressedDesign,
  CompressedInstance,
  SlotDefinition,
} from "@/compression/types";
import type {
  SimplifiedComponentDefinition,
  SimplifiedDesign,
  SimplifiedNode,
} from "@/extractors/types";

// =====================================================
// Core Types
// =====================================================

/**
 * Component variant detected from component sets or compression slots
 */
export interface ComponentVariant {
  /** Variant name (e.g., "primary", "large", "icon-left") */
  name: string;
  /** Variant property (e.g., "size", "variant", "state") */
  property: string;
  /** Variant value */
  value: string;
  /** Component ID for this variant */
  componentId: string;
  /** Instance count for this variant */
  instanceCount?: number;
}

/**
 * Inferred component prop from slot analysis
 * Uses compression slot system for intelligent prop detection
 */
export interface InferredProp {
  /** Prop name (e.g., "size", "variant", "icon", "label") */
  name: string;
  /** Prop type */
  type: "string" | "boolean" | "number" | "enum" | "ReactNode";
  /** Enum values if type is "enum" */
  enumValues?: string[];
  /** Default value */
  defaultValue?: string;
  /** Whether this prop is required */
  required: boolean;
  /** Description of what the prop does */
  description?: string;
  /** TypeScript type signature */
  tsType?: string;
  /** Source slot definition (if from compression) */
  sourceSlot?: SlotDefinition;
}

/**
 * Atomic design classification level
 */
export type AtomicLevel =
  | "atoms"
  | "molecules"
  | "organisms"
  | "templates"
  | "pages";

/**
 * Component readiness assessment
 */
export interface ComponentReadiness {
  /** Overall readiness score (0-100) */
  score: number;
  /** Whether component is ready for implementation */
  ready: boolean;
  /** Missing items that block implementation */
  missing: string[];
  /** Warnings about potential issues */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Code generation hints for specific frameworks
 */
export interface CodeHints {
  /** React-specific hints */
  react?: {
    /** Suggested component name */
    componentName: string;
    /** Props interface */
    propsInterface: string;
    /** Usage example */
    usageExample: string;
    /** Accessibility attributes needed */
    a11yProps: string[];
  };
  /** Vue-specific hints */
  vue?: {
    /** Suggested component name */
    componentName: string;
    /** Props definition */
    propsDefinition: string;
    /** Usage example */
    usageExample: string;
  };
}

// =====================================================
// Relationship and Usage Types (Framelink's TODOs)
// =====================================================

/**
 * Component relationships (parent, children, siblings, dependencies)
 * Implements what Framelink left as TODO items
 */
export interface ComponentRelationship {
  /** Parent component that contains this component */
  parent: string;
  /** Child components nested within this component */
  children: string[];
  /** Sibling components (same parent) */
  siblings: string[];
  /** Components this component depends on (uses within) */
  dependsOn: string[];
  /** Components/contexts that use this component */
  usedBy: string[];
}

/**
 * Component usage statistics
 * Implements what Framelink left as simplified/TODO
 */
export interface ComponentUsage {
  /** How many times this component is used across the design */
  frequency: number;
  /** Contexts where this component is used (page/frame names) */
  contexts: string[];
  /** Components commonly paired with this one */
  commonPairings: string[];
  /** Layout roles this component serves (list-item, grid-item, etc.) */
  layoutRoles: string[];
}

/**
 * Component styling information (extracted tokens)
 */
export interface ComponentStyling {
  /** Whether component has interactive states */
  hasStates: boolean;
  /** Detected state names */
  states: string[];
  /** Responsive behavior classification */
  responsiveBehavior: "fixed" | "flexible" | "responsive";
  /** Spacing tokens used */
  spacing: { internal: string[]; external: string[] };
  /** Color tokens referenced */
  colorTokens: string[];
  /** Typography tokens referenced */
  typographyTokens: string[];
}

// =====================================================
// Pattern and Hierarchy Types
// =====================================================

/**
 * Design pattern detected across components
 */
export interface DesignPattern {
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Components that participate in this pattern */
  components: string[];
  /** Usage guidance */
  usage: string;
  /** Implementation guidance */
  implementation: string;
}

/**
 * Atomic hierarchy categorization
 */
export interface AtomicHierarchy {
  /** Atom components (basic building blocks) */
  atoms: string[];
  /** Molecule components (simple combinations) */
  molecules: string[];
  /** Organism components (complex combinations) */
  organisms: string[];
  /** Template components (page layouts) */
  templates: string[];
  /** Page components */
  pages: string[];
}

/**
 * Implementation readiness categorization
 */
export interface ImplementationReadiness {
  /** Components ready to implement */
  readyToImplement: string[];
  /** Components that need more specification */
  needsSpecification: string[];
  /** Components with accessibility/other issues */
  hasIssues: string[];
  /** Overall suggestions */
  suggestions: string[];
}

/**
 * Analysis summary with scores
 */
export interface AnalysisSummary {
  /** Total number of components analyzed */
  totalComponents: number;
  /** Components count by atomic level */
  byCategory: Record<AtomicLevel, number>;
  /** Complexity score (0-100) */
  complexityScore: number;
  /** Consistency score (0-100) */
  consistencyScore: number;
  /** Estimated implementation effort */
  implementationEffort: "low" | "medium" | "high";
  /** Key recommendations */
  keyRecommendations: string[];
}

// =====================================================
// Complete Analysis Types
// =====================================================

/**
 * Complete component analysis result (per component)
 */
export interface ComponentAnalysis {
  /** Component key */
  key: string;
  /** Component ID */
  id: string;
  /** Component name */
  name: string;
  /** Component description */
  description?: string;
  /** Atomic design classification */
  atomicLevel: AtomicLevel;
  /** Component tags for discovery */
  tags: string[];
  /** Detected variants */
  variants: ComponentVariant[];
  /** Inferred props from compression slots */
  props: InferredProp[];
  /** Slot definitions from compression */
  slots: SlotDefinition[];
  /** Implementation readiness assessment */
  readiness: ComponentReadiness;
  /** Code generation hints */
  codeHints: CodeHints;
  /** Component relationships (optional, computed separately) */
  relationships?: ComponentRelationship;
  /** Usage statistics (optional, computed separately) */
  usage?: ComponentUsage;
  /** Styling information (optional, from token extraction) */
  styling?: ComponentStyling;
}

/**
 * Complete design system analysis result
 */
export interface DesignSystemAnalysis {
  /** Individual component analyses */
  components: Record<string, ComponentAnalysis>;
  /** Component relationship graph */
  relationships: Record<string, ComponentRelationship>;
  /** Usage statistics per component */
  usage: Record<string, ComponentUsage>;
  /** Detected design patterns */
  patterns: DesignPattern[];
  /** Atomic hierarchy */
  atomicHierarchy: AtomicHierarchy;
  /** Implementation readiness assessment */
  implementationReadiness: ImplementationReadiness;
  /** Analysis summary with scores */
  summary: AnalysisSummary;
}

/**
 * Options for component analysis
 */
export interface ComponentAnalysisOptions {
  /** Whether to include code generation hints */
  includeCodeHints?: boolean;
  /** Which frameworks to generate hints for */
  frameworks?: Array<"react" | "vue">;
  /** Whether to analyze relationships (adds computation) */
  includeRelationships?: boolean;
  /** Whether to analyze usage statistics (adds computation) */
  includeUsage?: boolean;
  /** Whether to include styling token extraction */
  includeStyling?: boolean;
}

// =====================================================
// Internal Helper Types
// =====================================================

/**
 * Internal type for component instance grouping
 */
export interface ComponentInstanceGroup {
  /** Component ID */
  componentId: string;
  /** Component key */
  componentKey: string;
  /** All instances of this component */
  instances: SimplifiedNode[];
}

/**
 * Internal type for analysis context
 */
export interface AnalysisContext {
  /** Compressed design output */
  compressed: CompressedDesign;
  /** All nodes from original design */
  allNodes: SimplifiedNode[];
  /** Component instances grouped by component ID */
  instanceGroups: Map<string, ComponentInstanceGroup>;
  /** Parent node mapping (child ID -> parent node) */
  parentMap: Map<string, SimplifiedNode>;
}
