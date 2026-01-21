/**
 * Rate limiter for managing concurrent requests
 */
import { debug } from "./logger";

interface PendingRequest {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Rate limiter using a queue to limit concurrent requests
 */
export class RateLimiter {
  private concurrent: number;
  private maxConcurrent: number;
  private queue: PendingRequest[];

  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.concurrent = 0;
    this.queue = [];
    debug(`Rate limiter initialized with max concurrent: ${maxConcurrent}`);
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    console.log(
      `[DEBUG] RateLimiter.execute: Starting (concurrent: ${this.concurrent}/${this.maxConcurrent}, queued: ${this.queue.length})`
    );

    // If we haven't hit the limit, execute immediately
    if (this.concurrent < this.maxConcurrent) {
      this.concurrent++;
      debug(
        `Executing request (concurrent: ${this.concurrent}/${this.maxConcurrent})`
      );

      try {
        const result = await fn();
        console.log(
          `[DEBUG] RateLimiter.execute: Request completed in ${Date.now() - startTime}ms`
        );
        return result;
      } finally {
        this.concurrent--;
        this.processQueue();
      }
    }

    // Otherwise, add to queue
    console.log(
      `[DEBUG] RateLimiter.execute: Adding to queue (position: ${this.queue.length + 1})`
    );
    return new Promise((resolve, reject) => {
      debug(
        `Queueing request (queue size: ${this.queue.length}, concurrent: ${this.concurrent}/${this.maxConcurrent})`
      );

      this.queue.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Process queue in case slots opened up
      this.processQueue();
    });
  }

  /**
   * Process the next item in the queue
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    if (this.concurrent < this.maxConcurrent) {
      const item = this.queue.shift();
      if (item) {
        this.concurrent++;
        debug(
          `Processing queued request (queue: ${this.queue.length}, concurrent: ${this.concurrent}/${this.maxConcurrent})`
        );

        item
          .fn()
          .then((result) => {
            item.resolve(result);
          })
          .catch((error) => {
            item.reject(error);
          })
          .finally(() => {
            this.concurrent--;
            this.processQueue();
          });
      }
    }
  }

  /**
   * Get current queue statistics
   */
  getStats(): { concurrent: number; maxConcurrent: number; queued: number } {
    return {
      concurrent: this.concurrent,
      maxConcurrent: this.maxConcurrent,
      queued: this.queue.length,
    };
  }

  /**
   * Clear the queue (rejects all pending requests)
   */
  clear(): void {
    const error = new Error("Rate limiter cleared");
    for (const item of this.queue) {
      item.reject(error);
    }
    this.queue = [];
    debug("Rate limiter queue cleared");
  }
}
