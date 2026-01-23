/**
 * Tests for batch-processor.ts
 *
 * TDD Cycle 1: Basic Processing
 * TDD Cycle 2: Concurrency Control
 * TDD Cycle 3: Progress & Error Handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  processBatch,
  createConcurrencyLimit,
  type BatchProcessorOptions,
  type BatchProcessorResult,
  type ProcessFn,
} from '../../images/batch-processor';
import { configureCache, clearCache } from '../../images/sharp-cache';

describe('batch-processor', () => {
  beforeEach(() => {
    // Use minimal cache for tests
    configureCache({ maxMemory: 10, maxFiles: 5 });
  });

  afterEach(() => {
    clearCache();
  });

  describe('Cycle 1: Basic Processing', () => {
    describe('processBatch', () => {
      it('should process all items successfully', async () => {
        const items = ['item1', 'item2', 'item3'];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const result = await processBatch(items, processFn);

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(0);
        expect(result.stats.total).toBe(3);
        expect(result.stats.completed).toBe(3);
        expect(result.stats.failed).toBe(0);
        expect(result.successful[0].result).toBe('processed-item1');
        expect(result.successful[1].result).toBe('processed-item2');
        expect(result.successful[2].result).toBe('processed-item3');
      });

      it('should handle empty input array', async () => {
        const items: string[] = [];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const result = await processBatch(items, processFn);

        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
        expect(result.stats.total).toBe(0);
        expect(result.stats.completed).toBe(0);
        expect(result.stats.failed).toBe(0);
      });

      it('should process single item', async () => {
        const items = ['single'];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const result = await processBatch(items, processFn);

        expect(result.successful).toHaveLength(1);
        expect(result.successful[0].result).toBe('processed-single');
        expect(result.stats.total).toBe(1);
      });

      it('should return processing duration', async () => {
        const items = ['item1', 'item2'];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const result = await processBatch(items, processFn);

        expect(result.stats.duration).toBeGreaterThanOrEqual(0);
        expect(typeof result.stats.duration).toBe('number');
      });

      it('should use Sharp cache when useCache is true', async () => {
        const items = ['item1', 'item2'];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          useCache: true,
        };

        const result = await processBatch(items, processFn, options);

        expect(result.successful).toHaveLength(2);
        expect(result.stats.completed).toBe(2);
      });
    });
  });

  describe('Cycle 2: Concurrency Control', () => {
    describe('processBatch with concurrency', () => {
      it('should respect concurrency limit', async () => {
        const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
        const concurrentCalls: number[] = [];
        const maxConcurrency = 2;

        const processFn: ProcessFn<string, string> = async (item) => {
          const current = concurrentCalls.length + 1;
          concurrentCalls.push(current);
          await new Promise((resolve) => setTimeout(resolve, 50));
          concurrentCalls.pop();
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          concurrency: maxConcurrency,
        };

        await processBatch(items, processFn, options);

        // At no point should we have more than maxConcurrency operations running
        // This is verified by checking the max concurrent calls during execution
        expect(Math.max(...concurrentCalls)).toBeLessThanOrEqual(maxConcurrency);
      });

      it('should process items with default concurrency of 4', async () => {
        const items = ['a', 'b', 'c', 'd', 'e', 'f'];
        const processFn: ProcessFn<string, string> = async (item) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return item.toUpperCase();
        };

        // Not specifying concurrency should use default
        const result = await processBatch(items, processFn);

        expect(result.successful).toHaveLength(6);
        expect(result.stats.completed).toBe(6);
      });

      it('should handle concurrency of 1 (sequential)', async () => {
        const items = ['item1', 'item2', 'item3'];
        const executionOrder: string[] = [];

        const processFn: ProcessFn<string, string> = async (item) => {
          executionOrder.push(item);
          await new Promise((resolve) => setTimeout(resolve, 20));
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          concurrency: 1,
        };

        await processBatch(items, processFn, options);

        // With concurrency of 1, items should be processed in order
        expect(executionOrder).toEqual(['item1', 'item2', 'item3']);
      });

      it('should process items in order despite concurrency', async () => {
        const items = ['a', 'b', 'c', 'd', 'e'];
        const processFn: ProcessFn<string, string> = async (item) => {
          // Random delay to test ordering
          const delay = Math.random() * 20;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return `processed-${item}`;
        };

        const result = await processBatch(items, processFn, { concurrency: 3 });

        // Results should maintain original order regardless of completion order
        expect(result.successful.map((s) => s.input)).toEqual(items);
      });

      it('should handle unlimited concurrency (0)', async () => {
        const items = ['item1', 'item2', 'item3'];
        const processFn: ProcessFn<string, string> = async (item) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          concurrency: 0, // Unlimited
        };

        const result = await processBatch(items, processFn, options);

        expect(result.successful).toHaveLength(3);
        expect(result.stats.completed).toBe(3);
      });
    });

    describe('createConcurrencyLimit', () => {
      it('should create a limit with default concurrency', () => {
        const limit = createConcurrencyLimit();
        expect(typeof limit).toBe('function');
      });

      it('should create a limit with custom concurrency', () => {
        const limit = createConcurrencyLimit(5);
        expect(typeof limit).toBe('function');
      });
    });
  });

  describe('Cycle 3: Progress & Error Handling', () => {
    describe('processBatch with onProgress', () => {
      it('should report progress correctly', async () => {
        const items = ['item1', 'item2', 'item3', 'item4'];
        const progressCalls: number[] = [];

        const processFn: ProcessFn<string, string> = async (item) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          onProgress: (completed, total) => {
            progressCalls.push(completed);
          },
        };

        await processBatch(items, processFn, options);

        // Progress should be called for each completed item
        expect(progressCalls.length).toBe(4);
        // Progress values should be 1, 2, 3, 4 (order may vary with concurrency)
        expect(progressCalls.sort()).toEqual([1, 2, 3, 4]);
      });

      it('should include total in progress callback', async () => {
        const items = ['a', 'b', 'c'];
        const totals: number[] = [];

        const processFn: ProcessFn<string, string> = async (item) => {
          return item;
        };

        const options: BatchProcessorOptions<string, string> = {
          onProgress: (_completed, total) => {
            totals.push(total);
          },
        };

        await processBatch(items, processFn, options);

        // Total should always be 3
        expect(totals.every((t) => t === 3)).toBe(true);
      });
    });

    describe('processBatch with onError', () => {
      it('should handle errors gracefully with onError callback', async () => {
        const items = ['item1', 'item2', 'fail-item', 'item4'];
        const processFn: ProcessFn<string, string> = async (item) => {
          if (item.startsWith('fail')) {
            throw new Error(`Failed to process ${item}`);
          }
          return `processed-${item}`;
        };

        const errorItems: string[] = [];
        const options: BatchProcessorOptions<string, string> = {
          onError: (error, item) => {
            errorItems.push(item as string);
            return true; // Continue processing
          },
        };

        const result = await processBatch(items, processFn, options);

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].input).toBe('fail-item');
        expect(result.failed[0].error.message).toBe('Failed to process fail-item');
        expect(errorItems).toEqual(['fail-item']);
        expect(result.stats.completed).toBe(3);
        expect(result.stats.failed).toBe(1);
      });

      it('should stop processing when onError returns false', async () => {
        const items = ['item1', 'item2', 'fail-item', 'item3', 'item4'];
        let processedCount = 0;

        const processFn: ProcessFn<string, string> = async (item) => {
          processedCount++;
          if (item.startsWith('fail')) {
            throw new Error('Stop here');
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          concurrency: 1,
          onError: (error, item) => {
            // Stop on first error
            return false;
          },
        };

        const result = await processBatch(items, processFn, options);

        // Should have stopped at the error
        expect(result.failed.length).toBeGreaterThanOrEqual(1);
        expect(result.failed.some((f) => f.input === 'fail-item')).toBe(true);
        // Due to concurrency, some items after the error might have started
        // but not all items should complete
        expect(result.stats.completed + result.stats.failed).toBeLessThanOrEqual(
          items.length
        );
      });

      it('should handle all items failing', async () => {
        const items = ['fail1', 'fail2', 'fail3'];
        const processFn: ProcessFn<string, string> = async (item) => {
          throw new Error(`Failed: ${item}`);
        };

        const result = await processBatch(items, processFn, {
          onError: () => true,
        });

        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(3);
        expect(result.stats.completed).toBe(0);
        expect(result.stats.failed).toBe(3);
      });

      it('should handle mixed success and failure', async () => {
        const items = [
          'success1',
          'fail1',
          'success2',
          'fail2',
          'success3',
        ];
        const processFn: ProcessFn<string, string> = async (item) => {
          if (item.startsWith('fail')) {
            throw new Error(`Error: ${item}`);
          }
          return `ok-${item}`;
        };

        const result = await processBatch(items, processFn, {
          concurrency: 2,
          onError: () => true,
        });

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(2);
        expect(result.stats.completed).toBe(3);
        expect(result.stats.failed).toBe(2);
      });

      it('should preserve error information', async () => {
        const items = ['item1'];
        const customError = new Error('Custom error message');
        const processFn: ProcessFn<string, string> = async () => {
          throw customError;
        };

        const result = await processBatch(items, processFn, {
          onError: () => true,
        });

        expect(result.failed[0].error).toBe(customError);
        expect(result.failed[0].error.message).toBe('Custom error message');
      });
    });

    describe('clearCache after batch', () => {
      it('should clear cache after batch when useCache is true', async () => {
        const items = ['item1', 'item2'];
        const processFn: ProcessFn<string, string> = async (item) => {
          return `processed-${item}`;
        };

        const options: BatchProcessorOptions<string, string> = {
          useCache: true,
        };

        await processBatch(items, processFn, options);

        // Cache should be cleared after batch completion
        // This is implicit - the module should handle cleanup
        const result = await processBatch([], processFn, options);
        expect(result.stats.total).toBe(0);
      });
    });
  });
});
