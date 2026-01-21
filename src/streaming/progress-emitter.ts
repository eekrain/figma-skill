/**
 * Progress emitter for streaming operations
 * Uses eventemitter3 for efficient event handling
 */
import { EventEmitter } from "eventemitter3";

import type { StreamProgress } from "@/extractors/types";

/**
 * Progress events emitted during streaming operations
 */
export interface ProgressEvents {
  progress: (progress: StreamProgress) => void;
  start: (total: number) => void;
  complete: (processed: number) => void;
  error: (error: Error) => void;
}

/**
 * Progress emitter class for tracking streaming operation progress
 */
export class ProgressEmitter extends EventEmitter<ProgressEvents> {
  private total: number = 0;
  private processed: number = 0;
  private startTime: number = 0;
  private currentOperation: string = "initializing";

  /**
   * Initialize the progress tracker with total items to process
   */
  start(total: number, operation: string = "processing"): void {
    this.total = total;
    this.processed = 0;
    this.startTime = Date.now();
    this.currentOperation = operation;

    this.emit("start", total);
  }

  /**
   * Update progress by incrementing processed count
   */
  increment(amount: number = 1): void {
    this.processed = Math.min(this.processed + amount, this.total);
    this.emitProgress();
  }

  /**
   * Set the exact processed count
   */
  setProcessed(processed: number): void {
    this.processed = Math.min(processed, this.total);
    this.emitProgress();
  }

  /**
   * Update the current operation name
   */
  setOperation(operation: string): void {
    this.currentOperation = operation;
    this.emitProgress();
  }

  /**
   * Emit the current progress state
   */
  private emitProgress(): void {
    const progress: StreamProgress = {
      percent:
        this.total > 0 ? Math.round((this.processed / this.total) * 100) : 0,
      processed: this.processed,
      total: this.total,
      operation: this.currentOperation,
    };

    this.emit("progress", progress);
  }

  /**
   * Mark the operation as complete
   */
  complete(): void {
    this.processed = this.total;
    this.emit("complete", this.processed);
  }

  /**
   * Emit an error event
   */
  error(error: Error): void {
    this.emit("error", error);
  }

  /**
   * Get the current progress state
   */
  getProgress(): StreamProgress {
    return {
      percent:
        this.total > 0 ? Math.round((this.processed / this.total) * 100) : 0,
      processed: this.processed,
      total: this.total,
      operation: this.currentOperation,
    };
  }

  /**
   * Reset the progress tracker
   */
  reset(): void {
    this.total = 0;
    this.processed = 0;
    this.currentOperation = "initializing";
  }
}
