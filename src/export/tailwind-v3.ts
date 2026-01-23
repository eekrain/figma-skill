/**
 * Tailwind CSS v3 Export Implementation
 * Phase 3: Multi-Format Token Export
 */
import type { DesignTokens } from "@/tokens/types";

import type { TailwindV3Config, TailwindV3Options } from "./types";

const DEFAULT_OPTIONS: TailwindV3Options = {
  includeMetadata: true,
  cssPrefix: "",
  nestColorFamilies: true,
};

/**
 * Convert design tokens to Tailwind CSS v3 config
 *
 * @param tokens - Design tokens from Phase 1 extraction
 * @param options - Export options
 * @returns Tailwind v3 compatible configuration
 */
export function toTailwindV3(
  tokens: DesignTokens,
  options: TailwindV3Options = {}
): TailwindV3Config {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const config: TailwindV3Config = {
    theme: {
      extend: {},
    },
  };

  // Colors
  if (Object.keys(tokens.colors.all).length > 0) {
    config.theme.colors = buildTailwindColors(tokens, opts);
  }

  // Typography
  if (Object.keys(tokens.typography.styles).length > 0) {
    config.theme.fontFamily = buildTailwindFonts(tokens);
    config.theme.fontSize = buildTailwindFontSizes(tokens);
  }

  // Spacing
  if (Object.keys(tokens.spacing.scale).length > 0) {
    config.theme.spacing = buildTailwindSpacing(tokens);
  }

  // Border radius
  if (Object.keys(tokens.borders.radius).length > 0) {
    config.theme.borderRadius = buildTailwindBorderRadius(tokens);
  }

  // Effects (shadows)
  if (Object.keys(tokens.effects.shadows).length > 0) {
    config.theme.boxShadow = buildTailwindShadows(tokens);
  }

  return config;
}

/**
 * Build Tailwind colors from design tokens
 */
function buildTailwindColors(
  tokens: DesignTokens,
  options: TailwindV3Options
): Record<string, string | Record<string, string>> {
  const colors: Record<string, string | Record<string, string>> = {};

  // Add semantic colors first
  for (const [name, token] of Object.entries(tokens.colors.semantic)) {
    const colorName = options.transformName
      ? options.transformName(token.name)
      : token.name;
    colors[colorName] = token.value;
  }

  // Add color families (nested or flat)
  if (options.nestColorFamilies) {
    for (const [family, scales] of Object.entries(tokens.colors.families)) {
      const familyName = options.transformName
        ? options.transformName(family)
        : family;

      // Check if there's already a semantic color with this name
      const existingColor = colors[familyName];

      // If existing semantic color exists, preserve it
      if (existingColor && typeof existingColor === "string") {
        // Start with an object that includes the semantic color as DEFAULT
        colors[familyName] = { DEFAULT: existingColor as string };
      } else {
        colors[familyName] = {};
      }

      // Add family scales
      const familyObj = colors[familyName] as Record<string, string>;
      for (const [scale, token] of Object.entries(scales)) {
        familyObj[String(scale)] = token.value;
      }
    }
  } else {
    // Flat color names
    for (const [family, scales] of Object.entries(tokens.colors.families)) {
      for (const [scale, token] of Object.entries(scales)) {
        const colorName = options.transformName
          ? options.transformName(`${family}-${scale}`)
          : `${family}-${scale}`;
        colors[colorName] = token.value;
      }
    }
  }

  return colors;
}

/**
 * Build Tailwind font families
 */
function buildTailwindFonts(
  tokens: DesignTokens
): Record<string, string | string[]> {
  const fonts: Record<string, string | string[]> = {};

  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    if (token.value.fontFamily) {
      // Extract first font family name (before comma or quotes)
      const fontName = token.value.fontFamily
        .split(",")[0]
        .replace(/"/g, "")
        .replace(/'/g, "")
        .trim();
      fonts[toKebabCase(name)] = fontName;
    }
  }

  return fonts;
}

/**
 * Build Tailwind font sizes
 */
function buildTailwindFontSizes(
  tokens: DesignTokens
): Record<string, string | [string, string]> {
  const sizes: Record<string, string | [string, string]> = {};

  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    const fontSize = token.value.fontSize;
    const lineHeight = token.value.lineHeight;

    if (lineHeight && lineHeight !== "") {
      sizes[toKebabCase(name)] = [fontSize, lineHeight];
    } else {
      sizes[toKebabCase(name)] = fontSize;
    }
  }

  return sizes;
}

/**
 * Build Tailwind spacing scale
 */
function buildTailwindSpacing(tokens: DesignTokens): Record<string, string> {
  const spacing: Record<string, string> = {};

  for (const [name, token] of Object.entries(tokens.spacing.scale)) {
    const key = name.replace("spacing-", "");
    spacing[key] = token.value;
  }

  return spacing;
}

/**
 * Build Tailwind border radius
 */
function buildTailwindBorderRadius(
  tokens: DesignTokens
): Record<string, string> {
  const radius: Record<string, string> = {};

  for (const [name, token] of Object.entries(tokens.borders.radius)) {
    const key = name.replace("radius-", "");
    radius[key] = token.value;
  }

  return radius;
}

/**
 * Build Tailwind box shadows
 */
function buildTailwindShadows(tokens: DesignTokens): Record<string, string> {
  const shadows: Record<string, string> = {};

  for (const [name, token] of Object.entries(tokens.effects.shadows)) {
    shadows[toKebabCase(name)] = effectToShadowString(token.value);
  }

  return shadows;
}

/**
 * Convert effect array to CSS shadow string
 */
function effectToShadowString(
  effects: Array<{
    type?: string;
    x?: number;
    y?: number;
    blur?: number;
    spread?: number;
    color?: string;
  }>
): string {
  return effects
    .filter((e) => e.type === "DROP_SHADOW")
    .map((e) => {
      const x = e.x || 0;
      const y = e.y || 0;
      const blur = e.blur || 0;
      const spread = e.spread || 0;
      const color = e.color || "#000000";

      // Omit spread if it's 0
      if (spread === 0) {
        return `${x}px ${y}px ${blur}px ${color}`;
      }
      return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    })
    .join(", ");
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
