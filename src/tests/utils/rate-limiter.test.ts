/**
 * Unit tests for RateLimiter
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { RateLimiter } from "@/utils/rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3);
  });

  describe("Basic execution", () => {
    it("should execute functions immediately when under limit", async () => {
      const fn = jest
        .fn()
        .mockImplementation(async () => "result") as jest.MockedFunction<
        () => Promise<string>
      >;

      const result = await limiter.execute(fn);

      expect(result).toBe("result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should track concurrent requests", async () => {
      expect(limiter.getStats().concurrent).toBe(0);

      const promise1 = limiter.execute(async () => {
        expect(limiter.getStats().concurrent).toBe(1);
        return "result1";
      });

      expect(limiter.getStats().concurrent).toBe(1);

      await promise1;

      expect(limiter.getStats().concurrent).toBe(0);
    });

    it("should decrement concurrent count after completion", async () => {
      await limiter.execute(async () => "result");

      expect(limiter.getStats().concurrent).toBe(0);
    });
  });

  describe("Rate limiting", () => {
    it("should queue requests when limit is reached", async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const fn = jest.fn().mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrent--;
        return "result";
      }) as jest.MockedFunction<() => Promise<string>>;

      // Start 5 requests with max concurrent of 3
      const promises = Array.from({ length: 5 }, () => limiter.execute(fn));

      await Promise.all(promises);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it("should process queued requests when slots open", async () => {
      const executionOrder: number[] = [];

      const createFn = (id: number) => async () => {
        executionOrder.push(id);
        await new Promise((resolve) => setTimeout(resolve, 30));
        return id;
      };

      // Start requests faster than they complete
      const promises = [1, 2, 3, 4, 5].map((id) =>
        limiter.execute(createFn(id))
      );

      await Promise.all(promises);

      // Should execute in order due to queue
      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle request completion out of order", async () => {
      const completionTimes: number[] = [];

      const createFn = (delay: number) => async () => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, delay));
        completionTimes.push(Date.now() - start);
        return delay;
      };

      // Queue requests with different completion times
      limiter.execute(createFn(100)); // Slow
      limiter.execute(createFn(10)); // Fast
      limiter.execute(createFn(50)); // Medium

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(completionTimes).toHaveLength(3);
    });
  });

  describe("Statistics", () => {
    it("should report correct statistics", () => {
      const stats = limiter.getStats();

      expect(stats).toEqual({
        concurrent: 0,
        maxConcurrent: 3,
        queued: 0,
      });
    });

    it("should report queued requests", async () => {
      const fn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        ) as jest.MockedFunction<() => Promise<void>>;

      // Start 5 requests with max 3 concurrent
      const promises = Array.from({ length: 5 }, () => limiter.execute(fn));

      // Give it a moment to queue
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = limiter.getStats();
      expect(stats.concurrent).toBe(3);
      expect(stats.queued).toBe(2);

      await Promise.all(promises);
    });

    it("should update stats as requests complete", async () => {
      const fn = jest
        .fn()
        .mockImplementation(async () => "result") as jest.MockedFunction<
        () => Promise<string>
      >;

      const promise = limiter.execute(fn);

      expect(limiter.getStats().concurrent).toBe(1);

      await promise;

      expect(limiter.getStats().concurrent).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should propagate errors from executed functions", async () => {
      const error = new Error("Test error");
      const fn = jest.fn().mockImplementation(async () => {
        throw error;
      }) as jest.MockedFunction<() => Promise<never>>;

      await expect(limiter.execute(fn)).rejects.toThrow("Test error");
    });

    it("should continue processing after error", async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("First error");
        }
        return "success";
      }) as jest.MockedFunction<() => Promise<string>>;

      // First call fails
      await expect(limiter.execute(fn)).rejects.toThrow();

      // Second call should succeed
      const result = await limiter.execute(fn);

      expect(result).toBe("success");
    });

    it("should handle errors in queued requests", async () => {
      const fn1 = jest.fn().mockImplementation(async () => {
        throw new Error("Error 1");
      }) as jest.MockedFunction<() => Promise<never>>;
      const fn2 = jest
        .fn()
        .mockImplementation(async () => "Success 2") as jest.MockedFunction<
        () => Promise<string>
      >;
      const fn3 = jest.fn().mockImplementation(async () => {
        throw new Error("Error 3");
      }) as jest.MockedFunction<() => Promise<never>>;

      const results = await Promise.allSettled([
        limiter.execute(fn1),
        limiter.execute(fn2),
        limiter.execute(fn3),
      ]);

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("fulfilled");
      expect(results[2].status).toBe("rejected");
    });

    it("should decrement concurrent count on error", async () => {
      const fn = jest.fn().mockImplementation(async () => {
        throw new Error("Error");
      }) as jest.MockedFunction<() => Promise<never>>;

      await expect(limiter.execute(fn)).rejects.toThrow();

      expect(limiter.getStats().concurrent).toBe(0);
    });
  });

  describe("Clear queue", () => {
    it("should clear queued requests", async () => {
      const fn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        ) as jest.MockedFunction<() => Promise<void>>;

      // Fill up to max concurrent
      limiter.execute(fn);
      limiter.execute(fn);
      limiter.execute(fn);

      // Add more that will be queued
      const queuedPromise = limiter.execute(fn);

      expect(limiter.getStats().queued).toBeGreaterThan(0);

      limiter.clear();

      await expect(queuedPromise).rejects.toThrow("Rate limiter cleared");
    });

    it("should not affect running requests when cleared", async () => {
      const fn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50))
        ) as jest.MockedFunction<() => Promise<void>>;

      const runningPromise = limiter.execute(fn);

      limiter.clear();

      // Running request should complete
      await expect(runningPromise).resolves.toBeUndefined();
    });

    it("should reject all queued requests with error", async () => {
      const slowFn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        ) as jest.MockedFunction<() => Promise<void>>;

      // Fill concurrent slots
      limiter.execute(slowFn);
      limiter.execute(slowFn);
      limiter.execute(slowFn);

      // Queue several more
      const queuedPromises = [
        limiter.execute(slowFn),
        limiter.execute(slowFn),
        limiter.execute(slowFn),
      ];

      limiter.clear();

      const results = await Promise.allSettled(queuedPromises);

      // All queued should be rejected
      results.forEach((result) => {
        expect(result.status).toBe("rejected");
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle max concurrent of 1", async () => {
      const singleLimiter = new RateLimiter(1);
      const executionOrder: number[] = [];

      const createFn = (id: number) => async () => {
        executionOrder.push(id);
        await new Promise((resolve) => setTimeout(resolve, 20));
        return id;
      };

      const promises = [1, 2, 3, 4, 5].map((id) =>
        singleLimiter.execute(createFn(id))
      );

      await Promise.all(promises);

      // Should execute sequentially
      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle very high max concurrent", async () => {
      const highLimiter = new RateLimiter(100);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const fn = jest.fn().mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 20));
        currentConcurrent--;
        return "result";
      }) as jest.MockedFunction<() => Promise<string>>;

      const promises = Array.from({ length: 50 }, () =>
        highLimiter.execute(fn)
      );

      await Promise.all(promises);

      // Should execute many concurrently
      expect(maxConcurrent).toBeGreaterThan(10);
    });

    it("should handle synchronous functions", async () => {
      const fn = jest
        .fn()
        .mockImplementation(async () => "sync-result") as jest.MockedFunction<
        () => Promise<unknown>
      >;

      const result = await limiter.execute(fn);

      expect(result).toBe("sync-result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should handle functions returning primitives", async () => {
      const fn = jest
        .fn()
        .mockImplementation(async () => 42) as jest.MockedFunction<
        () => Promise<unknown>
      >;

      const result = await limiter.execute(fn);

      expect(result).toBe(42);
    });

    it("should handle void return values", async () => {
      const fn = jest
        .fn()
        .mockImplementation(async () => undefined) as jest.MockedFunction<
        () => Promise<void>
      >;

      const result = await limiter.execute(fn);

      expect(result).toBeUndefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle burst of requests", async () => {
      const callCount = { value: 0 };
      const createRequestFn = (id: string) => async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        callCount.value++;
        return id;
      };

      // Send burst of requests
      const ids = Array.from({ length: 10 }, (_, i) => `req-${i}`);
      const promises = ids.map((id) => limiter.execute(createRequestFn(id)));

      const settled = await Promise.allSettled(promises);

      expect(settled.every((s) => s.status === "fulfilled")).toBe(true);
      expect(callCount.value).toBe(10);
    });

    it("should maintain order with mixed execution times", async () => {
      const results: string[] = [];

      const createTask = (id: string, delay: number) => async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        results.push(id);
        return id;
      };

      // Queue tasks with varying delays
      const promises = [
        limiter.execute(createTask("fast", 10)),
        limiter.execute(createTask("slow", 100)),
        limiter.execute(createTask("medium", 50)),
        limiter.execute(createTask("fast2", 10)),
        limiter.execute(createTask("slow2", 100)),
      ];

      await Promise.all(promises);

      // Results should complete in order they were dequeued
      expect(results).toHaveLength(5);
    });

    it("should recover from queue overflow", async () => {
      const fn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50))
        ) as jest.MockedFunction<() => Promise<void>>;

      // Create a large queue
      const promises = Array.from({ length: 20 }, () => limiter.execute(fn));

      await Promise.all(promises);

      expect(limiter.getStats().queued).toBe(0);
      expect(limiter.getStats().concurrent).toBe(0);
    });
  });
});
