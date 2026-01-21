/**
 * Style transformer - convert Figma paints to CSS-compatible formats
 * Matches mcp-reference/src/transformers/style.ts
 */
import type {
  Node,
  Paint,
  RGBA,
  Transform,
  Vector,
} from "@figma/rest-api-spec";

import { hasValue } from "@/utils/common";

// =====================================================
// Type Definitions (matching mcp-reference)
// =====================================================

/**
 * CSS rgba() color format
 */
export type CSSRGBAColor = `rgba(${number}, ${number}, ${number}, ${number})`;

/**
 * CSS hex color format
 */
export type CSSHexColor = `#${string}`;

/**
 * Color value with hex and opacity
 */
export type ColorValue = {
  hex: CSSHexColor;
  opacity: number;
};

/**
 * Simplified image fill with CSS properties
 */
export type SimplifiedImageFill = {
  type: "IMAGE";
  imageRef: string;
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH";
  scalingFactor?: number;
  backgroundSize?: string;
  backgroundRepeat?: string;
  isBackground?: boolean;
  objectFit?: string;
  imageDownloadArguments?: {
    needsCropping: boolean;
    requiresImageDimensions: boolean;
    cropTransform?: Transform;
    filenameSuffix?: string;
  };
};

/**
 * Simplified gradient fill with CSS gradient
 */
export type SimplifiedGradientFill = {
  type:
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND";
  gradient: string;
};

/**
 * Simplified pattern fill
 * Updated to match Figma's PatternPaint type
 */
export type SimplifiedPatternFill = {
  type: "PATTERN";
  sourceNodeId: string;
  tileType: "RECTANGULAR" | "HORIZONTAL_HEXAGONAL" | "VERTICAL_HEXAGONAL";
  scalingFactor: number;
  spacing: { x: number; y: number };
  horizontalAlignment: "START" | "CENTER" | "END";
  verticalAlignment: "START" | "CENTER" | "END";
};

/**
 * Union of all fill types
 */
export type SimplifiedFill =
  | SimplifiedImageFill
  | SimplifiedGradientFill
  | SimplifiedPatternFill
  | CSSRGBAColor
  | CSSHexColor;
export type SimplifiedStroke = {
  colors?: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};
export type SimplifiedStrokes = {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
};

// =====================================================
// Color Utilities
// =====================================================

/**
 * Convert Figma color to hex format
 * Matches mcp-reference: figmaToHex
 * Prefixed with _ as it's reserved for future use (ColorValue type)
 */
function _figmaToHex(color: RGBA): CSSHexColor {
  const toHex = (n: number): string => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}` as CSSHexColor;
}

/**
 * Format Figma color to CSS rgba() format
 * Matches mcp-reference: formatRGBAColor
 */
export function formatRGBAColor(color: RGBA, opacity?: number): CSSRGBAColor {
  const a = opacity ?? color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})` as CSSRGBAColor;
}

// =====================================================
// Gradient Conversion
// =====================================================

/**
 * Convert gradient handle positions to CSS angle
 * Matches mcp-reference pattern
 */
function gradientHandlesToAngle(handles: Vector[]): number {
  if (handles.length < 2) return 0;

  const [start, end] = handles;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Convert to CSS gradient angle (0deg = up, 90deg = right)
  return (angle + 90) % 360;
}

/**
 * Convert Figma gradient stops to CSS gradient string
 */
function buildGradientString(
  paint: Extract<
    Paint,
    {
      type:
        | "GRADIENT_LINEAR"
        | "GRADIENT_RADIAL"
        | "GRADIENT_ANGULAR"
        | "GRADIENT_DIAMOND";
    }
  >
): string {
  const stops = paint.gradientStops
    ?.map((stop) => {
      const color = formatRGBAColor(stop.color, stop.color?.a);
      const position = stop.position ? `${stop.position * 100}%` : "0%";
      return `${color} ${position}`;
    })
    .join(", ");

  if (paint.type === "GRADIENT_LINEAR" && paint.gradientHandlePositions) {
    const angle = gradientHandlesToAngle(paint.gradientHandlePositions);
    return `linear-gradient(${angle}deg, ${stops})`;
  }

  if (paint.type === "GRADIENT_RADIAL") {
    return `radial-gradient(circle, ${stops})`;
  }

  // For ANGULAR and DIAMOND, use conic gradient (simplified)
  if (paint.type === "GRADIENT_ANGULAR") {
    return `conic-gradient(from 0deg, ${stops})`;
  }

  // Fallback for DIAMOND - use linear with simplified approach
  return `linear-gradient(45deg, ${stops})`;
}

