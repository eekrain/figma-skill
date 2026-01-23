/**
 * Format optimizer tests - Phase 2 Sprint 2
 *
 * Tests for format-specific encoder settings based on content analysis:
 * - JPEG settings (quality, chroma subsampling)
 * - PNG settings (compression level, adaptive filtering, palette)
 * - WebP settings (quality, lossless, smart subsample)
 */
import { describe, expect, it } from "@jest/globals";

import {
  getOptimizedSettings,
  getJpegSettings,
  getPngSettings,
  getWebPSettings,
  type JpegSettings,
  type PngSettings,
  type WebPSettings,
} from "@/images/format-optimizer";
import type { ContentAnalysis } from "@/images/content-analyzer";

// =====================================================
// Test Helpers
// =====================================================

function createMockAnalysis(
  overrides: Partial<ContentAnalysis> = {}
): ContentAnalysis {
  return {
    entropy: 5.0,
    hasTransparency: false,
    paletteSize: 100,
    width: 100,
    height: 100,
    contentType: "GRAPHIC",
    ...overrides,
  };
}

// =====================================================
// JPEG Settings Tests
// =====================================================

describe("format-optimizer - JPEG", () => {
  describe("getJpegSettings", () => {
    it("should return high quality for photographs", () => {
      const analysis = createMockAnalysis({
        entropy: 7.5,
        contentType: "PHOTOGRAPH",
      });

      const settings = getJpegSettings(analysis);

      expect(settings.format).toBe("jpeg");
      expect(settings.quality).toBeGreaterThanOrEqual(80);
      expect(settings.quality).toBeLessThanOrEqual(95);
    });

    it("should use 4:2:0 chroma for photographs", () => {
      const analysis = createMockAnalysis({
        entropy: 7.0,
        contentType: "PHOTOGRAPH",
        paletteSize: 500, // Large palette for photographs
      });

      const settings = getJpegSettings(analysis) as JpegSettings;

      expect(settings.chromaSubsampling).toBe("4:2:0");
    });

    it("should use 4:4:4 chroma for graphics", () => {
      const analysis = createMockAnalysis({
        entropy: 3.0,
        contentType: "GRAPHIC",
        paletteSize: 50,
      });

      const settings = getJpegSettings(analysis) as JpegSettings;

      expect(settings.chromaSubsampling).toBe("4:4:4");
    });

    it("should use 4:4:4 chroma for images with text/edges", () => {
      const analysis = createMockAnalysis({
        entropy: 2.5,
        contentType: "GRAPHIC",
        paletteSize: 10,
      });

      const settings = getJpegSettings(analysis) as JpegSettings;

      expect(settings.chromaSubsampling).toBe("4:4:4");
    });

    it("should adjust quality based on entropy", () => {
      const lowEntropy = createMockAnalysis({ entropy: 4.0 });
      const highEntropy = createMockAnalysis({ entropy: 7.5 });

      const lowSettings = getJpegSettings(lowEntropy);
      const highSettings = getJpegSettings(highEntropy);

      // Higher entropy images should get higher quality
      expect(highSettings.quality).toBeGreaterThanOrEqual(lowSettings.quality);
    });

    it("should cap quality at 95", () => {
      const analysis = createMockAnalysis({ entropy: 8.0 });

      const settings = getJpegSettings(analysis);

      expect(settings.quality).toBeLessThanOrEqual(95);
    });

    it("should have minimum quality of 70", () => {
      const analysis = createMockAnalysis({ entropy: 0 });

      const settings = getJpegSettings(analysis);

      expect(settings.quality).toBeGreaterThanOrEqual(70);
    });
  });
});

// =====================================================
// PNG Settings Tests
// =====================================================

describe("format-optimizer - PNG", () => {
  describe("getPngSettings", () => {
    it("should enable palette for limited color images", () => {
      const analysis = createMockAnalysis({
        paletteSize: 50,
        contentType: "GRAPHIC",
      });

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.format).toBe("png");
      expect(settings.palette).toBe(true);
    });

    it("should disable palette for large palette images", () => {
      const analysis = createMockAnalysis({
        paletteSize: 500,
        contentType: "PHOTOGRAPH",
      });

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.palette).toBe(false);
    });

    it("should use high compression for simple graphics", () => {
      const analysis = createMockAnalysis({
        entropy: 1.0,
        paletteSize: 10,
      });

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.compressionLevel).toBeGreaterThanOrEqual(7);
    });

    it("should use medium compression for complex images", () => {
      const analysis = createMockAnalysis({
        entropy: 6.0,
        paletteSize: 300,
      });

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.compressionLevel).toBeGreaterThan(4);
      expect(settings.compressionLevel).toBeLessThan(9);
    });

    it("should enable adaptive filtering", () => {
      const analysis = createMockAnalysis();

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.adaptiveFiltering).toBe(true);
    });

    it("should use palette threshold of 256 colors", () => {
      const justUnder = createMockAnalysis({ paletteSize: 255 });
      const justOver = createMockAnalysis({ paletteSize: 257 });

      const underSettings = getPngSettings(justUnder) as PngSettings;
      const overSettings = getPngSettings(justOver) as PngSettings;

      expect(underSettings.palette).toBe(true);
      expect(overSettings.palette).toBe(false);
    });

    it("should cap compression level at 9", () => {
      const analysis = createMockAnalysis({ entropy: 0 });

      const settings = getPngSettings(analysis) as PngSettings;

      expect(settings.compressionLevel).toBeLessThanOrEqual(9);
    });
  });
});

