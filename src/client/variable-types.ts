/**
 * Figma Variables Integration Type Definitions
 * Phase 5: Figma Variables Integration
 *
 * These types represent Figma's Variable API response structures
 * and the merged token system for unified access.
 */

/**
 * Available modes (themes) from Figma Variables
 */
export interface VariableMode {
  modeId: string;
  name: string; // "Light", "Dark", "Compact", etc.
  propertyVersion: number;
}

/**
 * Figma Variable from API
 */
export interface Variable {
  id: string;
  name: string; // Semantic: "primary-color", "spacing-md"
  variableType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  value: string | number | boolean | RgbValue;
  resolvedType: string;
  variableModes?: Record<string, string | number | boolean | RgbValue>; // Mode-specific values
  variableCollectionId: string;
  codeConnectAliases?: string[]; // CSS variable names
  description?: string;
}

/**
 * RGBA color value from Figma
 */
export interface RgbValue {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/**
 * Variables API response
 */
export interface VariablesResult {
  variables: Variable[];
  collections: VariableCollection[];
  modes: VariableMode[];
}

/**
 * Variable collection (organizational group)
 */
export interface VariableCollection {
  id: string;
  name: string; // "Colors", "Spacing", "Typography"
  modes: VariableMode[];
}

/**
 * Merged token from variable or local style
 */
export interface MergedToken {
  id: string;
  name: string; // Semantic name
  value: string; // Formatted: "#008FFF", "16px"
  type: string; // "color", "float", "string", "boolean"
  source: "variable" | "localStyle";

  // Variable-specific
  collectionId?: string;
  codeSyntax?: string; // CSS var name
  description?: string;
  modes?: Record<string, string>; // Theme values (formatted)

  // Computed
  semanticName: string;
  category: TokenCategory;
}

/**
 * Merged variables + local styles
 */
export interface MergedVariables {
  /** Tokens by source (for debugging) */
  bySource: {
    variables: Record<string, MergedToken>;
    localStyles: Record<string, MergedToken>;
  };

  /** Deduped by semantic name (for lookup) */
  byName: Record<string, MergedToken>;

  /** Organized by collection (for AI context) */
  byCollection: Record<string, Record<string, MergedToken>>;

  /** Available modes/themes */
  modes: VariableMode[];
}

/**
 * Token category for AI understanding
 */
export type TokenCategory =
  | "color-primary"
  | "color-secondary"
  | "color-success"
  | "color-error"
  | "color-warning"
  | "color-text"
  | "color-background"
  | "color-neutral"
  | "spacing"
  | "border-radius"
  | "font-size"
  | "dimension"
  | "other";
