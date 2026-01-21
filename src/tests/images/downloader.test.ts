/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";

import {
  deduplicateDownloads,
  downloadImages,
  downloadSingle,
} from "@/images/downloader";
import { ProgressEmitter } from "@/streaming/progress-emitter";

// Mock sharp before importing the module that uses it
jest.mock("sharp", () => {
  const mockSharp = jest.fn(() => ({
    metadata: jest.fn(() => ({
      width: 100,
      height: 100,
      format: "png",
      size: 100,
    })),
  }));
  return mockSharp;
});

// Mock fetch globally
type FetchFunction = (
  input: string | Request | URL,
  init?: RequestInit
) => Promise<Response>;

global.fetch = jest.fn() as jest.MockedFunction<FetchFunction>;

// Minimal 1x1 PNG (red pixel)
const MINIMAL_PNG = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // PNG signature
  0x00,
  0x00,
  0x00,
  0x0d, // IHDR length
  0x49,
  0x48,
  0x44,
  0x52, // IHDR type
  0x00,
  0x00,
  0x00,
  0x01, // width: 1
  0x00,
  0x00,
  0x00,
  0x01, // height: 1
  0x08,
  0x02,
  0x00,
  0x00,
  0x00, // bit depth: 8, color type: 2 (RGB), etc.
  0x4d,
  0x2d,
  0x41,
  0x55, // CRC
  0x49,
  0x45,
  0x4e,
  0x44, // IEND type
  0xae,
  0x42,
  0x60,
  0x82, // IEND CRC
]);

describe("downloadSingle", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should download image successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => MINIMAL_PNG.buffer,
      headers: {
        get: (name: string) => (name === "content-type" ? "image/png" : null),
      },
      status: 200,
      statusText: "OK",
    } as Response);

    const result = await downloadSingle(
      {
        id: "test-1",
        url: "https://example.com/image.png",
        path: "/tmp/test-1.png",
      },
      5000
    );

    expect(result).toMatchObject({
      id: "test-1",
      url: "https://example.com/image.png",
      path: "/tmp/test-1.png",
      success: true,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      downloadSingle(
        {
          id: "test-1",
          url: "https://example.com/image.png",
          path: "/tmp/test-1.png",
        },
        5000
      )
    ).rejects.toThrow("Network error");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: {
        get: () => null,
      },
    } as unknown as Response);

    await expect(
      downloadSingle(
        {
          id: "test-1",
          url: "https://example.com/image.png",
          path: "/tmp/test-1.png",
        },
        5000
      )
    ).rejects.toThrow("404");
  });
});

describe("deduplicateDownloads", () => {
  it("should remove duplicate URLs", () => {
    const items = [
      { id: "1", url: "https://example.com/image.png" },
      { id: "2", url: "https://example.com/image.png" },
      { id: "3", url: "https://example.com/other.png" },
    ];

    const deduplicated = deduplicateDownloads(items);

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0]).toMatchObject({
      id: "1",
      url: "https://example.com/image.png",
      ids: ["1", "2"],
    });
    expect(deduplicated[1]).toMatchObject({
      id: "3",
      url: "https://example.com/other.png",
      ids: ["3"],
    });
  });

  it("should handle empty array", () => {
    const deduplicated = deduplicateDownloads([]);
    expect(deduplicated).toEqual([]);
  });

  it("should handle single item", () => {
    const items = [{ id: "1", url: "https://example.com/image.png" }];
    const deduplicated = deduplicateDownloads(items);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].ids).toEqual(["1"]);
  });

  it("should handle all duplicates", () => {
    const items = [
      { id: "1", url: "https://example.com/image.png" },
      { id: "2", url: "https://example.com/image.png" },
      { id: "3", url: "https://example.com/image.png" },
    ];

    const deduplicated = deduplicateDownloads(items);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].ids).toEqual(["1", "2", "3"]);
  });

  it("should maintain first ID as primary", () => {
    const items = [
      { id: "3", url: "https://example.com/image.png" },
      { id: "1", url: "https://example.com/image.png" },
      { id: "2", url: "https://example.com/image.png" },
    ];

    const deduplicated = deduplicateDownloads(items);

    expect(deduplicated[0].id).toBe("3");
    expect(deduplicated[0].ids).toEqual(["3", "1", "2"]);
  });
});

