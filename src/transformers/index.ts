/**
 * Transformers module - convert Figma data to simplified formats
 *
 * Types only - for type checking, not for direct use
 * Functions are internal and used by extractors
 */

// Re-export types from individual transformers
export type { SimplifiedLayout } from "./layout";

export type { SimplifiedTextStyle } from "./text";

export type {
  SimplifiedFill,
  SimplifiedStroke,
  SimplifiedStrokes,
  SimplifiedImageFill,
  SimplifiedGradientFill,
  SimplifiedPatternFill,
  ColorValue,
  CSSRGBAColor,
  CSSHexColor,
} from "./style";

export type { SimplifiedEffects } from "./effects";

export type {
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
} from "./component";

// Keep only Toon format (public API feature)
export { toToon, toToonLines, fromToon } from "./toon";

// DO NOT export individual transformer functions
// They are internal - users use extractors instead
