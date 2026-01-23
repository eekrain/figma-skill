/**
 * Token extraction implementation
 * Extracts design tokens from SimplifiedDesign
 */
import type {
  SimplifiedDesign,
  SimplifiedNode,
  StyleTypes,
} from "@/extractors/types";

import type {
  ColorToken,
  DesignTokens,
  EffectToken,
  EffectValue,
  SpacingToken,
  TokenExtractionOptions,
  TypographyToken,
} from "./types";

// =====================================================
// Main Export Function
// =====================================================

/**
 * Main token extraction function
 * Analyzes a SimplifiedDesign to extract structured design tokens
 */
export function extractTokens(
  design: SimplifiedDesign,
  options: TokenExtractionOptions = {}
): DesignTokens {
  const {
    inferSemanticNames = true,
    calculateContrast = true,
    detectPatterns = true,
  } = options;

  // Extract from globalVars.styles (Figma styles)
  const styleTokens = extractFromStyles(design.globalVars?.styles || {});

  // Extract from actual node usage (patterns, deduced values)
  const usageTokens = extractFromUsage(design.nodes, design);

  // Merge and categorize
  return categorizeAndMergeTokens(styleTokens, usageTokens, {
    inferSemanticNames,
    calculateContrast,
    detectPatterns,
  });
}

// Re-export types
export type * from "./types";

// =====================================================
// Style-Based Extraction
// =====================================================

/**
 * Token structure for internal processing
 */
interface InternalToken {
  name: string;
  value: unknown;
  styleId: string;
  semanticName?: string;
  category:
    | "color"
    | "typography"
    | "effect"
    | "spacing"
    | "border"
    | "unknown";
}

/**
 * Extract tokens from Figma styles (globalVars.styles)
 */
function extractFromStyles(
  styles: Record<string, StyleTypes>
): Omit<DesignTokens, "stats"> {
  const colors: Record<string, ColorToken> = {};
  const typography: Record<string, TypographyToken> = {};
  const effects: Record<string, EffectToken> = {};
  const spacing: Record<string, SpacingToken> = {};
  const borders: Record<string, any> = {};

  for (const [styleId, styleValue] of Object.entries(styles)) {
    // Handle StyleWithMetadata wrapper
    const actualValue =
      typeof styleValue === "object" &&
      styleValue !== null &&
      "value" in styleValue
        ? (styleValue as { value: StyleTypes; semanticName?: string }).value
        : styleValue;

    const semanticName =
      typeof styleValue === "object" &&
      styleValue !== null &&
      "semanticName" in styleValue
        ? (styleValue as { semanticName?: string }).semanticName
        : undefined;

    const tokenName = semanticName || styleId;

    // Determine category and extract token
    const token = extractTokenFromValue(
      actualValue,
      styleId,
      semanticName || tokenName
    );

    if (token) {
      switch (token.category) {
        case "color":
          colors[tokenName] = token as ColorToken;
          break;
        case "typography":
          typography[tokenName] = token as TypographyToken;
          break;
        case "effect":
          effects[tokenName] = token as EffectToken;
          break;
        case "spacing":
          spacing[tokenName] = token as SpacingToken;
          break;
        case "border":
          borders[tokenName] = token;
          break;
      }
    }
  }

  return {
    colors: { all: colors, semantic: {}, families: {} },
    typography: {
      styles: typography,
      families: extractFontFamilies(typography),
    },
    spacing: { scale: spacing },
    effects: { shadows: effects, blurs: {} },
    borders: { radius: borders },
  };
}

/**
 * Extract a token from a style value
 */
