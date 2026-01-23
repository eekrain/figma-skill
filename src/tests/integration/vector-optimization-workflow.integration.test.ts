/**
 * Vector Optimization Integration Tests
 *
 * Tests the end-to-end vector optimization workflow:
 * 1. Canonicalize SVGs for content-addressable storage
 * 2. Optimize with SVGO (Figma-safe configuration)
 * 3. Deduplicate identical SVGs via content hashing
 * 4. Generate sprite from deduplicated set
 * 5. Verify viewBox preservation throughout pipeline
 *
 * RED PHASE: These tests will fail because the integration orchestrator
 * doesn't exist yet.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Module imports
import {
  canonicalizeSvg,
  computeHash,
  optimizeSvg,
  optimizeSvgBatch,
  deduplicateSvgs,
  generateSprite,
  verifyViewBoxPreserved,
  calculateBytesSaved,
  meetsReductionTarget,
  type CanonicalizedSVG,
  type OptimizationResult,
  type DeduplicationResult,
  type SpriteGenerationResult,
} from "../../vectors/index.js";
import {
  SIMPLE_ICON,
  SIMPLE_ICON_DUPLICATE_1,
  SIMPLE_ICON_DUPLICATE_2,
  SVG_WITH_METADATA,
  SVG_NESTED_GROUPS,
  HOME_ICON,
  SETTINGS_ICON,
  USER_ICON,
  SEARCH_ICON,
  getAllIconFixtures,
} from "../fixtures/svg.js";
import {
  withTempDirectory,
  createTempDir,
  countFiles,
  getFileSize,
  assertGreaterThan,
  assertLessThan,
  assertInRange,
} from "../utils/integration-helpers.js";
import { createPerformanceMarker } from "../utils/performance-helpers.js";

// =====================================================
// Test Context
// =====================================================

interface TestContext {
  tempDir: string;
}

let context: TestContext;

// =====================================================
// Setup & Teardown
// =====================================================

beforeAll(async () => {
  const temp = await createTempDir("vector-integration-");
  context = { tempDir: temp.path };
});

afterAll(async () => {
  await rm(context.tempDir, { recursive: true, force: true });
});

// =====================================================
// Test Suite: Vector Optimization Integration
// =====================================================

describe("Vector Optimization Integration", () => {
  it("should canonicalize, deduplicate, optimize, generate sprite", async () => {
    // Given: 50 SVG exports with 20 duplicates
    const svgs: string[] = [];

    // Add unique icons
    const uniqueIcons = getAllIconFixtures();
    for (const [name, svg] of Object.entries(uniqueIcons)) {
      svgs.push(svg);
    }

    // Add duplicates
    for (let i = 0; i < 20; i++) {
      svgs.push(SIMPLE_ICON_DUPLICATE_1);
      svgs.push(SIMPLE_ICON_DUPLICATE_2);
    }

    // When: Running full vector pipeline
    // Step 1: Canonicalize all SVGs
    const canonicalized: CanonicalizedSVG[] = svgs.map((svg) => {
      const { hash, content, original } = canonicalizeSvg(svg);
      return { hash, content, original };
    });

    // Step 2: Deduplicate by hash
    const deduplicationResult: DeduplicationResult = deduplicateSvgs(canonicalized);

    // Step 3: Optimize unique SVGs
    const optimizationResult = optimizeSvgBatch(
      deduplicationResult.uniqueSvgs.map((s) => s.content)
    );

    // Step 4: Generate sprite
    const spritePath = join(context.tempDir, "sprite.svg");
    const spriteResult = await generateSprite(
      deduplicationResult.uniqueSvgs.map((s, i) => ({
        id: `icon-${i}`,
        content: optimizationResult.results[i].optimized,
        viewBox: extractViewBox(optimizationResult.results[i].optimized),
      })),
      { outputPath: spritePath }
    );

    // Then: Deduplication found duplicates, sprite generated
    expect(canonicalized.length).toBeGreaterThan(50);
    expect(deduplicationResult.duplicatesCount).toBeGreaterThan(0);
    expect(spriteResult.success).toBe(true);
    expect(spriteResult.symbolCount).toBe(deduplicationResult.uniqueSvgs.length);
  });

  it("should preserve viewBox throughout pipeline", async () => {
    // Given: SVGs with custom viewBox attributes
    const testSvgs = [
      `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`,
      `<svg viewBox="0 0 100 100"><rect width="50" height="50"/></svg>`,
      `<svg viewBox="-10 -10 120 120"><path d="M10,10 L90,90"/></svg>`,
    ];

    // When: Canonicalize → optimize → deduplicate → sprite
    let viewBoxPreserved = true;

    for (const svg of testSvgs) {
      const canonical = canonicalizeSvg(svg);
      const optimized = optimizeSvg(canonical.content);
      const preserved = verifyViewBoxPreserved(svg, optimized.optimized);
      if (!preserved) {
        viewBoxPreserved = false;
      }
    }

    // Then: viewBox preserved in all outputs
    expect(viewBoxPreserved).toBe(true);
  });

  it("should achieve 50%+ deduplication in icon libraries", async () => {
    // Given: 100 icons from component library
    const icons = getAllIconFixtures();
    const iconList: string[] = [];

    // Create a mix of unique and duplicate icons
    const uniqueCount = Object.keys(icons).length;
    for (const svg of Object.values(icons)) {
      iconList.push(svg);
    }

    // Add many duplicates (simulating common icon reuse)
    for (let i = 0; i < 100 - uniqueCount; i++) {
      const randomIcon = Object.values(icons)[i % uniqueCount];
      iconList.push(randomIcon);
    }

    // When: Running deduplication
    const canonicalized = iconList.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);

    // Then: < 50 unique SVGs identified (50%+ deduplication)
    const deduplicationRate = (result.duplicatesCount / iconList.length) * 100;

    expect(deduplicationRate).toBeGreaterThanOrEqual(50);
    expect(result.uniqueSvgs.length).toBeLessThan(50);
  });

  it("should generate valid sprite with accessible symbols", async () => {
    // Given: Deduplicated SVG set
    const svgs = [
      { id: "home", content: HOME_ICON },
      { id: "settings", content: SETTINGS_ICON },
      { id: "user", content: USER_ICON },
      { id: "search", content: SEARCH_ICON },
    ];

    // When: Generating sprite
    const spritePath = join(context.tempDir, "accessible-sprite.svg");
    const result = await generateSprite(svgs, {
      outputPath: spritePath,
      includeAriaLabels: true,
      generateDocs: true,
    });

    // Then: Valid SVG, symbols usable via <use>, ARIA labels present
    expect(result.success).toBe(true);
    expect(result.symbolCount).toBe(4);

    // Verify sprite file exists and is valid
    const spriteFiles = await countFiles(context.tempDir, [".svg"]);
    expect(spriteFiles).toBeGreaterThan(0);

    // Verify sprite contains symbols
    const spriteContent = await import("node:fs/promises").then((fs) =>
      fs.readFile(result.outputPath, "utf-8")
    );
    expect(spriteContent).toContain("<symbol");
    expect(spriteContent).toContain('id="home"');
    expect(spriteContent).toContain('id="settings"');

    // Check for accessibility features
    expect(spriteContent).toMatch(/aria-label|role="img"/);
  });

  it("should maintain icon quality through optimization", async () => {
    // Given: Complex icon with gradients and effects
    const complexIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#grad1)"/>
      <path d="M50,20 L60,40 L80,40 L65,55 L70,75 L50,65 L30,75 L35,55 L20,40 L40,40 Z" fill="white"/>
    </svg>`;

    // When: Optimizing
    const optimized = optimizeSvg(complexIcon);

    // Then: Structure preserved, significant size reduction
    expect(optimized.originalSize).toBeGreaterThan(0);
    expect(optimized.optimizedSize).toBeGreaterThan(0);
    expect(optimized.bytesSaved).toBeGreaterThan(0);

    // Check key elements preserved
    expect(optimized.optimized).toContain("<defs>");
    expect(optimized.optimized).toContain("<linearGradient");
    expect(optimized.optimized).toContain("<circle");
    expect(optimized.optimized).toContain("<path");
  });
});

// =====================================================
// Test Suite: Canonicalization
// =====================================================

describe("Canonicalization Integration", () => {
  it("should normalize SVG regardless of formatting", async () => {
    // Given: Same SVG with different formatting
    const formatted1 = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;
    const formatted2 = `<svg\n  viewBox="0 0 24 24"\n  xmlns="http://www.w3.org/2000/svg"\n>\n  <circle cx="12" cy="12" r="10" />\n</svg>`;
    const formatted3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;

    // When: Canonicalizing
    const canon1 = canonicalizeSvg(formatted1);
    const canon2 = canonicalizeSvg(formatted2);
    const canon3 = canonicalizeSvg(formatted3);

    // Then: All produce same hash
    expect(canon1.hash).toBe(canon2.hash);
    expect(canon2.hash).toBe(canon3.hash);
  });

  it("should strip Figma metadata while preserving content", async () => {
    // Given: SVG with Figma metadata
    const svgWithMeta = SVG_WITH_METADATA;

    // When: Canonicalizing
    const canonical = canonicalizeSvg(svgWithMeta);

    // Then: Metadata stripped, content preserved
    expect(canonical.content).not.toContain("data-figma-id");
    expect(canonical.content).not.toContain("data-figma-name");
    expect(canonical.content).not.toContain("data-editor-metadata");

    // But actual visual content preserved
    expect(canonical.content).toContain("<rect");
  });

  it("should flatten nested groups for consistent hashing", async () => {
    // Given: SVG with deeply nested groups
    const nestedSvg = SVG_NESTED_GROUPS;

    // When: Canonicalizing
    const canonical = canonicalizeSvg(nestedSvg);

    // Then: Groups preserved but normalized
    expect(canonical.content).toContain("<g");
    expect(canonical.content).toContain("<circle");
    expect(canonical.hash).toBeDefined();
    expect(canonical.hash.length).toBe(64); // SHA-256 hash
  });
});

// =====================================================
// Test Suite: Deduplication
// =====================================================

describe("Deduplication Integration", () => {
  it("should detect exact duplicates regardless of ID", async () => {
    // Given: Identical SVGs with different IDs
    const svgs = [SIMPLE_ICON, SIMPLE_ICON_DUPLICATE_1, SIMPLE_ICON_DUPLICATE_2];

    // When: Deduplicating
    const canonicalized = svgs.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);

    // Then: Found 2 duplicates, 1 unique
    expect(result.uniqueSvgs.length).toBe(1);
    expect(result.duplicatesCount).toBe(2);
    expect(result.spaceSavings).toBeGreaterThan(0);
  });

  it("should group identical SVGs by hash", async () => {
    // Given: Multiple groups of duplicates
    const svgs = [
      HOME_ICON,
      HOME_ICON, // Duplicate
      SETTINGS_ICON,
      USER_ICON,
      USER_ICON, // Duplicate
      USER_ICON, // Third duplicate
      SEARCH_ICON,
    ];

    // When: Deduplicating
    const canonicalized = svgs.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);

    // Then: Proper groups created
    expect(result.uniqueSvgs.length).toBe(4); // 4 unique icons
    expect(result.duplicatesCount).toBe(3); // 3 duplicates total
    expect(result.groups.length).toBe(4); // 4 groups
  });

  it("should calculate accurate space savings", async () => {
    // Given: Set with many duplicates
    const svgs: string[] = [];
    const uniqueIcon = SIMPLE_ICON;

    // 1 unique, 20 duplicates
    svgs.push(uniqueIcon);
    for (let i = 0; i < 20; i++) {
      svgs.push(SIMPLE_ICON_DUPLICATE_1);
    }

    // When: Calculating savings
    const canonicalized = svgs.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);

    // Then: Significant savings reported
    const originalSize = svgs.reduce((sum, svg) => sum + svg.length, 0);
    const uniqueSize = result.uniqueSvgs.reduce((sum, s) => sum + s.content.length, 0);
    const expectedSavings = originalSize - uniqueSize;

    expect(result.spaceSavings).toBeCloseTo(expectedSavings, 0);
  });
});

// =====================================================
// Test Suite: Sprite Generation
// =====================================================

describe("Sprite Generation Integration", () => {
  it("should generate sprite with all symbols", async () => {
    // Given: Set of SVG icons
    const icons = getAllIconFixtures();
    const spriteInputs = Object.entries(icons).map(([id, content]) => ({
      id,
      content,
      viewBox: extractViewBox(content),
    }));

    // When: Generating sprite
    const spritePath = join(context.tempDir, "all-icons.svg");
    const result = await generateSprite(spriteInputs, {
      outputPath: spritePath,
    });

    // Then: All icons included
    expect(result.success).toBe(true);
    expect(result.symbolCount).toBe(Object.keys(icons).length);
    expect(result.symbolIds).toHaveLength(Object.keys(icons).length);
  });

  it("should generate usage documentation", async () => {
    // Given: Sprite generation with docs
    const icons = [
      { id: "home", content: HOME_ICON, viewBox: "0 0 24 24" },
      { id: "settings", content: SETTINGS_ICON, viewBox: "0 0 24 24" },
    ];

    const spritePath = join(context.tempDir, "doc-sprite.svg");
    const docsPath = join(context.tempDir, "sprite-docs.md");

    // When: Generating with documentation
    const result = await generateSprite(icons, {
      outputPath: spritePath,
      docsPath,
      generateDocs: true,
    });

    // Then: Documentation file created
    expect(result.success).toBe(true);

    // Verify docs exist (if generateDocs worked)
    const docFiles = await countFiles(context.tempDir, [".md"]);
    expect(docFiles).toBeGreaterThan(0);
  });

  it("should validate existing sprite file", async () => {
    // Given: Manually create a valid sprite
    const spritePath = join(context.tempDir, "manual-sprite.svg");
    const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg">
      <symbol id="test-icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
      </symbol>
    </svg>`;
    await writeFile(spritePath, spriteContent, "utf-8");

    // When: Validating
    const { isValidSprite, symbolCount } = await import("../../vectors/sprite-generator.js").then((m) =>
      m.isValidSpriteFile(spriteContent)
    );

    // Then: Valid sprite detected
    expect(isValidSprite).toBe(true);
    expect(symbolCount).toBe(1);
  });
});

// =====================================================
// Test Suite: Performance
// =====================================================

describe("Vector Optimization Performance", () => {
  it("should optimize 100 SVGs in <5s", async () => {
    const marker = createPerformanceMarker("optimize-100-svg");

    // Given: 100 SVG icons
    const icons = getAllIconFixtures();
    const svgs: string[] = [];

    for (let i = 0; i < 100; i++) {
      const randomIcon = Object.values(icons)[i % Object.keys(icons).length];
      svgs.push(randomIcon);
    }

    // When: Optimizing batch
    const result = optimizeSvgBatch(svgs);
    const duration = marker.elapsed();

    // Then: <50ms average per SVG
    expect(result.results.length).toBe(100);
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(duration / 100).toBeLessThan(50); // <50ms per SVG
  });

  it("should deduplicate 200 SVGs in <2s", async () => {
    const marker = createPerformanceMarker("deduplicate-200-svg");

    // Given: 200 SVGs with many duplicates
    const icons = getAllIconFixtures();
    const svgs: string[] = [];

    for (let i = 0; i < 200; i++) {
      const randomIcon = Object.values(icons)[i % Object.keys(icons).length];
      svgs.push(randomIcon);
    }

    // When: Deduplicating
    const canonicalized = svgs.map((svg) => canonicalizeSvg(svg));
    const result = deduplicateSvgs(canonicalized);
    const duration = marker.elapsed();

    // Then: <10ms average per SVG
    expect(result.uniqueSvgs.length).toBeLessThan(200);
    expect(duration).toBeLessThan(2000); // 2 seconds
    expect(duration / 200).toBeLessThan(10); // <10ms per SVG
  });

  it("should meet 30% size reduction target", async () => {
    // Given: SVGs with lots of metadata
    const svgs = Array.from({ length: 20 }, () => SVG_WITH_METADATA);

    // When: Optimizing
    const results = optimizeSvgBatch(svgs);

    // Then: Meet reduction target
    const totalOriginal = results.results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimized = results.results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const reduction = ((totalOriginal - totalOptimized) / totalOriginal) * 100;

    expect(reduction).toBeGreaterThan(30);
  });
});

// =====================================================
// Helper Functions
// =====================================================

function extractViewBox(svg: string): string {
  const match = svg.match(/viewBox="([^"]+)"/);
  return match ? match[1] : "0 0 24 24";
}
