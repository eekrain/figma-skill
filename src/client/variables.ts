/**
 * Figma Variables Processing Functions
 * Phase 5: Figma Variables Integration
 *
 * Functions for fetching, parsing, and merging Figma variables
 * with local styles into a unified token system.
 */
import type {
  MergedToken,
  MergedVariables,
  RgbValue,
  TokenCategory,
  Variable,
  VariableCollection,
  VariablesResult,
} from "@/client/variable-types";
import type { SimplifiedDesign, StyleWithMetadata } from "@/extractors/types";

/**
 * Convert style path to semantic name
 * "primary/500" → "primary-500"
 * "fill_abc123" → "fill_abc123" (keep as-is)
 */
export function toSemanticName(styleName: string): string {
  return styleName.includes("/") ? styleName.replace(/\//g, "-") : styleName;
}

/**
 * Infer category from name and type
 */
export function inferCategory(name: string, type: string): TokenCategory {
  const lowerName = name.toLowerCase();

  if (type === "color" || type === "COLOR" || type === "color-style") {
    // Check for more specific categories first
    if (lowerName.includes("text")) return "color-text";
    if (lowerName.includes("bg") || lowerName.includes("background"))
      return "color-background";
    if (lowerName.includes("primary")) return "color-primary";
    if (lowerName.includes("secondary")) return "color-secondary";
    if (lowerName.includes("success")) return "color-success";
    if (lowerName.includes("error")) return "color-error";
    if (lowerName.includes("warning")) return "color-warning";
    return "color-neutral";
  }

  if (type === "float" || type === "FLOAT") {
    if (lowerName.includes("spacing") || lowerName.includes("gap"))
      return "spacing";
    if (lowerName.includes("radius")) return "border-radius";
    if (lowerName.includes("font") || lowerName.includes("text"))
      return "font-size";
    return "dimension";
  }

  return "other";
}

/**
 * Convert RGBA to hex
 */
export function rgbaToHex(rgba: RgbValue): string {
  const r = Math.round(rgba.r * 255);
  const g = Math.round(rgba.g * 255);
  const b = Math.round(rgba.b * 255);
  const a = rgba.a;

  if (a === 1) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  const alpha = Math.round(a * 255);
  return (
    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}` +
    alpha.toString(16).padStart(2, "0")
  );
}

/**
 * Format value for output
 */
export function formatValue(
  value: string | number | boolean | RgbValue,
  type: string
): string {
  if ((type === "COLOR" || type === "color") && typeof value === "object") {
    // RGBA to hex
    return rgbaToHex(value as RgbValue);
  }
  return String(value);
}

/**
 * Convert Figma Variable to MergedToken
 */
export function variableToToken(variable: Variable): MergedToken {
  // Format mode values if present
  const formattedModes: Record<string, string> = {};
  if (variable.variableModes) {
    for (const [modeId, modeValue] of Object.entries(variable.variableModes)) {
      formattedModes[modeId] = formatValue(modeValue, variable.variableType);
    }
  }

  return {
    id: variable.id,
    name: variable.name,
    value: formatValue(variable.value, variable.variableType),
    type: variable.resolvedType.toLowerCase(),
    source: "variable",
    collectionId: variable.variableCollectionId,
    codeSyntax: variable.codeConnectAliases?.[0],
    description: variable.description,
    modes: Object.keys(formattedModes).length > 0 ? formattedModes : undefined,
    semanticName: variable.name,
    category: inferCategory(variable.name, variable.resolvedType),
  };
}

/**
 * Get styles from SimplifiedDesign's globalVars
 */
function getStylesFromDesign(
  design: Pick<SimplifiedDesign, "globalVars">
): Array<{
  id: string;
  name: string;
  value: unknown;
  styleType: string;
  semanticName?: string;
}> {
  const styles: Array<{
    id: string;
    name: string;
    value: unknown;
    styleType: string;
    semanticName?: string;
  }> = [];

  // Extract styles from globalVars.styles (Figma styles)
  const globalVarsStyles = design.globalVars?.styles || {};
  for (const [styleId, style] of Object.entries(globalVarsStyles)) {
    const styleWithMetadata = style as StyleWithMetadata;
    const value = styleWithMetadata.value;
    const semanticName = styleWithMetadata.semanticName;

    // Determine style type from the value
    let styleType = "unknown";
    let name = semanticName || styleId;

    if (Array.isArray(value)) {
      // Array of fills (FILL type)
      styleType = "FILL";
      if (
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null
      ) {
        const firstFill = value[0] as { type?: string };
        name = semanticName || firstFill.type || "fill";
      }
    } else if (value && typeof value === "object") {
      const val = value as Record<string, unknown>;
      if ("fontSize" in val || "fontFamily" in val) {
        styleType = "TEXT";
        name = semanticName || "text";
      } else if ("effects" in val) {
        styleType = "EFFECT";
        name = semanticName || "effect";
      } else if ("strokeWeight" in val || "strokeWeights" in val) {
        styleType = "STROKE";
        name = semanticName || "stroke";
      } else if ("padding" in val || "axisSizes" in val || "mode" in val) {
        styleType = "layout";
        name = semanticName || "layout";
      }
    }

    styles.push({
      id: styleId,
      name,
      value,
      styleType,
      semanticName,
    });
  }

  return styles;
}

/**
 * Convert Local Style to MergedToken
 */
function localStyleToToken(style: {
  id: string;
  name: string;
  value: unknown;
  styleType: string;
  semanticName?: string;
}): MergedToken {
  const semanticName = style.semanticName || toSemanticName(style.name);
  const styleType = style.styleType.toUpperCase();

  // Extract color value from style if it's a color style (FILL array)
  let formattedValue: string | number | boolean | RgbValue = style.value as
    | string
    | number
    | boolean
    | RgbValue;
  if (
    styleType === "FILL" &&
    Array.isArray(style.value) &&
    style.value.length > 0
  ) {
    const firstFill = style.value[0];
    if (
      typeof firstFill === "object" &&
      firstFill !== null &&
      "color" in firstFill
    ) {
      const fillWithColor = firstFill as { color: RgbValue };
      formattedValue = fillWithColor.color;
    } else if (typeof firstFill === "string") {
      formattedValue = firstFill;
    }
  }

  return {
    id: style.id,
    name: semanticName,
    value: formatValue(formattedValue, styleType),
    type: styleType.toLowerCase(),
    source: "localStyle",
    semanticName,
    category: inferCategory(semanticName, styleType),
  };
}

/**
 * Merge variables + local styles into unified token system
 */
export function mergeVariables(
  design: SimplifiedDesign,
  variables: VariablesResult
): MergedVariables {
  const merged: MergedVariables = {
    bySource: { variables: {}, localStyles: {} },
    byName: {},
    byCollection: {},
    modes: variables.modes,
  };

  // 1. Add variables (highest priority - most semantic)
  for (const variable of variables.variables) {
    const token = variableToToken(variable);
    merged.bySource.variables[variable.id] = token;
    merged.byName[variable.name] = token;

    // Organize by collection
    if (variable.variableCollectionId) {
      const collection = variables.collections.find(
        (c) => c.id === variable.variableCollectionId
      );
      if (collection) {
        if (!merged.byCollection[collection.name]) {
          merged.byCollection[collection.name] = {};
        }
        merged.byCollection[collection.name][variable.name] = token;
      }
    }
  }

  // 2. Add local styles (fallback - use when no variable exists)
  const styles = getStylesFromDesign(design);
  for (const style of styles) {
    const semanticName = style.semanticName || toSemanticName(style.name);

    // Skip if variable with same name exists
    if (merged.byName[semanticName]) {
      continue;
    }

    const token = localStyleToToken(style);
    merged.bySource.localStyles[style.id] = token;

    if (!merged.byName[semanticName]) {
      merged.byName[semanticName] = token;
    }
  }

  return merged;
}