function extractTokenFromValue(
  value: StyleTypes,
  styleId: string,
  name: string
): InternalToken | null {
  // Check for string value (could be direct color or in StyleWithMetadata)
  // Type assertion needed because StyleTypes union doesn't directly include string
  const strValue = value as unknown as string | null;
  if (typeof strValue === "string" && strValue) {
    if (
      strValue.startsWith("#") ||
      strValue.startsWith("rgb") ||
      strValue.startsWith("rgba")
    ) {
      return {
        name,
        value: strValue,
        styleId,
        category: "color",
      };
    }
  }

  // Color fills (SimplifiedFill[] with color values)
  if (Array.isArray(value)) {
    const firstFill = value[0];
    if (typeof firstFill === "string") {
      // Check if it's a color value
      if (
        firstFill.startsWith("#") ||
        firstFill.startsWith("rgb") ||
        firstFill.startsWith("rgba")
      ) {
        return {
          name,
          value: firstFill,
          styleId,
          category: "color",
        };
      }
    }
  }

  // Typography (SimplifiedTextStyle)
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    // Check for typography properties
    if (
      "fontFamily" in obj ||
      "fontSize" in obj ||
      "fontWeight" in obj ||
      "lineHeight" in obj
    ) {
      return {
        name,
        value: {
          fontFamily: String(obj.fontFamily || "sans-serif"),
          fontSize: formatSize(obj.fontSize),
          fontWeight: obj.fontWeight ?? 400,
          lineHeight: formatLineHeight(obj.lineHeight),
          letterSpacing: obj.letterSpacing
            ? formatSize(obj.letterSpacing)
            : undefined,
          textTransform: obj.textCase
            ? String(obj.textCase).toLowerCase()
            : undefined,
        },
        styleId,
        category: "typography",
      };
    }

    // Check for layout properties (spacing)
    if ("padding" in obj || "gap" in obj) {
      // Layout values - could be spacing
      return null; // Skip layout for now, handle in usage extraction
    }

    // Check for effects (shadows, blurs)
    if ("effects" in obj || "shadow" in obj || "blur" in obj) {
      const effects = normalizeEffects(obj);
      if (effects.length > 0) {
        return {
          name,
          value: effects,
          styleId,
          category: "effect",
        };
      }
    }
  }

  return null;
}

// =====================================================
// Usage-Based Extraction
// =====================================================

/**
 * Extract tokens from actual node usage (for deduced tokens)
 */
