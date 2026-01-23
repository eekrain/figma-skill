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

// Compression types
export type {
  CompressionOptions,
  ComponentDefinition,
  SlotDefinition,
  CompressedInstance,
  LayoutGrid,
  CompressionStats,
} from "@/compression/types";

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
export {
  toToon,
  toToonLines,
  fromToon,
  type ToonOptions,
} from "@/transformers/toon";

// Compression (for advanced users)
export {
  compressComponents,
  expandDesign,
  analyzeCompressionPotential,
  createCompressionReport,
} from "@/compression/index";

// Tokens (Phase 1: Design Token Extraction)
export { extractTokens } from "@/tokens";
export type {
  DesignToken,
  ColorToken,
  TypographyToken,
  TypographyValue,
  SpacingToken,
  EffectToken,
  EffectValue,
  BorderRadiusToken,
  DesignTokens,
  TokenMetadata,
  TokenStats,
  TokenExtractionOptions,
} from "@/tokens";

// Analysis (Phase 2: Component Intelligence)
export { analyzeComponents } from "@/analysis";
export type {
  ComponentAnalysis,
  DesignSystemAnalysis,
  ComponentVariant,
  InferredProp,
  AtomicLevel,
  ComponentReadiness,
  CodeHints,
  ComponentRelationship,
  ComponentUsage,
  ComponentStyling,
  DesignPattern,
  AtomicHierarchy,
  ImplementationReadiness,
  AnalysisSummary,
  ComponentAnalysisOptions,
} from "@/analysis";

// Export (Phase 3: Multi-Format Token Export)
export { toTailwindV3, toStyleDictionary, syncToTailwindV3 } from "@/export";
export type {
  TailwindV3Config,
  TailwindV3Options,
  StyleDictionary,
  ExportOptions,
  TokenToClassMap,
  SyncStats,
  SyncToTailwindV3Options,
} from "@/export";

// Docs (Phase 4: Design System Documentation)
export { generateDesignSystemDoc } from "@/docs";
export type {
  DocFile,
  DocGenerationOptions,
  DocTemplates,
  OverviewData,
  ColorTokenData,
  ComponentDocData,
} from "@/docs";

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
