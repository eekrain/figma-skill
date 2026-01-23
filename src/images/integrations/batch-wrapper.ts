/**
 * Batch Processing Integration Wrapper
 *
 * Convenience wrapper that provides the simplified API expected by tests.
 * This adds compatibility between the test expectations and actual implementation.
 */

import {
  processBatch as processBatchImpl,
  createConcurrencyLimit,
} from "../batch-processor.js";
import type { BatchProcessorOptions, BatchProcessorResult, ProcessFn, Limit } from "../batch-processor.js";

// Re-export createConcurrencyLimit
export { createConcurrencyLimit };

/**
 * Extended batch processor result that includes flattened properties.
 */
export interface ExtendedBatchProcessorResult<TInput = unknown, TResult = unknown> {
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
    totalDuration?: number;
    averageTime?: number;
  };
  /** Flattened convenience properties */
  completed: number;
  errors: Array<{ input: TInput; error: Error }>;
}

/**
 * Wrapper for processBatch that provides the test-expected API.
 * Adds flattened `completed` and `errors` properties to the result.
 *
 * @param items - Items to process
 * @param processFn - Function to process each item
 * @param options - Batch processing options
 * @returns Promise resolving to extended batch processing result
 */
export async function processBatch<TInput = unknown, TResult = unknown>(
  items: TInput[],
  processFn: ProcessFn<TInput, TResult>,
  options: BatchProcessorOptions<TInput, TResult> = {}
): Promise<ExtendedBatchProcessorResult<TInput, TResult>> {
  const result = await processBatchImpl(items, processFn, options);

  const duration = result.stats.duration;

  return {
    ...result,
    stats: {
      ...result.stats,
      totalDuration: duration,
      averageTime: duration / items.length,
    },
    completed: result.stats.completed,
    errors: result.failed.map(({ input, error }) => ({ input, error })),
  } as unknown as ExtendedBatchProcessorResult<TInput, TResult>;
}

// Re-export the original types
export type { ProcessFn, BatchProcessorOptions, BatchProcessorResult, Limit };