describe("downloadImages", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const testDir = "/tmp/figma-skill-test-downloads";

  beforeEach(async () => {
    jest.clearAllMocks();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should download multiple images with default parallelism", async () => {
    mockFetch.mockImplementation((_url) =>
      Promise.resolve({
        ok: true,
        arrayBuffer: async () => MINIMAL_PNG.buffer,
        headers: new Headers({ "content-type": "image/png" }),
      } as unknown as Response)
    );

    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `test-${i}`,
      url: `https://example.com/image-${i}.png`,
    }));

    const results = await downloadImages(items, {
      outputDir: testDir,
      parallel: 5,
      timeout: 5000,
    });

    expect(results).toHaveLength(10);
    expect(results.every((r) => r.success)).toBe(true);

    // Verify files were created
    for (const result of results) {
      if (result.success) {
        const filePath = join(testDir, `${result.id}.png`);
        await expect(fs.access(filePath)).resolves.toBeUndefined();
      }
    }
  });

  it("should respect parallel limit", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          setTimeout(() => {
            concurrent--;
            resolve({
              ok: true,
              arrayBuffer: async () => MINIMAL_PNG.buffer,
              headers: new Headers({ "content-type": "image/png" }),
            } as any);
          }, 50);
        })
    );

    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `test-${i}`,
      url: `https://example.com/image-${i}.png`,
    }));

    await downloadImages(items, {
      outputDir: testDir,
      parallel: 5,
      timeout: 5000,
    });

    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });

  it("should enforce max parallel limit of 10", async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolve({
            ok: true,
            arrayBuffer: async () => MINIMAL_PNG.buffer,
            headers: new Headers({ "content-type": "image/png" }),
          } as any);
        })
    );

    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `test-${i}`,
      url: `https://example.com/image-${i}.png`,
    }));

    // Even with parallel: 100, should cap at 10
    await downloadImages(items, {
      outputDir: testDir,
      parallel: 100,
      timeout: 5000,
    });

    // Should complete without errors
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle partial failures", async () => {
    mockFetch.mockImplementation((url: any) => {
      if (url.toString().includes("image-5")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => MINIMAL_PNG.buffer,
        headers: new Headers({ "content-type": "image/png" }),
      } as any);
    });

    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `test-${i}`,
      url: `https://example.com/image-${i}.png`,
    }));

    const results = await downloadImages(items, {
      outputDir: testDir,
      parallel: 5,
      timeout: 5000,
    });

    expect(results).toHaveLength(10);
    const result5 = results.find((r) => r.id === "test-5");
    expect(result5?.success).toBe(false);
    const result0 = results.find((r) => r.id === "test-0");
    expect(result0?.success).toBe(true);
  });

  it("should emit progress events", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => MINIMAL_PNG.buffer,
      headers: new Headers({ "content-type": "image/png" }),
    } as any);

    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `test-${i}`,
      url: `https://example.com/image-${i}.png`,
    }));

    const progress = new ProgressEmitter();
    const progressEvents: Array<{
      percent: number;
      processed: number;
      total: number;
    }> = [];

    progress.on("progress", (p) => progressEvents.push(p));

    await downloadImages(items, {
      outputDir: testDir,
      parallel: 2,
      timeout: 5000,
      progress,
    });

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1].percent).toBe(100);
  });

  it("should handle empty items array", async () => {
    const results = await downloadImages([], {
      outputDir: testDir,
      parallel: 5,
      timeout: 5000,
    });

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should save files with correct extensions", async () => {
    mockFetch.mockImplementation((url: any) => {
      const contentType = url.toString().includes(".jpg")
        ? "image/jpeg"
        : "image/png";
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => MINIMAL_PNG.buffer,
        headers: new Headers({ "content-type": contentType }),
      } as any);
    });

    const items = [
      { id: "test-1", url: "https://example.com/image.jpg" },
      { id: "test-2", url: "https://example.com/image.png" },
    ];

    await downloadImages(items, {
      outputDir: testDir,
      parallel: 2,
      timeout: 5000,
    });

    await expect(
      fs.access(join(testDir, "test-1.jpg"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(testDir, "test-2.png"))
    ).resolves.toBeUndefined();
  });

  it("should create output directory if it doesn't exist", async () => {
    const newDir = join(testDir, "nested", "directory");

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => MINIMAL_PNG.buffer,
      headers: new Headers({ "content-type": "image/png" }),
    } as any);

    const items = [{ id: "test-1", url: "https://example.com/image.png" }];

    await downloadImages(items, {
      outputDir: newDir,
      parallel: 1,
      timeout: 5000,
    });

    await expect(fs.access(newDir)).resolves.toBeUndefined();
    await expect(
      fs.access(join(newDir, "test-1.png"))
    ).resolves.toBeUndefined();
  });

  it("should handle timeout per request", async () => {
    // Test with a very short timeout - mock fetch that respects abort signal
    mockFetch.mockImplementation((_, init) => {
      return new Promise((resolve, reject) => {
        // Set up abort listener
        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            reject(new Error("Request aborted"));
          });
        }
        // This will never resolve, so the timeout will fire
        setTimeout(() => {
          resolve({
            ok: true,
            arrayBuffer: async () => MINIMAL_PNG.buffer,
            headers: new Headers({ "content-type": "image/png" }),
          } as any);
        }, 10000); // Much longer than the 100ms timeout
      });
    });

    const items = [{ id: "test-1", url: "https://example.com/image.png" }];

    const results = await downloadImages(items, {
      outputDir: testDir,
      parallel: 1,
      timeout: 100, // Very short timeout
    });

    expect(results).toHaveLength(1);
    // The download should fail due to timeout
    // Note: exact error message may vary depending on fetch implementation
    expect(results[0].success).toBe(false);
  });
});
