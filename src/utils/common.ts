/**
 * Common utility functions
 */

/**
 * Check if an element is visible
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
