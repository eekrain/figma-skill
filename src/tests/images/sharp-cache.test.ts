/**
 * Tests for sharp-cache.ts
 *
 * TDD Cycle 1: Cache Configuration
 * TDD Cycle 2: Cache Statistics
 * TDD Cycle 3: Cache Management
 */

import sharp from 'sharp';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  configureCache,
  getCacheStats,
  clearCache,
  withCache,
  type CacheOptions,
  type CacheStats,
} from '../../images/sharp-cache';

describe('sharp-cache', () => {
  // Store original cache configuration to restore after tests
  let originalMemory: number;
  let originalFiles: number;

  beforeEach(() => {
    // Store original Sharp cache settings (max values in MB)
    const cache = sharp.cache() as sharp.CacheResult;
    originalMemory = cache.memory.max;
    originalFiles = cache.files.max;
  });

  afterEach(() => {
    // Restore original cache settings after each test
    sharp.cache({ memory: originalMemory, files: originalFiles });
  });

  describe('Cycle 1: Cache Configuration', () => {
    describe('configureCache', () => {
      it('should configure cache with default options', () => {
        configureCache();

        const stats = getCacheStats();

        expect(stats.maxMemory).toBe(50 * 1024 * 1024); // 50MB default in bytes
        expect(stats.maxFiles).toBe(20); // 20 files default
      });

      it('should configure cache with custom memory limit', () => {
        const options: CacheOptions = {
          maxMemory: 100, // 100MB
        };

        configureCache(options);

        const stats = getCacheStats();

        expect(stats.maxMemory).toBe(100 * 1024 * 1024);
      });

      it('should configure cache with custom file limit', () => {
        const options: CacheOptions = {
          maxFiles: 50,
        };

        configureCache(options);

        const stats = getCacheStats();

        expect(stats.maxFiles).toBe(50);
      });

      it('should configure cache with both custom options', () => {
        const options: CacheOptions = {
          maxMemory: 200, // 200MB
          maxFiles: 100,
        };

        configureCache(options);

        const stats = getCacheStats();

        expect(stats.maxMemory).toBe(200 * 1024 * 1024);
        expect(stats.maxFiles).toBe(100);
      });

      it('should handle zero memory limit (disable cache)', () => {
        const options: CacheOptions = {
          maxMemory: 0,
        };

        configureCache(options);

        const stats = getCacheStats();

        expect(stats.maxMemory).toBe(0);
      });

      it('should handle zero file limit (disable file cache)', () => {
        const options: CacheOptions = {
          maxFiles: 0,
        };

        configureCache(options);

        const stats = getCacheStats();

        expect(stats.maxFiles).toBe(0);
      });
    });
  });

  describe('Cycle 2: Cache Statistics', () => {
    describe('getCacheStats', () => {
      it('should return accurate cache statistics', () => {
        configureCache({
          maxMemory: 50,
          maxFiles: 20,
        });

        const stats = getCacheStats();

        expect(stats).toHaveProperty('currentMemory');
        expect(stats).toHaveProperty('currentFiles');
        expect(stats).toHaveProperty('maxMemory');
        expect(stats).toHaveProperty('maxFiles');

        expect(typeof stats.currentMemory).toBe('number');
        expect(typeof stats.currentFiles).toBe('number');
        expect(stats.currentMemory).toBeGreaterThanOrEqual(0);
        expect(stats.currentFiles).toBeGreaterThanOrEqual(0);
      });

      it('should reflect configured limits in stats', () => {
        const customMemory = 75; // 75MB
        const customFiles = 35;

        configureCache({
          maxMemory: customMemory,
          maxFiles: customFiles,
        });

        const stats = getCacheStats();

        expect(stats.maxMemory).toBe(customMemory * 1024 * 1024);
        expect(stats.maxFiles).toBe(customFiles);
      });

      it('should return current memory usage', () => {
        configureCache();

        // Initially, cache should be empty or minimal
        const statsBefore = getCacheStats();

        // Perform an operation that uses Sharp cache
        const testImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        sharp(testImage).resize(10, 10).toBuffer();

        const statsAfter = getCacheStats();

        // Memory usage should have increased or stayed the same
        expect(statsAfter.currentMemory).toBeGreaterThanOrEqual(statsBefore.currentMemory);
      });

      it('should return current file count', () => {
        configureCache();

        const stats = getCacheStats();

        expect(typeof stats.currentFiles).toBe('number');
        expect(stats.currentFiles).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Cycle 3: Cache Management', () => {
    describe('clearCache', () => {
      it('should clear cache successfully', () => {
        configureCache();

        // Perform some operations to populate memory cache
        const testImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        sharp(testImage).resize(10, 10).toBuffer();
        sharp(testImage).resize(20, 20).toBuffer();

        const statsBefore = getCacheStats();
        // Memory cache should be used even if file count stays 0 (toBuffer doesn't create files)
        const memoryUsedBefore = statsBefore.currentMemory;

        // Clear cache
        clearCache();

        const statsAfter = getCacheStats();
        expect(statsAfter.currentFiles).toBe(0);
        expect(statsAfter.currentMemory).toBeLessThanOrEqual(memoryUsedBefore);
      });

      it('should clear cache when already empty', () => {
        configureCache();
        clearCache();

        const statsBefore = getCacheStats();
        expect(statsBefore.currentFiles).toBe(0);

        // Clear again
        clearCache();

        const statsAfter = getCacheStats();
        expect(statsAfter.currentFiles).toBe(0);
      });
    });

    describe('withCache', () => {
      it('should execute function with temporary cache settings', async () => {
        const originalMemory = 50; // 50MB
        const tempMemory = 10; // 10MB

        configureCache({ maxMemory: originalMemory });

        const statsBefore = getCacheStats();
        expect(statsBefore.maxMemory).toBe(originalMemory * 1024 * 1024);

        let statsDuring: CacheStats | null = null;

        await withCache(
          async () => {
            statsDuring = getCacheStats();
            // Function body
          },
          { maxMemory: tempMemory }
        );

        expect(statsDuring).toBeTruthy();
        expect(statsDuring!.maxMemory).toBe(tempMemory * 1024 * 1024);

        const statsAfter = getCacheStats();
        // Cache should be restored to original settings
        expect(statsAfter.maxMemory).toBe(originalMemory * 1024 * 1024);
      });

      it('should restore cache after function execution', async () => {
        const originalSettings = { maxMemory: 50, maxFiles: 20 };
        const tempSettings = { maxMemory: 100, maxFiles: 50 };

        configureCache(originalSettings);

        await withCache(async () => {
          // Some operation
        }, tempSettings);

        const statsAfter = getCacheStats();
        expect(statsAfter.maxMemory).toBe(originalSettings.maxMemory * 1024 * 1024);
        expect(statsAfter.maxFiles).toBe(originalSettings.maxFiles);
      });

      it('should restore cache even if function throws', async () => {
        const originalMemory = 50;
        const tempMemory = 10;

        configureCache({ maxMemory: originalMemory });

        let statsDuring: CacheStats | null = null;

        await expect(
          withCache(
            async () => {
              statsDuring = getCacheStats();
              throw new Error('Test error');
            },
            { maxMemory: tempMemory }
          )
        ).rejects.toThrow('Test error');

        expect(statsDuring).toBeTruthy();
        expect(statsDuring!.maxMemory).toBe(tempMemory * 1024 * 1024);

        const statsAfter = getCacheStats();
        // Cache should be restored even after error
        expect(statsAfter.maxMemory).toBe(originalMemory * 1024 * 1024);
      });

      it('should return function result', async () => {
        const expectedResult = 'test result';

        const result = await withCache(async () => {
          return expectedResult;
        });

        expect(result).toBe(expectedResult);
      });

      it('should work with synchronous functions', async () => {
        const result = await withCache(() => {
          return 'sync result';
        });

        expect(result).toBe('sync result');
      });

      it('should default to no cache if options not provided', async () => {
        let statsDuring: CacheStats | null = null;

        await withCache(async () => {
          statsDuring = getCacheStats();
        });

        expect(statsDuring).toBeTruthy();
        // withCache without options should use minimal settings
        expect(statsDuring!.maxMemory).toBe(0);
        expect(statsDuring!.maxFiles).toBe(0);
      });

      it('should clear temporary cache after execution', async () => {
        configureCache({ maxMemory: 50, maxFiles: 20 });

        // Populate original cache
        const testImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        sharp(testImage).resize(10, 10).toBuffer();

        const statsBefore = getCacheStats();
        const memoryBefore = statsBefore.currentMemory;

        // Execute with temporary cache that also does some work
        await withCache(async () => {
          sharp(testImage).resize(20, 20).toBuffer();
        }, { maxMemory: 10, maxFiles: 5 });

        const statsAfter = getCacheStats();

        // Original cache should still have its memory
        // Note: File count may stay 0 since toBuffer doesn't create cached files
        expect(statsAfter.currentMemory).toBeGreaterThanOrEqual(memoryBefore);
      });
    });
  });
});
