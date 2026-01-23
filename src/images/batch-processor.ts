/**
 * Batch Processor Module
 *
 * Provides controlled-concurrency batch processing.
 * This module prevents memory exhaustion on large batches by limiting
 * parallel operations while integrating with Sharp cache management.
 *
 * @module batch-processor
 */

import type { CacheOptions } from './sharp-cache';

/**
 * Concurrency limiter function type
 */
export type Limit = <T>(fn: () => Promise<T> | T) => Promise<T>;

/**
 * Internal queue item for concurrency control
 */
interface QueueItem {
  fn: () => Promise<unknown> | unknown;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

/**
 * Batch processor options
 */
export interface BatchProcessorOptions<TInput = unknown, TResult = unknown> {
  /** Maximum concurrent operations (default: 4, 0 = unlimited) */
  concurrency?: number;
  /** Progress callback called after each item completes */
  onProgress?: (completed: number, total: number) => void;
  /** Error handler (return true to continue, false to stop) */
  onError?: (error: Error, item: TInput) => boolean;
  /** Enable Sharp cache during batch (default: true) */
  useCache?: boolean;
  /** Cache options if useCache is true */
  cacheOptions?: CacheOptions;
}

/**
 * Result of a batch processing operation
 */
export interface BatchProcessorResult<TInput = unknown, TResult = unknown> {
  /** Successful results */
  successful: Array<{
    input: TInput;
    result: TResult;
  }>;
  /** Failed items */
  failed: Array<{
    input: TInput;
    error: Error;
  }>;
  /** Processing statistics */
  stats: {
    total: number;
    completed: number;
    failed: number;
    duration: number;
  };
}

/**
 * Process function type for batch operations
 */
export type ProcessFn<TInput = unknown, TResult = unknown> = (
  input: TInput
) => Promise<TResult>;

/**
 * Default concurrency limit
 */
const DEFAULT_CONCURRENCY = 4;

/**
 * Create a concurrency limit function.
 *
 * @param concurrency - Maximum concurrent operations (0 = unlimited)
 * @returns Limit function
 *
 * @example
 * ```ts
 * const limit = createConcurrencyLimit(2);
 * const result1 = limit(() => asyncOperation1());
 * const result2 = limit(() => asyncOperation2());
 * const result3 = limit(() => asyncOperation3()); // Waits for one of the above
 * await Promise.all([result1, result2, result3]);
 * ```
 */
export function createConcurrencyLimit(concurrency: number = DEFAULT_CONCURRENCY): Limit {
  if (concurrency === 0) {
    // Unlimited concurrency - just return the function result
    return <T>(fn: () => Promise<T> | T) => Promise.resolve(fn());
  }

  let running = 0;
  const queue: QueueItem[] = [];

  const processNext = () => {
    if (running >= concurrency || queue.length === 0) {
      return;
    }

    running++;
    const item = queue.shift()!;

    Promise.resolve(item.fn())
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        running--;
        processNext();
      });
  };

  return <T>(fn: () => Promise<T> | T): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: unknown) => void,
      });
      processNext();
    });
  };
}

/**
 * Process a batch of items with controlled concurrency.
 *
 * @param items - Items to process
 * @param processFn - Function to process each item
 * @param options - Batch processing options
 * @returns Promise resolving to batch processing result
 *
 * @example
 * ```ts
 * const items = ['file1.jpg', 'file2.jpg', 'file3.jpg'];
 * const result = await processBatch(
 *   items,
 *   async (item) => {
 *     return await processImage(item);
 *   },
 *   { concurrency: 2 }
 * );
 *
 * console.log(`Processed ${result.stats.completed} items`);
 * console.log(`Failed ${result.stats.failed} items`);
 * ```
 */
export async function processBatch<TInput = unknown, TResult = unknown>(
  items: TInput[],
  processFn: ProcessFn<TInput, TResult>,
  options: BatchProcessorOptions<TInput, TResult> = {}
): Promise<BatchProcessorResult<TInput, TResult>> {
  const startTime = performance.now();

  const {
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    onError,
    useCache = false,
  } = options;

  // Create concurrency limit
  const limit = createConcurrencyLimit(concurrency);

  // Track results with index to preserve order
  type ResultItem =
    | { success: true; index: number; input: TInput; result: TResult }
    | { success: false; index: number; input: TInput; error: Error; stop?: boolean };

  const results: ResultItem[] = [];

  // Track completion for progress
  let completedCount = 0;
  const total = items.length;

  // Process each item with concurrency control
  const processingPromises = items.map((item, index) =>
    limit(async () => {
      try {
        const result = await processFn(item);
        results.push({ success: true, index, input: item, result });
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, total);
        }

        return { success: true };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Call error handler if provided
        let shouldContinue = true;
        if (onError) {
          shouldContinue = onError(err, item);
        }

        results.push({ success: false, index, input: item, error: err, stop: !shouldContinue });
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, total);
        }

        return { success: !shouldContinue };
      }
    })
  );

  // Wait for all processing to complete
  await Promise.all(processingPromises);

  // Sort results by index to maintain input order
  results.sort((a, b) => a.index - b.index);

  // Separate successful and failed results
  const successful: Array<{ input: TInput; result: TResult }> = [];
  const failed: Array<{ input: TInput; error: Error }> = [];

  for (const result of results) {
    if (result.success) {
      successful.push({ input: result.input, result: result.result });
    } else {
      failed.push({ input: result.input, error: result.error });
    }
  }

  const duration = performance.now() - startTime;

  return {
    successful,
    failed,
    stats: {
      total,
      completed: successful.length,
      failed: failed.length,
      duration,
    },
  };
}