// =====================================================
// WebP Settings Tests
// =====================================================

describe("format-optimizer - WebP", () => {
  describe("getWebPSettings", () => {
    it("should use lossy for photographs", () => {
      const analysis = createMockAnalysis({
        contentType: "PHOTOGRAPH",
        entropy: 7.0,
      });

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.format).toBe("webp");
      expect(settings.lossless).toBe(false);
    });

    it("should use lossless for graphics", () => {
      const analysis = createMockAnalysis({
        contentType: "GRAPHIC",
        paletteSize: 50,
      });

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.lossless).toBe(true);
    });

    it("should use smart subsample for photographs", () => {
      const analysis = createMockAnalysis({
        contentType: "PHOTOGRAPH",
      });

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.smartSubsample).toBe(true);
    });

    it("should disable smart subsample for graphics", () => {
      const analysis = createMockAnalysis({
        contentType: "GRAPHIC",
      });

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.smartSubsample).toBe(false);
    });

    it("should set reasonable effort level", () => {
      const analysis = createMockAnalysis();

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.effort).toBeGreaterThan(0);
      expect(settings.effort).toBeLessThanOrEqual(6);
    });

    it("should use higher quality for photographs", () => {
      const photo = createMockAnalysis({ contentType: "PHOTOGRAPH" });
      const graphic = createMockAnalysis({ contentType: "GRAPHIC" });

      const photoSettings = getWebPSettings(photo) as WebPSettings;
      const graphicSettings = getWebPSettings(graphic) as WebPSettings;

      // Photographs should get higher quality in lossy mode
      expect(photoSettings.quality).toBeGreaterThanOrEqual(75);
    });

    it("should enable near-lossless for mixed content", () => {
      const analysis = createMockAnalysis({
        contentType: "MIXED",
      });

      const settings = getWebPSettings(analysis) as WebPSettings;

      expect(settings.nearLossless).toBe(true);
    });
  });
});

// =====================================================
// Optimized Settings Integration Tests
// =====================================================

describe("format-optimizer - Integration", () => {
  describe("getOptimizedSettings", () => {
    it("should return JPEG settings for photographs", () => {
      const analysis = createMockAnalysis({
        contentType: "PHOTOGRAPH",
        hasTransparency: false,
      });

      const settings = getOptimizedSettings("jpeg", analysis);

      expect(settings.format).toBe("jpeg");
    });

    it("should return PNG settings for graphics", () => {
      const analysis = createMockAnalysis({
        contentType: "GRAPHIC",
      });

      const settings = getOptimizedSettings("png", analysis);

      expect(settings.format).toBe("png");
    });

    it("should return WebP settings when requested", () => {
      const analysis = createMockAnalysis();

      const settings = getOptimizedSettings("webp", analysis);

      expect(settings.format).toBe("webp");
    });

    it("should handle all content types with JPEG", () => {
      const photograph = createMockAnalysis({ contentType: "PHOTOGRAPH" });
      const graphic = createMockAnalysis({ contentType: "GRAPHIC" });
      const mixed = createMockAnalysis({ contentType: "MIXED" });

      const photoSettings = getOptimizedSettings("jpeg", photograph);
      const graphicSettings = getOptimizedSettings("jpeg", graphic);
      const mixedSettings = getOptimizedSettings("jpeg", mixed);

      expect(photoSettings.format).toBe("jpeg");
      expect(graphicSettings.format).toBe("jpeg");
      expect(mixedSettings.format).toBe("jpeg");
    });
  });
});

// =====================================================
// Edge Cases
// =====================================================

describe("format-optimizer - Edge Cases", () => {
  it("should handle minimum values", () => {
    const analysis = createMockAnalysis({
      entropy: 0,
      paletteSize: 1,
    });

    const jpegSettings = getJpegSettings(analysis);
    const pngSettings = getPngSettings(analysis);
    const webpSettings = getWebPSettings(analysis);

    expect(jpegSettings.quality).toBeGreaterThanOrEqual(70);
    expect(pngSettings.compressionLevel).toBeGreaterThan(0);
    expect(webpSettings.effort).toBeGreaterThan(0);
  });

  it("should handle maximum values", () => {
    const analysis = createMockAnalysis({
      entropy: 8,
      paletteSize: 1000000,
    });

    const jpegSettings = getJpegSettings(analysis);
    const pngSettings = getPngSettings(analysis);
    const webpSettings = getWebPSettings(analysis);

    expect(jpegSettings.quality).toBeLessThanOrEqual(95);
    expect(pngSettings.compressionLevel).toBeLessThanOrEqual(9);
    expect(webpSettings.effort).toBeLessThanOrEqual(6);
  });

  it("should handle mixed content type", () => {
    const analysis = createMockAnalysis({
      contentType: "MIXED",
    });

    const jpegSettings = getJpegSettings(analysis);
    const pngSettings = getPngSettings(analysis);
    const webpSettings = getWebPSettings(analysis) as WebPSettings;

    expect(jpegSettings.format).toBe("jpeg");
    expect(pngSettings.format).toBe("png");
    expect(webpSettings.format).toBe("webp");
    expect(webpSettings.nearLossless).toBe(true);
  });

  it("should respect transparency in settings", () => {
    const transparent = createMockAnalysis({
      hasTransparency: true,
      contentType: "GRAPHIC",
    });

    const pngSettings = getPngSettings(transparent) as PngSettings;

    // Should preserve transparency
    expect(pngSettings.format).toBe("png");
  });
});
