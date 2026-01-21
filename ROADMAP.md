# figma-skill Roadmap

This roadmap outlines planned improvements and features for the figma-skill package. Items are organized by development phases and effort levels.

## Overview

figma-skill is a TypeScript package for extracting and processing Figma designs, optimized for AI coding assistant workflows. The package provides token-efficient TOON format, streaming API for large files, and modular extraction pipelines.

## Core Feature Enhancements 🚀

_High impact, foundational improvements_

### Advanced Extraction Capabilities (High Priority)

- [ ] **Variable mode support** for Enterprise plans
  - [ ] Add `getVariables(fileKey)` method using `/v1/variables` endpoint
  - [ ] Extract variable collections and modes
  - [ ] Resolve variable references in extracted nodes
- [ ] **Style extraction** using `/v1/styles/:key` endpoint
  - [ ] Export named styles (text, color, effect, grid)
  - [ ] Link styles to nodes for easier identification
  - [ ] Style-based grouping and filtering
- [ ] **Component metadata enhancement**
  - [ ] Extract variant properties and values
  - [ ] Return component set definitions
  - [ ] Instance-only mode (overridden values only)

### Image & Asset Handling

> **Detailed Plan**: [`plans/improve-asset-handling.md`](./plans/improve-asset-handling.md)

- [ ] **Improved mask/crop handling** (Phase 1)
  - [ ] Mask detection: `isMask` sibling stencil relationship detection
  - [ ] SVG matte compositing with `dest-in` blend mode for VECTOR masks
  - [ ] Luminance mask support using grayscale alpha extraction
  - [ ] Coordinate space alignment for mask/target bounding boxes
  - [ ] Effective render bounds calculation (whitespace elimination)
  - [ ] Nested mask support (2+ levels)
- [ ] **Smart format detection** (Phase 2)
  - [ ] Entropy-based content analysis (photo vs graphic detection)
  - [ ] Transparency gate using `sharp.stats().isOpaque`
  - [ ] Palette size analysis for PNG-8 eligibility
  - [ ] Format-specific optimization (JPEG chroma subsampling, WebP smartSubsample)
  - [ ] Auto-conversion pipeline with recommendation engine
- [ ] **Batch processing & concurrency** (Phase 3)
  - [ ] p-limit controlled concurrency (match CPU count)
  - [ ] Sharp cache management (disable for one-pass pipelines)
  - [ ] Memory-aware batch processing (stable heap usage)
  - [ ] Download-process integrated pipeline
  - [ ] Stream-based processing for 1000+ image datasets
- [ ] **Vector optimization** (Phase 4)
  - [ ] SVG canonicalization (remove IDs, sort attributes, normalize)
  - [ ] Content-addressable deduplication (SHA-256 hashing)
  - [ ] SVGO integration with Figma-safe config (preserve viewBox)
  - [ ] Sprite sheet generation with `<symbol>` syntax
  - [ ] Icon set consolidation

### Transformer Enhancements

- [ ] **Layout detection**
  - [ ] Auto-detect flex vs grid layouts
  - [ ] Wrapped layout recognition
  - [ ] Percentage-based width suggestions
- [ ] **Style deduplication**
  - [ ] Global style extraction from common patterns
  - [ ] Design token generation
  - [ ] CSS variable naming strategies
- [ ] **Advanced gradient support**
  - [ ] Complex gradient export (linear, radial, angular, diamond)
  - [ ] Gradient position calculations
  - [ ] Fallback for unsupported gradient types

## Developer Experience 🛠️

_Improving usability and integration_

### Performance & Reliability

- [x] **Retry logic** for API failures
- [x] **Automatic pagination** for large files
- [ ] **Progress events** for all long-running operations
- [ ] **Cancellation tokens** for streaming operations
- [ ] **Resource cleanup** on abort/error

### Error Handling

- [x] **Comprehensive error types** (`FigmaApiError` with message checking)
- [ ] **Error recovery suggestions** in error messages
- [ ] **Retry-after header** parsing for rate limits
- [ ] **Detailed debug mode** with request/response logging

## Documentation & Testing 📚

