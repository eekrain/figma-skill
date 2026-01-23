/**
 * Grid detector - Detects layout grids for positioning instances
 *
 * Analyzes instance positions to detect regular patterns:
 * 1. Analyzes x,y positions of instances
 * 2. Detects regular spacing patterns
 * 3. Generates grid definitions for layout
 */

import type { CompressedInstance, LayoutGrid } from "./types";

/**
 * Grid detection result
 */
export interface GridDetectionResult {
  /** Detected grid or null if no pattern found */
  grid: LayoutGrid | null;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Configuration for grid detection
 */
interface GridDetectionConfig {
  /** Minimum instances to attempt grid detection */
  minInstances?: number;
  /** Tolerance for position variation (default: 5px) */
  tolerance?: number;
  /** Minimum confidence to accept grid (default: 0.8) */
  minConfidence?: number;
}

/**
 * Detects a layout grid from instance positions
 *
 * @param instances - Compressed instances to analyze
 * @param config - Detection configuration
 * @returns Grid detection result
 */
export function detectGridLayout(
  instances: CompressedInstance[],
  config: GridDetectionConfig = {}
): GridDetectionResult {
  const minInstances = config.minInstances ?? 4;
  const tolerance = config.tolerance ?? 5;
  const minConfidence = config.minConfidence ?? 0.8;

  if (instances.length < minInstances) {
    return { grid: null, confidence: 0 };
  }

  // Filter instances with layout data
  const withLayout = instances.filter((i) => i.layoutData);
  if (withLayout.length < minInstances) {
    return { grid: null, confidence: 0 };
  }

  // Try to detect patterns
  const rowGrid = tryDetectRowGrid(withLayout, tolerance);
  if (rowGrid.grid && rowGrid.confidence >= minConfidence) {
    return rowGrid;
  }

  const columnGrid = tryDetectColumnGrid(withLayout, tolerance);
  if (columnGrid.grid && columnGrid.confidence >= minConfidence) {
    return columnGrid;
  }

  const matrixGrid = tryDetectMatrixGrid(withLayout, tolerance);
  if (matrixGrid.grid && matrixGrid.confidence >= minConfidence) {
    return matrixGrid;
  }

  return { grid: null, confidence: 0 };
}

/**
 * Tries to detect a horizontal row layout
 */
function tryDetectRowGrid(
  instances: CompressedInstance[],
  tolerance: number
): GridDetectionResult {
  // Check if all y positions are similar
  const yPositions = instances.map((i) => i.layoutData!.y);
  const avgY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
  const yVariance = Math.max(
    ...yPositions.map((y) => Math.abs(y - avgY))
  );

  if (yVariance > tolerance) {
    return { grid: null, confidence: 0 };
  }

  // Sort by x position
  const sorted = [...instances].sort(
    (a, b) => a.layoutData!.x - b.layoutData!.x
  );

  // Detect consistent horizontal spacing
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(
      sorted[i].layoutData!.x -
        (sorted[i - 1].layoutData!.x + sorted[i - 1].layoutData!.width)
    );
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const gapVariance =
    gaps.reduce((sum, gap) => sum + Math.abs(gap - avgGap), 0) / gaps.length;

  const confidence = 1 - Math.min(gapVariance / (avgGap || 1), 1);

  const grid: LayoutGrid = {
    id: `grid_row_${Date.now()}`,
    name: "Row Layout",
    columns: sorted.length,
    rows: 1,
    columnWidth: sorted[0]?.layoutData?.width,
    rowHeight: sorted[0]?.layoutData?.height,
    gapX: avgGap,
    gapY: 0,
    positions: {},
  };

  // Assign positions
  for (let i = 0; i < sorted.length; i++) {
    grid.positions[sorted[i].id] = { column: i, row: 0 };
  }

  return { grid, confidence };
}

/**
 * Tries to detect a vertical column layout
 */
function tryDetectColumnGrid(
  instances: CompressedInstance[],
  tolerance: number
): GridDetectionResult {
  // Check if all x positions are similar
  const xPositions = instances.map((i) => i.layoutData!.x);
  const avgX = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
  const xVariance = Math.max(
    ...xPositions.map((x) => Math.abs(x - avgX))
  );

  if (xVariance > tolerance) {
    return { grid: null, confidence: 0 };
  }

  // Sort by y position
  const sorted = [...instances].sort(
    (a, b) => a.layoutData!.y - b.layoutData!.y
  );

  // Detect consistent vertical spacing
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(
      sorted[i].layoutData!.y -
        (sorted[i - 1].layoutData!.y + sorted[i - 1].layoutData!.height)
    );
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const gapVariance =
    gaps.reduce((sum, gap) => sum + Math.abs(gap - avgGap), 0) / gaps.length;

  const confidence = 1 - Math.min(gapVariance / (avgGap || 1), 1);

  const grid: LayoutGrid = {
    id: `grid_column_${Date.now()}`,
    name: "Column Layout",
    columns: 1,
    rows: sorted.length,
    columnWidth: sorted[0]?.layoutData?.width,
    rowHeight: sorted[0]?.layoutData?.height,
    gapX: 0,
    gapY: avgGap,
    positions: {},
  };

  // Assign positions
  for (let i = 0; i < sorted.length; i++) {
    grid.positions[sorted[i].id] = { column: 0, row: i };
  }

  return { grid, confidence };
}

/**
 * Tries to detect a matrix/grid layout
 */
function tryDetectMatrixGrid(
  instances: CompressedInstance[],
  tolerance: number
): GridDetectionResult {
  // Sort by y, then x
  const sorted = [...instances].sort(
    (a, b) =>
      a.layoutData!.y - b.layoutData!.y ||
      a.layoutData!.x - b.layoutData!.x
  );

  // Try to determine number of columns
  // Find the first "row" by looking at y clusters
  const yPositions = sorted.map((i) => i.layoutData!.y);
  const firstY = yPositions[0];
  const yTolerance = tolerance;

  const firstRow = sorted.filter(
    (i) => Math.abs(i.layoutData!.y - firstY) <= yTolerance
  );

  if (firstRow.length < 2) {
    return { grid: null, confidence: 0 };
  }

  const columns = firstRow.length;
  const rows = Math.ceil(sorted.length / columns);

  // Calculate spacing
  const avgWidth =
    firstRow.reduce((sum, i) => sum + i.layoutData!.width, 0) /
    firstRow.length;
  const avgHeight =
    sorted.reduce((sum, i) => sum + i.layoutData!.height, 0) /
    sorted.length;

  // Estimate gaps
  const gapX =
    firstRow.length > 1
      ? firstRow[1].layoutData!.x -
        (firstRow[0].layoutData!.x + firstRow[0].layoutData!.width)
      : 0;

  let gapY = 0;
  if (sorted.length > columns) {
    gapY =
      sorted[columns].layoutData!.y -
      (sorted[0].layoutData!.y + sorted[0].layoutData!.height);
  }

  // Validate grid structure
  let validPositions = 0;
  const grid: LayoutGrid = {
    id: `grid_matrix_${Date.now()}`,
    name: "Grid Layout",
    columns,
    rows,
    columnWidth: avgWidth,
    rowHeight: avgHeight,
    gapX,
    gapY,
    positions: {},
  };

  for (let i = 0; i < sorted.length; i++) {
    const expectedRow = Math.floor(i / columns);
    const expectedCol = i % columns;

    const expectedX =
      firstRow[0].layoutData!.x +
      expectedCol * (avgWidth + gapX);
    const expectedY =
      sorted[0].layoutData!.y +
      expectedRow * (avgHeight + gapY);

    const actualX = sorted[i].layoutData!.x;
    const actualY = sorted[i].layoutData!.y;

    if (
      Math.abs(actualX - expectedX) <= tolerance &&
      Math.abs(actualY - expectedY) <= tolerance
    ) {
      validPositions++;
      grid.positions[sorted[i].id] = {
        column: expectedCol,
        row: expectedRow,
      };
    }
  }

  const confidence = validPositions / sorted.length;

  if (confidence < 0.8) {
    return { grid: null, confidence };
  }

  return { grid, confidence };
}

/**
 * Applies a layout grid to instances
 *
 * @param instances - Instances to apply grid to
 * @param grid - Grid definition
 * @returns Instances with layout references
 */
export function applyGridLayout(
  instances: CompressedInstance[],
  grid: LayoutGrid
): CompressedInstance[] {
  return instances.map((instance) => {
    const position = grid.positions[instance.id];
    if (position) {
      return {
        ...instance,
        layout: grid.id,
      };
    }
    return instance;
  });
}

/**
 * Generates CSS for a layout grid
 *
 * @param grid - Grid definition
 * @returns CSS string
 */
export function gridToCSS(grid: LayoutGrid): string {
  const lines: string[] = [];

  lines.push(`.${grid.id.replace(/[^a-z0-9]/gi, "_")} {`);
  lines.push("  display: grid;");
  lines.push(`  grid-template-columns: repeat(${grid.columns}, ${
    grid.columnWidth ? `${grid.columnWidth}px` : "1fr"
  });`);
  lines.push(`  grid-template-rows: repeat(${grid.rows}, ${
    grid.rowHeight ? `${grid.rowHeight}px` : "auto"
  });`);
  if (grid.gapX && grid.gapY) {
    lines.push(`  gap: ${grid.gapY}px ${grid.gapX}px;`);
  } else if (grid.gapX) {
    lines.push(`  column-gap: ${grid.gapX}px;`);
  } else if (grid.gapY) {
    lines.push(`  row-gap: ${grid.gapY}px;`);
  }
  lines.push("}");

  return lines.join("\n");
}
