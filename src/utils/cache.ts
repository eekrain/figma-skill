/**
 * In-memory LRU cache for request deduplication
 */
import { LRUCache } from "lru-cache";

import { debug } from "./logger";

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export type CacheKey = string | string[];

/**
 * Convert cache key to string
 */
function keyToString(key: CacheKey): string {
  return Array.isArray(key) ? key.join(":") : key;
}

/**
 * In-memory LRU cache implementation
 */
export class FigmaCache {
  private cache: LRUCache<string, CacheEntry<unknown>>;
  private pendingRequests: Map<string, Promise<unknown>>;

  constructor(maxSize = 100) {
    this.cache = new LRUCache({
      max: maxSize,
      ttl: 1000 * 60 * 5, // 5 minutes
      allowStale: false,
    });
    this.pendingRequests = new Map();
    debug(`Cache initialized with max size: ${maxSize}`);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: CacheKey): T | undefined {
    const keyStr = keyToString(key);
    const entry = this.cache.get(keyStr);

    if (entry) {
      debug(`Cache hit: ${keyStr}`);
      return entry.value as T;
    }

    debug(`Cache miss: ${keyStr}`);
    return undefined;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: CacheKey, value: T): void {
    const keyStr = keyToString(key);
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
    };
    this.cache.set(keyStr, entry);
    debug(`Cache set: ${keyStr}`);
  }

  /**
   * Check if key exists in cache
   */
  has(key: CacheKey): boolean {
    const keyStr = keyToString(key);
    return this.cache.has(keyStr);
  }

  /**
   * Delete a key from cache
   */
  delete(key: CacheKey): boolean {
    const keyStr = keyToString(key);
    return this.cache.delete(keyStr);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    debug("Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; pending: number } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      pending: this.pendingRequests.size,
    };
  }

  /**
   * Get or execute a promise, caching the result
   * This prevents duplicate in-flight requests
   */
  async getOrSet<T>(key: CacheKey, fn: () => Promise<T>): Promise<T> {
    const keyStr = keyToString(key);

    // Check if value is already cached
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if request is in flight
    const pending = this.pendingRequests.get(keyStr);
    if (pending) {
      debug(`Waiting for pending request: ${keyStr}`);
      return pending as Promise<T>;
    }

    // Execute the function
    const promise = fn()
      .then((result) => {
        this.set(key, result);
        this.pendingRequests.delete(keyStr);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(keyStr);
        throw error;
      });

    this.pendingRequests.set(keyStr, promise);
    return promise;
  }
}