// =====================================================
// Paint Parsing
// =====================================================

/**
 * Parse a single paint to simplified format
 * Matches mcp-reference: parsePaint
 */
export function parsePaint(
  paint: Paint,
  forContainer: boolean
): SimplifiedFill {
  // Skip invisible paints
  if (paint.visible === false) {
    return "#00000000" as CSSHexColor;
  }

  // Solid color
  if (paint.type === "SOLID") {
    return formatRGBAColor(paint.color, paint.opacity);
  }

  // Gradient types
  if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    return {
      type: paint.type,
      gradient: buildGradientString(
        paint as Extract<
          Paint,
          | { type: "GRADIENT_LINEAR" }
          | { type: "GRADIENT_RADIAL" }
          | { type: "GRADIENT_ANGULAR" }
          | { type: "GRADIENT_DIAMOND" }
        >
      ),
    } as SimplifiedGradientFill;
  }

  // Image fill
  if (paint.type === "IMAGE") {
    const scaleMode = paint.scaleMode ?? "FILL";
    const result: SimplifiedImageFill = {
      type: "IMAGE",
      imageRef: paint.imageRef ?? "",
      scaleMode,
    };

    // Add CSS properties based on scale mode
    if (scaleMode === "FILL") {
      result.backgroundSize = "cover";
      result.objectFit = "cover";
    } else if (scaleMode === "FIT") {
      result.backgroundSize = "contain";
      result.objectFit = "contain";
    } else if (scaleMode === "TILE") {
      result.backgroundRepeat = "repeat";
      result.backgroundSize = "auto";
      // Note: TILE mode may need cropping for proper display
      result.imageDownloadArguments = {
        needsCropping: !forContainer,
        requiresImageDimensions: true,
      };
    } else if (scaleMode === "STRETCH") {
      result.backgroundSize = "100% 100%";
      result.objectFit = "fill";
    }

    result.isBackground = !forContainer;
    return result;
  }

  // Pattern fill (PATTERN type in Figma)
  if (paint.type === "PATTERN") {
    const pattern = paint as Extract<Paint, { type: "PATTERN" }>;
    return {
      type: "PATTERN",
      sourceNodeId: pattern.sourceNodeId,
      tileType: pattern.tileType,
      scalingFactor: pattern.scalingFactor,
      spacing: pattern.spacing,
      horizontalAlignment: pattern.horizontalAlignment,
      verticalAlignment: pattern.verticalAlignment,
    } as SimplifiedPatternFill;
  }

  // Unknown type - return transparent
  return "#00000000" as CSSHexColor;
}

/**
 * Build simplified strokes from a node
 */
export function buildSimplifiedStrokes(
  node: Node,
  _hasChildren: boolean
): SimplifiedStrokes {
  if (
    !hasValue("strokes", node) ||
    !Array.isArray(node.strokes) ||
    node.strokes.length === 0
  ) {
    return { colors: [] };
  }

  const colors = node.strokes
    .filter((p) => p.visible !== false)
    .map((p) => parsePaint(p, false));

  const result: SimplifiedStrokes = { colors };

  if (colors.length > 0) {
    if (
      hasValue("strokeWeight", node) &&
      typeof node.strokeWeight === "number"
    ) {
      result.strokeWeight = `${node.strokeWeight}px`;
    }

    if (hasValue("strokeDashes", node) && Array.isArray(node.strokeDashes)) {
      result.strokeDashes = node.strokeDashes;
    }

    // Individual stroke weights for rectangle nodes
    if (
      hasValue("strokeWeights", node) &&
      typeof node.strokeWeights === "object"
    ) {
      const weights = node.strokeWeights as {
        top: number;
        right: number;
        bottom: number;
        left: number;
      } | null;
      if (weights) {
        const { top, right, bottom, left } = weights;
        result.strokeWeights = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
  }

  return result;
}
