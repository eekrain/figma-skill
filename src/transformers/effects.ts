/**
 * Effects transformer - convert Figma effects to CSS properties
 */
import type {
  BlurEffect,
  DropShadowEffect,
  Effect,
  InnerShadowEffect,
  Node,
} from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

export type SimplifiedEffects = {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  textShadow?: string;
};

/**
 * Build simplified effects from a node
 */
export function buildSimplifiedEffects(n: Node): SimplifiedEffects {
  if (!hasValue("effects", n)) {
    return {};
  }

  const effects = (n.effects as Effect[]).filter((e) => e.visible !== false);

  // Handle drop and inner shadows (both go into CSS box-shadow)
  const dropShadows = effects
    .filter((e): e is DropShadowEffect => e.type === "DROP_SHADOW")
    .map(simplifyDropShadow);

  const innerShadows = effects
    .filter((e): e is InnerShadowEffect => e.type === "INNER_SHADOW")
    .map(simplifyInnerShadow);

  const boxShadow = [...dropShadows, ...innerShadows].join(", ");

  // Handle blur effects - separate by CSS property
  // Layer blurs use the CSS 'filter' property
  const filterBlurValues = effects
    .filter((e): e is BlurEffect => e.type === "LAYER_BLUR")
    .map(simplifyBlur)
    .join(" ");

  // Background blurs use the CSS 'backdrop-filter' property
  const backdropFilterValues = effects
    .filter((e): e is BlurEffect => e.type === "BACKGROUND_BLUR")
    .map(simplifyBlur)
    .join(" ");

  const result: SimplifiedEffects = {};

  if (boxShadow) {
    if (n.type === "TEXT") {
      result.textShadow = boxShadow;
    } else {
      result.boxShadow = boxShadow;
    }
  }

  if (filterBlurValues) {
    result.filter = filterBlurValues;
  }

  if (backdropFilterValues) {
    result.backdropFilter = backdropFilterValues;
  }

  return result;
}

function simplifyDropShadow(effect: DropShadowEffect): string {
  const color = formatRGBAColor(effect.color);
  return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread ?? 0}px ${color}`;
}

function simplifyInnerShadow(effect: InnerShadowEffect): string {
  const color = formatRGBAColor(effect.color);
  return `inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread ?? 0}px ${color}`;
}

function simplifyBlur(effect: BlurEffect): string {
  return `blur(${effect.radius}px)`;
}

/**
 * Format RGBA color to CSS string
 */
function formatRGBAColor(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const { r, g, b, a } = color;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
