/**
 * Fetch with exponential backoff and jitter
 */
/* eslint-disable no-undef */
import { debug, warn } from "./logger";

export interface FetchWithRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** AbortController for cancellation */
  signal?: AbortSignal;
}

/**
 * Custom error types for better error handling
 */
export class FigmaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

export class AuthenticationError extends FigmaApiError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends FigmaApiError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export class NetworkError extends FigmaApiError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Error thrown when the response payload is too large (413)
 * This triggers automatic fallback to paginated fetching
 */
export class PayloadTooLargeError extends FigmaApiError {
  constructor(message: string = "Response payload too large") {
    super(message, 413);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  retryCount: number,
  initialDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = Math.min(
    initialDelay * Math.pow(2, retryCount),
    maxDelay
  );
  // Add jitter: ±25% of the delay
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Create a timeout promise
 */
function createTimeoutPromise(
  timeoutMs: number,
  signal?: AbortSignal
): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new Error("Request aborted"));
    });
  });
}

/**
 * Fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<Response> {
  console.log(`[DEBUG] fetchWithRetry: Starting ${url}`);
  const startTime = Date.now();
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = 30000,
    signal,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      debug(`Fetching ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
      console.log(
        `[DEBUG] fetchWithRetry: Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`
      );

      const controller = new AbortController();

      // Combine external signal with timeout
      signal?.addEventListener("abort", () => controller.abort());

      const response = await Promise.race([
        fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        }),
        createTimeoutPromise(timeout, signal),
      ]);

      console.log(
        `[DEBUG] fetchWithRetry: Got response status ${response.status} in ${Date.now() - startTime}ms`
      );

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        // Cap retry delay at 60 seconds to avoid extremely long waits
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 60000)
          : calculateDelay(attempt, initialDelay, maxDelay);

        console.log(
          `[DEBUG] Rate limited! Retry-After: ${retryAfter}, delay: ${delay}ms`
        );

        warn(
          `Rate limited, retrying after ${delay}ms (Retry-After: ${retryAfter})`
        );

        if (attempt < maxRetries) {
          console.log(`[DEBUG] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(
          `Authentication failed: ${response.statusText}`
        );
      }

      // Handle payload too large errors (triggers paginated fallback)
      if (response.status === 413) {
        throw new PayloadTooLargeError(
          `Response payload too large for file request`
        );
      }

      // Handle internal server errors (often caused by timeout on large files)
      if (response.status === 500 || response.status === 503) {
        throw new FigmaApiError(
          `Server error ${response.status}: ${response.statusText} (file may be too large)`,
          response.status
        );
      }

      // Handle other errors
      if (!response.ok) {
        throw new FigmaApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry authentication errors
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Don't retry aborts
      if (
        error instanceof Error &&
        (error.message.includes("aborted") || error.name === "AbortError")
      ) {
        throw error;
      }

      // Log retry attempt
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, initialDelay, maxDelay);
        debug(`Request failed, retrying in ${delay}ms:`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new NetworkError(
    `Request failed after ${maxRetries + 1} attempts`,
    lastError
  );
}
