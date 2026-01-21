/**
 * Extractors module - flexible data extraction from Figma nodes
 */

// Re-export from @figma/rest-api-spec
export type { Node } from "@figma/rest-api-spec";

// Re-export types
export type { ExtractorFn, TraversalContext, TraversalOptions } from "./types";

// Re-export node walker
export { extractFromDesign } from "./node-walker";

// Re-export built-in extractors
export {
  layoutExtractor,
  textExtractor,
  visualsExtractor,
  componentExtractor,
  allExtractors,
  layoutAndText,
  contentOnly,
  visualsOnly,
  layoutOnly,
  collapseSvgContainers,
  SVG_ELIGIBLE_TYPES,
} from "./built-in";
