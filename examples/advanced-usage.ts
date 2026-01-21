/**
 * Advanced usage example - using transformers and custom extractors
 */
import type { Node } from "@figma/rest-api-spec";

import { buildSimplifiedLayout } from "../src/transformers/layout.js";
import { parsePaint } from "../src/transformers/style.js";
import { extractNodeText, extractTextStyle } from "../src/transformers/text.js";
import type {
  ExtractorFn,
  SimplifiedNode,
  TraversalContext,
} from "../src/types/index.js";

// Example 1: Use transformers directly
function exampleTransformers() {
  // Simplified mock node for demonstration
  const mockNode = {
    id: "1:1",
    name: "Test",
    type: "FRAME",
    visible: true,
    children: [],
    layoutMode: "HORIZONTAL",
    isFixed: false,
    strokeAlign: "CENTER",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    primaryAxisSizingMode: "FIXED",
    counterAxisSizingMode: "FIXED",
    layoutAlign: "MIN",
    layoutGrow: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    itemSpacing: 0,
    clipsContent: false,
    strokesIncludedInLayout: true,
    counterAxisSpacing: 0,
  } as Node;

  // Extract layout
  const layout = buildSimplifiedLayout(mockNode);
  console.log("Layout:", layout);

  // Extract text if it's a text node
  const text = extractNodeText(mockNode);
  console.log("Text:", text);

  // Extract text style
  const textStyle = extractTextStyle(mockNode);
  console.log("Text Style:", textStyle);

  // Parse paint colors
  const paint = {
    type: "SOLID" as const,
    visible: true,
    opacity: 1,
    blendMode: "NORMAL" as const,
    color: { r: 1, g: 0, b: 0, a: 1 },
  };
  const color = parsePaint(paint, false);
  console.log("Color:", color);
}

// Example 2: Create a custom extractor
const customExtractor: ExtractorFn = (
  node: Node,
  result: SimplifiedNode,
  context: TraversalContext
) => {
  // Extract custom metadata
  if (node.type === "COMPONENT") {
    (result as { componentId?: string }).componentId = node.id;
  }

  // Add custom processing based on depth
  if (context.currentDepth > 5) {
    // Skip deep nodes
    return;
  }

  // Extract custom properties
  if (
    "description" in node &&
    typeof node.description === "string" &&
    node.description
  ) {
    (result as { description?: string }).description = node.description;
  }
};

// Example 3: Using custom extractors with the client
async function _exampleCustomExtractors() {
  const { FigmaExtractor } = await import("../src/index.js");

  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  const design = await figma.getFile("your-file-key", {
    extractors: [customExtractor],
  });

  console.log("Custom extraction:", design.nodes);
}

// Example 4: Filter nodes by type
async function _exampleNodeFilter() {
  const { FigmaExtractor } = await import("../src/index.js");

  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  // Only extract frames and components
  const design = await figma.getFile("your-file-key", {
    nodeFilter: (node) => node.type === "FRAME" || node.type === "COMPONENT",
  });

  console.log("Filtered design:", design.nodes);
}

// Example 5: Limit depth
async function _exampleDepthLimit() {
  const { FigmaExtractor } = await import("../src/index.js");

  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN || "your-token-here",
  });

  // Only traverse 2 levels deep
  const design = await figma.getFile("your-file-key", {
    maxDepth: 2,
  });

  console.log("Depth-limited design:", design.nodes);
}

// Run examples
exampleTransformers();
