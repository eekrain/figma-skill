// Main client
export { FigmaExtractor } from "@/client/index";

// Essential types for users
export type {
  FigmaExtractorConfig,
  GetFileOptions,
  GetNodesOptions,
  GetImageUrlsOptions,
  DownloadImagesOptions,
  SimplifiedDesign,
  StreamProgress,
  ImageUrlResult,
  DownloadedImageResult,
  NodeId,
} from "@/extractors/types";

// Re-export Figma API types users commonly need
export type {
  Node,
  Component,
  ComponentSet,
  GetFileResponse,
  GetImagesResponse,
} from "@figma/rest-api-spec";

// Extractors (for custom extraction)
export {
  extractFromDesign,
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
} from "@/extractors/index";

// Toon format (unique advantage - keep!)
export { toToon, toToonLines, fromToon } from "@/transformers/toon";

// Logger (minimal - users control their own logging)
export { setLogLevel, getLogLevel } from "@/utils/logger";

// Error handling (base class only)
export { FigmaApiError } from "@/utils/fetch-with-retry";

// Advanced utilities (for power users)
export { FigmaCache } from "@/utils/cache";
export { RateLimiter } from "@/utils/rate-limiter";

// NO individual transformer functions
// NO internal utility functions
// NO error subclass exports (users catch FigmaApiError)
// NO dotenv-related exports
