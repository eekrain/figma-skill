/**
 * Transformers module - convert Figma data to simplified formats
 */

// Re-export types from individual transformers
export type { SimplifiedLayout } from "./layout";

export type { SimplifiedTextStyle } from "./text";

export type {
  SimplifiedFill,
  SimplifiedStroke,
  SimplifiedStrokes,
} from "./style";

export type { SimplifiedEffects } from "./effects";

export type {
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
} from "./component";

// Re-export functions from individual transformers
export { buildSimplifiedLayout } from "./layout";

export {
  isTextNode,
  hasTextStyle,
  extractNodeText,
  extractTextStyle,
} from "./text";

export { parsePaint, buildSimplifiedStrokes, formatRGBAColor } from "./style";

export { buildSimplifiedEffects } from "./effects";

export { simplifyComponents, simplifyComponentSets } from "./component";

// Toon format - token-efficient design representation
export { toToon, fromToon } from "./toon";
