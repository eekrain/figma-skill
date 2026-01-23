/**
 * Style Dictionary Export Implementation
 * Phase 3: Multi-Format Token Export
 */
import type { DesignTokens } from "@/tokens/types";

import type { ExportOptions, StyleDictionary } from "./types";

const DEFAULT_OPTIONS: ExportOptions = {
  includeMetadata: true,
  cssPrefix: "",
};

/**
 * Convert design tokens to Style Dictionary format
 *
 * @param tokens - Design tokens from Phase 1 extraction
 * @param options - Export options
 * @returns Style Dictionary compatible format
 */
export function toStyleDictionary(
  tokens: DesignTokens,
  options: ExportOptions = {}
): StyleDictionary {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const sd: StyleDictionary = {
    color: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    boxShadow: {},
  };

  // Colors
  for (const [name, token] of Object.entries(tokens.colors.all)) {
    const tokenName = opts.transformName
      ? opts.transformName(token.name)
      : token.name;
    sd.color![tokenName] = {
      value: token.value,
      type: "color",
      comment: opts.includeMetadata ? token.semanticName : undefined,
      originalValue: token.value,
    };
  }

  // Typography
  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    const baseName = opts.transformName ? opts.transformName(name) : name;

    // Font family
    sd.typography![`${baseName}-family`] = {
      value: token.value.fontFamily,
      type: "fontFamily",
      comment: opts.includeMetadata ? token.semanticName : undefined,
    };

    // Font size
    sd.typography![`${baseName}-size`] = {
      value: token.value.fontSize,
      type: "fontSize",
    };

    // Font weight
    sd.typography![`${baseName}-weight`] = {
      value: String(token.value.fontWeight),
      type: "fontWeight",
    };

    // Line height
    sd.typography![`${baseName}-line-height`] = {
      value: token.value.lineHeight,
      type: "lineHeight",
    };
  }

  // Spacing
  for (const [name, token] of Object.entries(tokens.spacing.scale)) {
    const tokenName = opts.transformName ? opts.transformName(name) : name;
    sd.spacing![tokenName] = {
      value: token.value,
      type: "dimension",
    };
  }

  // Border radius
  for (const [name, token] of Object.entries(tokens.borders.radius)) {
    const tokenName = opts.transformName ? opts.transformName(name) : name;
    sd.borderRadius![tokenName] = {
      value: token.value,
      type: "borderRadius",
    };
  }

  // Box shadows
  for (const [name, token] of Object.entries(tokens.effects.shadows)) {
    const tokenName = opts.transformName ? opts.transformName(name) : name;
    sd.boxShadow![tokenName] = {
      value: effectToShadowString(token.value),
      type: "boxShadow",
    };
  }

  return sd;
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
