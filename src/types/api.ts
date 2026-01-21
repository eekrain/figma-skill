/**
 * Figma API wrapper types and error types
 */
import type {
  GetFileNodesResponse,
  GetFileResponse,
} from "@figma/rest-api-spec";

// Re-export GetImagesResponse for external use
export type { GetImagesResponse } from "@figma/rest-api-spec";

/**
 * Supported output formats for design data
 */
export type OutputFormat = "json" | "toon";

/**
 * Image format options
 */
export type ImageFormat = "png" | "jpg" | "svg" | "pdf";

/**
 * Image scale options (0.1 to 4, typically 1, 2, or 3)
 */
export type ImageScale = 0.1 | 0.5 | 1 | 2 | 3 | 4;

/**
 * Figma API file response (union of single file and file nodes responses)
 */
export type FigmaFileResponse = GetFileResponse | GetFileNodesResponse;

/**
 * Image export options
 */
export interface ImageExportOptions {
  /** Image format */
  format?: ImageFormat;
  /** Export scale (1 = 1x, 2 = 2x, etc.) */
  scale?: ImageScale;
  /** Whether to use SVG's ID attribute for filename */
  svgIdAttribute?: boolean;
  /** Output directory for downloaded images */
  outputDir?: string;
  /** Maximum parallel downloads (default: 5, max: 10) */
  parallel?: number;
}

/**
 * Pagination options for list endpoints
 */
export interface PaginationOptions {
  /** Number of items per page (default: 30, max: 200) */
  pageSize?: number;
  /** Continue from cursor */
  cursor?: string;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  /** Result items */
  data: T[];
  /** Cursor for next page */
  nextCursor: string | null;
  /** Whether more pages exist */
  hasMore: boolean;
}

/**
 * Custom error types for better error handling
 */

/**
 * Authentication error - invalid or missing token
 */
export class AuthenticationError extends Error {
  constructor(
    message: string = "Authentication failed: Invalid or missing Figma API token"
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends Error {
  constructor(
    message: string = "Rate limit exceeded: Too many requests to Figma API",
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Network error - request failed
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
