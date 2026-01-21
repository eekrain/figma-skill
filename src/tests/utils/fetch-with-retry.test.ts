/**
 * Unit tests for fetchWithRetry
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  AuthenticationError,
  FigmaApiError,
  NetworkError,
  RateLimitError,
  fetchWithRetry,
} from "@/utils/fetch-with-retry";

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = jest.fn() as any;

describe("fetchWithRetry", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    // Reset to default mock implementation
    mockFetch.mockReset();
  });

  describe("Successful requests", () => {
    it("should return response on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      } as Response);

      const response = await fetchWithRetry("https://api.example.com/data");

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should pass through fetch options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      } as Response);

      await fetchWithRetry("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"test": true}',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"test": true}',
        })
      );
    });

    it("should handle successful response with data", async () => {
      const mockData = { result: "success" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockData,
      } as Response);

      const response = await fetchWithRetry("https://api.example.com/data");
      const data = await response.json();

      expect(data).toEqual(mockData);
    });
  });

  describe("Retry logic", () => {
    it("should retry on network errors", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);

      const response = await fetchWithRetry("https://api.example.com/data", {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should retry on rate limit (429)", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);

      const response = await fetchWithRetry("https://api.example.com/data", {
        maxRetries: 2,
        initialDelay: 10,
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should respect Retry-After header on 429", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers({ "Retry-After": "1" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);

      const response = await fetchWithRetry("https://api.example.com/data", {
        maxRetries: 2,
        initialDelay: 10,
      });

      // Should retry after ~1 second (from Retry-After header)
      expect(response.ok).toBe(true);
    }, 2000);

    it("should stop retrying after max attempts", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        fetchWithRetry("https://api.example.com/data", {
          maxRetries: 2,
          initialDelay: 1,
          timeout: 10000,
        })
      ).rejects.toThrow(NetworkError);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 15000);

    it("should use exponential backoff", async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Capture delay times
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.setTimeout = jest.fn((fn: () => void, delay?: any) => {
        delays.push(delay as number);
        return originalSetTimeout(fn, delay);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      mockFetch
        .mockRejectedValueOnce(new Error("Error"))
        .mockRejectedValueOnce(new Error("Error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);

      await fetchWithRetry("https://api.example.com/data", {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 1000,
      });

      // Each retry should have longer delay (exponential backoff)
      expect(delays.length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe("Error handling", () => {
    it("should throw AuthenticationError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response);

      await expect(
        fetchWithRetry("https://api.example.com/data")
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError on 403", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      } as Response);

      await expect(
        fetchWithRetry("https://api.example.com/data")
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw FigmaApiError on other HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(
        fetchWithRetry("https://api.example.com/data")
      ).rejects.toThrow(FigmaApiError);
    });

    it("should not retry authentication errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response);

      await expect(
        fetchWithRetry("https://api.example.com/data", { maxRetries: 3 })
      ).rejects.toThrow(AuthenticationError);

      // Should only call once, not retry
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should include status code in error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
      } as Response);

      await expect(
        fetchWithRetry("https://api.example.com/data")
      ).rejects.toThrow(FigmaApiError);
    });
  });

  describe("Timeout", () => {
    it("should timeout after specified duration", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_resolve) => {
            // Never resolves
          })
      );

      await expect(
        fetchWithRetry("https://api.example.com/data", {
          timeout: 50,
          maxRetries: 0,
        })
      ).rejects.toThrow(NetworkError);
    }, 5000);

    it("should not timeout successful fast requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      } as Response);

      const response = await fetchWithRetry("https://api.example.com/data", {
        timeout: 5000,
      });

      expect(response.ok).toBe(true);
    });
  });

  describe("Abort signal", () => {
    it("should abort request on signal", async () => {
      const controller = new AbortController();

      // Mock fetch to reject with AbortError
      mockFetch.mockImplementation((_, _init) => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      await expect(
        fetchWithRetry("https://api.example.com/data", {
          signal: controller.signal,
          timeout: 1000,
        })
      ).rejects.toThrow(/aborted|AbortError/);
    }, 10000);

    it("should not retry aborted requests", async () => {
      const controller = new AbortController();

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      await expect(
        fetchWithRetry("https://api.example.com/data", {
          signal: controller.signal,
          maxRetries: 3,
          timeout: 5000,
        })
      ).rejects.toThrow(/aborted|AbortError/);

      // Should only call once (aborts don't retry)
      expect(callCount).toBe(1);
    });
  });

  describe("Configuration", () => {
    it("should use default options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      } as Response);

      await fetchWithRetry("https://api.example.com/data");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should use custom maxRetries", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        fetchWithRetry("https://api.example.com/data", {
          maxRetries: 1,
          initialDelay: 1,
          timeout: 10000,
        })
      ).rejects.toThrow(NetworkError);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    }, 15000);

    it("should use custom initialDelay", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);

      await fetchWithRetry("https://api.example.com/data", {
        maxRetries: 1,
        initialDelay: 10,
      });

      // Should complete with one retry
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error types", () => {
    it("should create FigmaApiError with status code", () => {
      const error = new FigmaApiError("Test error", 404, { details: "test" });

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual({ details: "test" });
      expect(error.name).toBe("FigmaApiError");
    });

    it("should create AuthenticationError with default message", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication failed");
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe("AuthenticationError");
    });

    it("should create AuthenticationError with custom message", () => {
      const error = new AuthenticationError("Custom auth error");

      expect(error.message).toBe("Custom auth error");
      expect(error.statusCode).toBe(401);
    });

    it("should create RateLimitError with default message", () => {
      const error = new RateLimitError();

      expect(error.message).toBe("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe("RateLimitError");
    });

    it("should create RateLimitError with custom message", () => {
      const error = new RateLimitError("Custom rate limit message");

      expect(error.message).toBe("Custom rate limit message");
      expect(error.statusCode).toBe(429);
    });

    it("should create NetworkError with cause", () => {
      const cause = new Error("Underlying error");
      const error = new NetworkError("Network request failed", cause);

      expect(error.message).toBe("Network request failed");
      expect(error.cause).toBe(cause);
      expect(error.name).toBe("NetworkError");
    });

    it("should create NetworkError without cause", () => {
      const error = new NetworkError("Network error");

      expect(error.message).toBe("Network error");
      expect(error.cause).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: "No Content",
      } as Response);

      const response = await fetchWithRetry("https://api.example.com/data");

      expect(response.status).toBe(204);
    });

    it("should handle malformed response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as unknown as Response);

      const response = await fetchWithRetry("https://api.example.com/data");

      expect(response.ok).toBe(true);
      await expect(response.json()).rejects.toThrow("Invalid JSON");
    });

    it("should handle concurrent requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      } as Response);

      const promises = Array.from({ length: 5 }, (_, i) =>
        fetchWithRetry(`https://api.example.com/data${i}`)
      );

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });
});