function extractFromUsage(
  nodes: SimplifiedNode[],
  design: SimplifiedDesign
): Pick<DesignTokens, "spacing" | "borders"> {
  const spacing: Record<string, SpacingToken> = {};
  const borders: Record<string, any> = {};

  function processNode(node: SimplifiedNode) {
    // Extract spacing from layout
    if (node.layout && typeof node.layout === "object") {
      const layout = node.layout as unknown as Record<string, unknown>;

      // Extract padding values
      if ("padding" in layout && layout.padding) {
        const padding = layout.padding as
          | { top?: number; right?: number; bottom?: number; left?: number }
          | number
          | string;
        extractSpacingFromValue(padding, spacing, "padding");
      }

      // Extract gap values
      if ("gap" in layout && layout.gap) {
        const gapValue = formatSize(layout.gap);
        const spacingKey = `gap-${gapValue}`;
        if (!spacing[spacingKey]) {
          spacing[spacingKey] = {
            name: spacingKey,
            value: gapValue,
            category: "spacing",
          };
        }
      }
    }

    // Extract border radius
    if (node.borderRadius && typeof node.borderRadius === "string") {
      const radiusKey = `radius-${node.borderRadius}`;
      if (!borders[radiusKey]) {
        borders[radiusKey] = {
          name: radiusKey,
          value: node.borderRadius,
          category: "border",
        };
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  for (const node of nodes) {
    processNode(node);
  }

  return { spacing: { scale: spacing }, borders: { radius: borders } };
}

/**
 * Extract spacing tokens from a value
 */
function extractSpacingFromValue(
  value: unknown,
  spacing: Record<string, SpacingToken>,
  prefix: string
): void {
  if (typeof value === "number" || typeof value === "string") {
    const formatted = formatSize(value);
    const spacingKey = `${prefix}-${formatted}`;
    if (!spacing[spacingKey]) {
      spacing[spacingKey] = {
        name: spacingKey,
        value: formatted,
        category: "spacing",
      };
    }
  } else if (typeof value === "object" && value !== null) {
    for (const [side, sideValue] of Object.entries(value)) {
      const formatted = formatSize(sideValue);
      const spacingKey = `${prefix}-${side}-${formatted}`;
      if (!spacing[spacingKey]) {
        spacing[spacingKey] = {
          name: spacingKey,
          value: formatted,
          category: "spacing",
        };
      }
    }
  }
}

// =====================================================
// Token Categorization and Merging
// =====================================================

/**
 * Merge tokens from different sources and categorize
 */
function categorizeAndMergeTokens(
  styleTokens: Omit<DesignTokens, "stats">,
  usageTokens: Pick<DesignTokens, "spacing" | "borders">,
  options: TokenExtractionOptions
): DesignTokens {
  // Merge color tokens
  const allColors = {
    ...styleTokens.colors.all,
  };

  // Detect color families (e.g., primary: { 100: ..., 500: ..., 900: ... })
  const families: Record<string, Record<number, ColorToken>> = {};
  const semantic: Record<string, ColorToken> = {};

  for (const token of Object.values(allColors)) {
    const colorToken = token as ColorToken;

    // Calculate contrast if requested (for all colors)
    if (options.calculateContrast) {
      colorToken.contrast = {
        onWhite: calculateContrastRatio(colorToken.value, "#ffffff"),
        onBlack: calculateContrastRatio(colorToken.value, "#000000"),
      };
    }

    // Pattern: "primary-500" -> family: "primary", scale: 500
    const patternMatch = token.name.match(/^(.+)-(\d+)$/);
    if (patternMatch && options.detectPatterns) {
      const [, family, scaleStr] = patternMatch;
      const scale = parseInt(scaleStr, 10);
      if (!families[family]) families[family] = {};

      // Set family and scale on the token
      colorToken.family = family;
      colorToken.scale = scale;

      families[family][scale] = colorToken;
    } else {
      // Semantic color (no pattern)
      semantic[token.name] = colorToken;
    }
  }

  // Merge spacing tokens
  const allSpacing = {
    ...styleTokens.spacing.scale,
    ...usageTokens.spacing.scale,
  };

  // Merge border tokens
  const allBorders = {
    ...styleTokens.borders.radius,
    ...usageTokens.borders.radius,
  };

  // Calculate statistics
  const stats = {
    totalColorTokens: Object.keys(allColors).length,
    totalTypographyTokens: Object.keys(styleTokens.typography.styles).length,
    totalSpacingTokens: Object.keys(allSpacing).length,
    totalEffectTokens: Object.keys(styleTokens.effects.shadows).length,
    totalBorderTokens: Object.keys(allBorders).length,
    semanticColorCoverage:
      Object.keys(allColors).length > 0
        ? Object.keys(semantic).length / Object.keys(allColors).length
        : 0,
  };

  return {
    colors: {
      all: allColors as Record<string, ColorToken>,
      semantic,
      families,
    },
    typography: styleTokens.typography,
    spacing: { scale: allSpacing as Record<string, SpacingToken> },
    effects: styleTokens.effects,
    borders: { radius: allBorders },
    stats,
  };
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Format a size value to a string
 */
function formatSize(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return `${value}px`;
  }
  return "0px";
}

/**
 * Format a line height value
 */
function formatLineHeight(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    // If it's a unitless number, return as is
    if (value >= 0 && value <= 10) {
      return String(value);
    }
    // Otherwise treat as pixels
    return `${value}px`;
  }
  return "1.5";
}

/**
 * Extract font families from typography tokens
 */
function extractFontFamilies(
  typography: Record<string, TypographyToken>
): string[] {
  const families = new Set<string>();
  for (const token of Object.values(typography)) {
    if (token.value.fontFamily) {
      families.add(token.value.fontFamily);
    }
  }
  return Array.from(families).sort();
}

/**
 * Normalize effects to a standard format
 */
function normalizeEffects(obj: Record<string, unknown>): EffectValue[] {
  const effects: EffectValue[] = [];

  // Check for effects array
  if ("effects" in obj && Array.isArray(obj.effects)) {
    for (const effect of obj.effects) {
      if (typeof effect === "object" && effect !== null) {
        effects.push({
          type: String((effect as { type?: string }).type ?? "DROP_SHADOW"),
          color: (effect as { color?: string }).color,
          x: (effect as { x?: number })?.x,
          y: (effect as { y?: number })?.y,
          blur: (effect as { blur?: number })?.blur,
          spread: (effect as { spread?: number })?.spread,
        });
      }
    }
  }

  return effects;
}

/**
 * Convert color string to RGBA values
 */
function parseColor(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  // Hex format
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    let alpha = 1;

    // Handle #RRGGBBAA format
    if (hex.length === 8) {
      alpha = parseInt(hex.slice(6, 8), 16) / 255;
      hex = hex.slice(0, 6);
    }

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    return { r, g, b, a: alpha };
  }

  // RGB/RGBA format
  const rgbaMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10) / 255;
    const g = parseInt(rgbaMatch[2], 10) / 255;
    const b = parseInt(rgbaMatch[3], 10) / 255;
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    return { r, g, b, a };
  }

  // Default to black
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function calculateContrastRatio(
  foreground: string,
  background: string
): number {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Get relative luminance of a color
 */
function getLuminance(color: string): number {
  const { r, g, b } = parseColor(color);

  const toLinear = (c: number): number => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const linearR = toLinear(r);
  const linearG = toLinear(g);
  const linearB = toLinear(b);

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

// =====================================================
// Named Export for Convenience
// =====================================================

/**
 * @deprecated Use extractTokens instead
 */
export const extractDesignTokens = extractTokens;
