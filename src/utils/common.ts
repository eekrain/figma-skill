/**
 * Common utility functions
 * Matches mcp-reference/src/utils/common.ts
 */

export type StyleId = `${string}_${string}` & { __brand: "StyleId" };

/**
 * Generate a 6-character random variable ID
 * Matches mcp-reference: generateVarId
 */
export function generateVarId(prefix: string = "var"): StyleId {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${result}` as StyleId;
}

/**
 * Generate CSS shorthand for TRBL values
 * Matches mcp-reference: generateCSSShorthand
 */
export function generateCSSShorthand(
  values: { top: number; right: number; bottom: number; left: number },
  { ignoreZero = true, suffix = "px" } = {}
): string | undefined {
  const { top, right, bottom, left } = values;
  if (ignoreZero && top === 0 && right === 0 && bottom === 0 && left === 0) {
    return undefined;
  }
  if (top === right && right === bottom && bottom === left) {
    return `${top}${suffix}`;
  }
  if (right === left) {
    if (top === bottom) {
      return `${top}${suffix} ${right}${suffix}`;
    }
    return `${top}${suffix} ${right}${suffix} ${bottom}${suffix}`;
  }
  return `${top}${suffix} ${right}${suffix} ${bottom}${suffix} ${left}${suffix}`;
}

/**
 * Check if an element is visible
 * Matches mcp-reference: isVisible
 */
export function isVisible(element: { visible?: boolean }): boolean {
  return element.visible ?? true;
}

/**
 * Check if value is truthy (remeda-style)
 */
export function isTruthy(val: unknown): boolean {
  return val !== undefined && val !== null;
}

/**
 * Check if object has a specific key with optional type guard
 */
export function hasValue<K extends PropertyKey, T>(
  key: K,
  obj: unknown,
  typeGuard?: (val: unknown) => val is T
): obj is Record<K, T> {
  const isObject = typeof obj === "object" && obj !== null;
  if (!isObject || !(key in obj)) return false;
  const val = (obj as Record<K, unknown>)[key];
  return typeGuard ? typeGuard(val) : val !== undefined;
}

/**
 * Round to 2 decimals for pixel values
 * Matches mcp-reference: pixelRound
 */
export function pixelRound(num: number): number {
  if (isNaN(num)) throw new TypeError(`Input must be a valid number`);
  return Number(Number(num).toFixed(2));
}

/**
 * Remove empty keys from objects
 * Matches mcp-reference: removeEmptyKeys
 */
export function removeEmptyKeys<T>(input: T): T {
  if (typeof input !== "object" || input === null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => removeEmptyKeys(item)) as T;
  }
  const result = {} as T;
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = removeEmptyKeys(input[key]);
      if (
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0) &&
        !(
          typeof value === "object" &&
          value !== null &&
          Object.keys(value).length === 0
        )
      ) {
        result[key] = value;
      }
    }
  }
  return result;
}
