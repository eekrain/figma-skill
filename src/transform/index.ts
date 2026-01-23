/**
 * Transform module - Standalone design data transformations
 *
 * Per API Redesign plan: Provides simple function exports for
 * transforming Figma design data to various formats.
 *
 * @module transform
 */

export { toToon, toToonLines, type ToonTransformOptions } from "./toToon.js";

// Re-export from legacy transformers for backwards compatibility
export {
  toToon as toToonCompat,
  fromToon,
  fromToonLines,
} from "../transformers/toon.js";

// Export other transformers
export {
  extractTextContent,
  toTextTree,
  type TextNode,
  type TextTree,
} from "../transformers/text.js";

export {
  extractEffects,
  type EffectStyle,
  type ExtractedEffects,
} from "../transformers/effects.js";

export {
  extractLayoutConstraints,
  extractLayoutProperties,
  type LayoutConstraints,
  type LayoutProperties,
} from "../transformers/layout.js";

export {
  extractComponentProperties,
  extractVariantProperties,
  type ComponentProperties,
  type VariantProperty,
} from "../transformers/component.js";

export {
  extractStyleProperties,
  type StyleProperties,
} from "../transformers/style.js";
