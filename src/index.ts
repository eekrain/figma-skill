export { FigmaExtractor } from "@/client/index";

// Types
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
  StreamProgress,
  StreamChunk,
  ImageUrlResult,
  DownloadedImageResult,
} from "@/types/index";

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

// Utilities (for advanced users)
export {
  setLogLevel,
  getLogLevel,
  debug,
  info,
  warn,
  error,
} from "@/utils/logger";

export {
  FigmaApiError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
} from "@/utils/fetch-with-retry";

export { FigmaCache } from "@/utils/cache";

export { RateLimiter } from "@/utils/rate-limiter";

export { requireEnv } from "@/utils/dotenv";

export type { EnvVars } from "@/utils/dotenv";

export {
  EnvParseError,
  EnvFileNotFoundError,
  EnvReadError,
} from "@/utils/dotenv";
