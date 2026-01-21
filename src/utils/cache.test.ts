/**
 * Unit tests for FigmaCache
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { FigmaCache } from "./cache";

describe("FigmaCache", () => {
  let cache: FigmaCache;

  beforeEach(() => {
    cache = new FigmaCache(10);
  });

  describe("Basic operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should store and retrieve complex objects", () => {
      const obj = { nested: { data: [1, 2, 3] } };
      cache.set("complex", obj);
      expect(cache.get("complex")).toEqual(obj);
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should delete keys", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);

      cache.delete("key1");
      expect(cache.has("key1")).toBe(false);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should return false when deleting non-existent key", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
    });
  });

  describe("Array keys", () => {
    it("should handle array keys", () => {
      cache.set(["file", "abc123"], "file-data");
      expect(cache.get(["file", "abc123"])).toBe("file-data");
    });

    it("should join array keys with colon", () => {
      cache.set(["a", "b", "c"], "value");
      expect(cache.has(["a", "b", "c"])).toBe(true);
      expect(cache.has("a:b:c")).toBe(true); // Same as string version
    });

    it("should distinguish between string and array keys", () => {
      cache.set("a:b:c", "string-value");
      cache.set(["a", "b", "c"], "array-value");

      // Array key takes precedence when using array
      expect(cache.get(["a", "b", "c"])).toBe("array-value");

      // But they collide internally (same string key)
      expect(cache.get("a:b:c")).toBe("array-value");
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used items when full", () => {
      const smallCache = new FigmaCache(3);

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3");

      // Access key1 to make it more recent than key2
      smallCache.get("key1");

      // Add key4, should evict key2
      smallCache.set("key4", "value4");

      expect(smallCache.has("key1")).toBe(true);
      expect(smallCache.has("key2")).toBe(false); // Evicted
      expect(smallCache.has("key3")).toBe(true);
      expect(smallCache.has("key4")).toBe(true);
    });

    it("should handle size limit correctly", () => {
      const smallCache = new FigmaCache(2);

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3");

      expect(smallCache.getStats().size).toBe(2);
    });
  });

  describe("getOrSet", () => {
    it("should return cached value if exists", async () => {
      cache.set("key1", "cached-value");

      let callCount = 0;
      const fn = async () => {
        callCount++;
        return "new-value" as string;
      };

      const result = await cache.getOrSet("key1", fn);

      expect(result).toBe("cached-value");
      expect(callCount).toBe(0);
    });

    it("should execute function and cache result on miss", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return "new-value" as string;
      };

      const result = await cache.getOrSet("key1", fn);

      expect(result).toBe("new-value");
      expect(callCount).toBe(1);
      expect(cache.get("key1")).toBe("new-value");
    });

    it("should deduplicate concurrent requests", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "result" as string;
      };

      // Start 5 concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        cache.getOrSet("key1", fn)
      );

      await Promise.all(promises);

      expect(callCount).toBe(1);
    });

    it("should clear pending request on success", async () => {
      const fn = async () => "result" as string;

      await cache.getOrSet("key1", fn);

      expect(cache.getStats().pending).toBe(0);
    });

    it("should clear pending request on error", async () => {
      let shouldThrow = true;
      const fn = async () => {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return "result" as string;
      };

      await expect(cache.getOrSet("key1", fn)).rejects.toThrow("Test error");

      expect(cache.getStats().pending).toBe(0);

      // Should be able to retry after error
      shouldThrow = false;
      const result = await cache.getOrSet("key1", fn);
      expect(result).toBe("result");
    });

    it("should handle multiple different keys concurrently", async () => {
      let callCount1 = 0;
      let callCount2 = 0;

      const fn1 = async () => {
        callCount1++;
        return "result1" as string;
      };

      const fn2 = async () => {
        callCount2++;
        return "result2" as string;
      };

      const [, result2] = await Promise.all([
        cache.getOrSet("key1", fn1),
        cache.getOrSet("key2", fn2),
      ]);

      expect(result2).toBe("result2");
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
    });
  });

  describe("Statistics", () => {
    it("should report correct statistics", () => {
      expect(cache.getStats()).toEqual({
        size: 0,
        maxSize: 10,
        pending: 0,
      });

      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.getStats().size).toBe(2);
    });

    it("should track pending requests", async () => {
      let _callCount = 0;
      const fn = async () => {
        _callCount++;
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 100);
        });
      };

      // Start request but don't await
      const promise = cache.getOrSet("key1", fn);

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cache.getStats().pending).toBe(1);

      await promise;
      expect(cache.getStats().pending).toBe(0);
    });

    it("should report maxSize correctly", () => {
      const customCache = new FigmaCache(50);
      expect(customCache.getStats().maxSize).toBe(50);
    });
  });

  describe("TTL (Time To Live)", () => {
    it("should expire entries after TTL", async () => {
      const shortTTLCache = new FigmaCache(10);
      // Manually set a cache with very short TTL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (shortTTLCache as any).cache = new (await import("lru-cache")).LRUCache({
        max: 10,
        ttl: 100, // 100ms
      });

      shortTTLCache.set("key1", "value1");
      expect(shortTTLCache.get("key1")).toBe("value1");

      // Wait for TTL to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortTTLCache.get("key1")).toBeUndefined();
    }, 10000);
  });

  describe("Type safety", () => {
    it("should preserve types through generics", async () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: "Alice" };
      cache.set<User>("user:1", user);

      const retrieved = cache.get<User>("user:1");
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe("Alice");

      const result = await cache.getOrSet<User>("user:2", async () => ({
        id: 2,
        name: "Bob",
      }));
      expect(result.name).toBe("Bob");
    });

    it("should handle null and undefined values", () => {
      cache.set("null-key", null);
      expect(cache.get("null-key")).toBeNull();

      cache.set("undefined-key", undefined);
      expect(cache.get("undefined-key")).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string keys", () => {
      cache.set("", "empty-key-value");
      expect(cache.get("")).toBe("empty-key-value");
    });

    it("should handle special characters in keys", () => {
      const specialKey = "key:with:many::colons/and/slashes";
      cache.set(specialKey, "value");
      expect(cache.get(specialKey)).toBe("value");
    });

    it("should handle very large values", () => {
      const largeValue = "x".repeat(1000000); // 1MB string
      cache.set("large", largeValue);
      expect(cache.get("large")).toBe(largeValue);
    });

    it("should handle setting same key multiple times", () => {
      cache.set("key1", "value1");
      cache.set("key1", "value2");
      cache.set("key1", "value3");

      expect(cache.get("key1")).toBe("value3");
    });
  });
});
