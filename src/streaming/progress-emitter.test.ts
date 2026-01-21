/**
 * Unit tests for ProgressEmitter
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ProgressEmitter } from "./progress-emitter";

describe("ProgressEmitter", () => {
  let emitter: ProgressEmitter;

  beforeEach(() => {
    emitter = new ProgressEmitter();
  });

  describe("start", () => {
    it("should initialize progress with total count", () => {
      const onStart = jest.fn();
      emitter.on("start", onStart);

      emitter.start(100, "test-operation");

      expect(onStart).toHaveBeenCalledWith(100);
      expect(emitter["total"]).toBe(100);
      expect(emitter["processed"]).toBe(0);
      expect(emitter["currentOperation"]).toBe("test-operation");
    });

    it("should not emit initial progress event on start", () => {
      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.start(100);

      expect(onProgress).not.toHaveBeenCalled();
    });

    it("should use default operation name", () => {
      emitter.start(50);

      expect(emitter["currentOperation"]).toBe("processing");
    });
  });

  describe("increment", () => {
    beforeEach(() => {
      emitter.start(100);
    });

    it("should increment processed count by 1 by default", () => {
      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.increment();

      expect(emitter["processed"]).toBe(1);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: 1,
          percent: 1,
        })
      );
    });

    it("should increment by custom amount", () => {
      emitter.increment(10);

      expect(emitter["processed"]).toBe(10);
    });

    it("should not exceed total count", () => {
      emitter.increment(150);

      expect(emitter["processed"]).toBe(100);
    });

    it("should emit progress event with correct percentage", () => {
      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.increment(50);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 50,
          processed: 50,
          total: 100,
        })
      );
    });

    it("should round percentage correctly", () => {
      emitter.start(3);

      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.increment(1);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 33,
        })
      );
    });

    it("should handle zero total count", () => {
      emitter.start(0);

      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.increment(1);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: 0,
        })
      );
    });
  });

  describe("complete", () => {
    it("should emit complete event with final total", () => {
      const onComplete = jest.fn();
      emitter.on("complete", onComplete);

      emitter.start(100);
      emitter.complete();

      expect(onComplete).toHaveBeenCalledWith(100);
    });

    it("should not emit progress on complete", () => {
      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.start(100);
      emitter.complete();

      expect(onProgress).not.toHaveBeenCalled();
    });

    it("should complete with zero items", () => {
      const onComplete = jest.fn();
      emitter.on("complete", onComplete);

      emitter.start(0);
      emitter.complete();

      expect(onComplete).toHaveBeenCalledWith(0);
    });
  });

  describe("error", () => {
    it("should emit error event with error object", () => {
      const onError = jest.fn();
      emitter.on("error", onError);

      const testError = new Error("Test error");
      emitter.error(testError);

      expect(onError).toHaveBeenCalledWith(testError);
    });
  });

  describe("complete", () => {
    it("should support multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on("progress", listener1);
      emitter.on("progress", listener2);

      emitter.start(100);
      emitter.increment();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should support removing listeners", () => {
      const listener = jest.fn();
      emitter.on("progress", listener);
      emitter.off("progress", listener);

      emitter.start(100);
      emitter.increment();

      expect(listener).not.toHaveBeenCalled();
    });

    it("should support removeAllListeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      emitter.on("progress", listener1);
      emitter.on("complete", listener2);
      emitter.removeAllListeners();

      emitter.start(100);
      emitter.increment();
      emitter.complete();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe("Integration tests", () => {
    it("should track complete workflow", async () => {
      const events: string[] = [];

      emitter.on("start", () => events.push("start"));
      emitter.on("progress", () => events.push("progress"));
      emitter.on("complete", () => events.push("complete"));

      emitter.start(10);

      for (let i = 0; i < 10; i++) {
        emitter.increment();
      }

      emitter.complete();

      expect(events).toEqual([
        "start",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "progress",
        "complete",
      ]);
    });

    it("should handle 100% completion correctly", () => {
      const onProgress = jest.fn();
      emitter.on("progress", onProgress);

      emitter.start(10);
      emitter.increment(10);

      const lastCall = onProgress.mock.calls[
        onProgress.mock.calls.length - 1
      ][0] as { percent: number; processed: number };

      expect(lastCall.percent).toBe(100);
      expect(lastCall.processed).toBe(10);
    });
  });
});
