/**
 * Effects transformer - convert Figma effects to CSS properties
 * Matches mcp-reference/src/transformers/effects.ts
 */
import type {
  BlurEffect,
  DropShadowEffect,
  Effect,
  InnerShadowEffect,
  Node,
} from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common.js";

export interface SimplifiedEffects {
  shadows?: Array<{
    type: "drop-shadow" | "inner-shadow";
    color: string;
    offsetX: string;
    offsetY: string;
    blur: string;
    spread?: string;
  }>;
  blur?: string;
  layerBlur?: string;
}

type NodeWithEffects = Node & {
  effects?: Effect[];
};

/**
 * Build simplified effects from a node
 * Matches mcp-reference: buildSimplifiedEffects
 */
export function buildSimplifiedEffects(node: Node): SimplifiedEffects {
  const effects: SimplifiedEffects = {};

  const nodeWithEffects = node as NodeWithEffects;
  if (
    hasValue("effects", nodeWithEffects) &&
    Array.isArray(nodeWithEffects.effects)
  ) {
    const shadows = nodeWithEffects.effects
      .filter(
        (e): e is DropShadowEffect | InnerShadowEffect =>
          e.visible !== false &&
          (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
      )
      .map((e) => ({
        type:
          e.type === "DROP_SHADOW"
            ? ("drop-shadow" as const)
            : ("inner-shadow" as const),
        color: formatRGBAColor(e.color, e.color?.a ?? 1),
        offsetX: `${e.offset?.x ?? 0}px`,
        offsetY: `${e.offset?.y ?? 0}px`,
        blur: `${e.radius ?? 0}px`,
        spread:
          e.spread !== undefined ? `${e.spread}px` : undefined,
      }));

    if (shadows.length) effects.shadows = shadows;
  }

  // Layer blur
  const layerBlurEffect = nodeWithEffects.effects?.find(
    (e): e is BlurEffect =>
      e.type === "LAYER_BLUR" && e.visible !== false
  );
  if (layerBlurEffect && layerBlurEffect.radius > 0) {
    effects.layerBlur = `${layerBlurEffect.radius}px`;
  }

  // Background blur (different CSS property)
  const backgroundBlurEffect = nodeWithEffects.effects?.find(
    (e): e is BlurEffect =>
      e.type === "BACKGROUND_BLUR" && e.visible !== false
  );
  if (backgroundBlurEffect && backgroundBlurEffect.radius > 0) {
    effects.blur = `${backgroundBlurEffect.radius}px`;
  }

  return effects;
}

/**
 * Format Figma color to CSS rgba() format
 * Matches mcp-reference: formatRGBAColor
 */
export function formatRGBAColor(
  color: { r: number; g: number; b: number; a?: number },
  opacity?: number
): string {
  const a = opacity ?? color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}
