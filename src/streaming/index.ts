/**
 * Streaming module - Async iterator support for large designs
 *
 * This module provides streaming functionality for processing large Figma designs
 * with 10,000+ nodes efficiently using chunk-based processing and progress events.
 */

// Progress emitter
export { ProgressEmitter, type ProgressEvents } from "./progress-emitter";

// File streaming
export {
  FileStreamer,
  streamFile,
  type FileStreamConfig,
  type FileStreamResult,
} from "./file-streamer";

// Node streaming
export {
  NodeStreamer,
  streamNodes,
  type NodeStreamConfig,
  type NodeStreamResult,
} from "./node-streamer";

// Re-export stream types from main types
export type { StreamProgress, StreamChunk } from "@/types/index";