- [ ] **Unit test coverage**
  - [ ] Client methods (`getFile`, `getNodes`, `downloadImages`)
  - [ ] All transformers (layout, text, style, effects, components)
  - [ ] Extractor pipeline and custom extractors
  - [ ] Error handling scenarios
  - [ ] **Target: >80% coverage**
- [ ] **Integration tests**
  - [ ] Mock Figma API server
  - [ ] End-to-end extraction workflows
  - [ ] Streaming functionality tests
  - [ ] Image processing tests
- [ ] **API documentation**
  - [ ] Complete JSDoc coverage for public APIs

## Performance ⚡

- [ ] **Benchmarking suite**
  - [ ] Extraction speed benchmarks
  - [ ] Memory usage profiling
  - [ ] Cache efficiency tracking
  - [ ] Comparison charts (with/without caching)
- [ ] **Optimization targets**
  - [ ] API Latency (p95): <500ms ✅
  - [ ] Extraction Speed: 1000 nodes/100ms ✅
  - [ ] Memory Usage: <10MB per 1000 nodes ✅
  - [ ] TOON compression: 30-60% size reduction ✅
- [ ] **Memory optimization**
  - [ ] Streaming for all large data structures
  - [ ] Weak references for cached data
  - [ ] Chunked processing options

## Enterprise Features 🏢

_Features for scaling and enterprise adoption_

### Authentication & Security

- [ ] **Token management**
  - [ ] Secure token loading from env files
- [ ] **Team-specific access**
  - [ ] Permission-aware error messages

### Batch Operations

- [ ] **Multi-file processing**
  - [ ] Batch extraction from file lists
  - [ ] Parallel file processing with rate limiting
  - [ ] Aggregated progress reporting
- [ ] **Design system extraction**
  - [ ] Style guide generation
  - [ ] Asset catalog creation

## Quick Wins 🎪

_Low effort, high impact_

- [ ] **TypeScript strict mode** - Enable stricter type checking
- [ ] **ESLint configuration** - Consistent code style
- [ ] **Prettier integration** - Automated formatting

## Technical Debt 🧹

_Code quality and maintenance_

- [ ] **Standardize error handling** across all services
- [ ] **Type safety improvements** (reduce `any` usage)
- [ ] **Deprecation warnings** for old API patterns
- [ ] **Version documentation** (CHANGELOG.md)
- [ ] **Dependency updates** (regular security audits)

## Research & Exploration 🔬

_Investigate feasibility / value_

- [ ] **Alternative formats**
  - [ ] Tailwind CSS conversion
- [ ] **AI optimizations**
  - [ ] LLM-specific data structures
  - [ ] Token-efficient node representations
  - [ ] Context-aware compression
- [ ] **Design system integration**
  - [ ] Token extraction and mapping
  - [ ] Component dependency graphs

## Version Plans

### v0.2.0 - Variable & Style Support

- Variable mode extraction (Enterprise)
- Named style extraction
- Enhanced component metadata

### v0.3.0 - Enhanced Transformations

> **Implementation Plan**: [`plans/improve-asset-handling.md`](./plans/improve-asset-handling.md)

- Advanced layout detection
- Smart format detection (entropy-based, transparency-aware)
- Improved mask/crop handling (SVG matte compositing)
- Vector optimization (deduplication, SVGO, sprites)
- Batch processing with concurrency control

### v0.4.0 - CLI Tool

- Standalone CLI binary
- Common command shortcuts
- Configuration file support

### v1.0.0 - Production Ready

- 80%+ test coverage
- Complete API documentation
- Integration test suite
- Performance benchmarks

## Contributing

We welcome contributions! Please check the issues labeled with "good first issue" or "help wanted". For major features, please open an issue first to discuss the implementation approach.

### Priority Areas for Community Contributions

1. **Test coverage** - Write unit tests for uncovered modules
2. **Documentation** - Improve examples and API docs
3. **Transformers** - Add new transformation utilities
4. **Extractors** - Create specialized extractors for specific use cases

---

_This roadmap is subject to change based on community feedback and priorities. Last updated: January 22, 2026_
