export { FigmaExtractor } from "@/client/index";

// Types - now consolidated in extractors/types.ts
export type {
  FigmaExtractorConfig,
  GetFileOptions,
  GetNodesOptions,
  GetImageUrlsOptions,
  DownloadImagesOptions,
  SimplifiedNode,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
  GlobalVars,
  SimplifiedDesign,
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  StreamProgress,
  StreamChunk,
  ImageUrlResult,
  DownloadedImageResult,
  NodeId,
  NodeIdValidationResult,
  OutputFormat,
  ImageFormat,
  ImageScale,
  PaginationOptions,
  PaginatedResponse,
} from "@/extractors/types";

// Re-export Figma API types
export type {
  GetFileResponse,
  GetFileNodesResponse,
  GetImagesResponse,
  Node,
  Component,
  ComponentSet,
  Style,
} from "@figma/rest-api-spec";

// Re-export error types from utils (as values, since they are classes)
export {
  FigmaApiError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  PayloadTooLargeError,
} from "@/utils/fetch-with-retry";

// Utilities (minimal exports for advanced users)
export { setLogLevel, getLogLevel } from "@/utils/logger";

export { FigmaCache } from "@/utils/cache";

export { RateLimiter } from "@/utils/rate-limiter";
