/**
 * Test fixtures for SVG content
 *
 * SVG strings for testing mask compositing and processing
 */

// =====================================================
// Simple SVG Masks
// =====================================================

/**
 * Simple circular mask SVG
 */
export const CIRCLE_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="black"/>
</svg>`;

/**
 * Simple ellipse mask SVG
 */
export const ELLIPSE_MASK_SVG = `<svg width="100" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="50" cy="25" rx="50" ry="25" fill="black"/>
</svg>`;

/**
 * Simple rectangle mask SVG
 */
export const RECTANGLE_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="black"/>
</svg>`;

/**
 * Simple rounded rectangle mask SVG
 */
export const ROUNDED_RECT_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="100" rx="20" ry="20" fill="black"/>
</svg>`;

// =====================================================
// Complex Polygon Masks
// =====================================================

/**
 * Triangle mask SVG
 */
export const TRIANGLE_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,0 100,100 0,100" fill="black"/>
</svg>`;

/**
 * Hexagon mask SVG
 */
export const HEXAGON_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,0 93,25 93,75 50,100 7,75 7,25" fill="black"/>
</svg>`;

/**
 * Star mask SVG (5-pointed)
 */
export const STAR_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="black"/>
</svg>`;

/**
 * Custom polygon mask SVG
 */
export const POLYGON_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="10,10 90,10 90,90 10,90 50,50" fill="black"/>
</svg>`;

// =====================================================
// Path Masks
// =====================================================

/**
 * Simple path mask SVG
 */
export const PATH_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10,10 L90,10 L90,90 L10,90 Z" fill="black"/>
</svg>`;

/**
 * Complex path mask SVG (bezier curves)
 */
export const CURVE_PATH_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50,0 C100,0 100,100 50,100 C0,100 0,0 50,0 Z" fill="black"/>
</svg>`;

/**
 * Heart shape mask SVG
 */
export const HEART_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50,90 C20,70 10,50 10,35 C10,20 25,10 40,10 C45,10 50,15 50,15 C50,15 55,10 60,10 C75,10 90,20 90,35 C90,50 80,70 50,90 Z" fill="black"/>
</svg>`;

// =====================================================
// Nested Masks
// =====================================================

/**
 * Nested mask SVG (mask within mask)
 */
export const NESTED_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="innerMask">
      <circle cx="50" cy="50" r="25" fill="white"/>
    </mask>
  </defs>
  <circle cx="50" cy="50" r="50" fill="black" mask="url(#innerMask)"/>
</svg>`;

/**
 * Compound mask SVG (multiple shapes)
 */
export const COMPOUND_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="25" cy="25" r="20" fill="black"/>
  <circle cx="75" cy="25" r="20" fill="black"/>
  <circle cx="50" cy="75" r="20" fill="black"/>
</svg>`;

// =====================================================
// Gradient Masks (for Luminance testing)
// =====================================================

/**
 * Linear gradient mask SVG
 */
export const GRADIENT_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:white;stop-opacity:1" />
      <stop offset="100%" style="stop-color:black;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#grad1)"/>
</svg>`;

/**
 * Radial gradient mask SVG
 */
export const RADIAL_GRADIENT_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="radGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:white;stop-opacity:1" />
      <stop offset="100%" style="stop-color:black;stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#radGrad)"/>
</svg>`;

// =====================================================
// Edge Case SVGs
// =====================================================

/**
 * Empty SVG
 */
export const EMPTY_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
</svg>`;

/**
 * Zero dimension SVG
 */
export const ZERO_DIMENSION_SVG = `<svg width="0" height="0" viewBox="0 0 0 0" xmlns="http://www.w3.org/2000/svg">
  <circle cx="0" cy="0" r="0" fill="black"/>
</svg>`;

/**
 * Very small SVG (1x1)
 */
export const TINY_SVG = `<svg width="1" height="1" viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg">
  <rect width="1" height="1" fill="black"/>
</svg>`;

/**
 * Very large SVG
 */
export const HUGE_SVG = `<svg width="10000" height="10000" viewBox="0 0 10000 10000" xmlns="http://www.w3.org/2000/svg">
  <rect width="10000" height="10000" fill="black"/>
</svg>`;

/**
 * Invalid SVG (malformed)
 */
export const INVALID_SVG = `<svg width="100" height="100">
  <circle cx="50" cy="50" r="50" fill="black">
</svg>`;

/**
 * SVG with negative coordinates
 */
export const NEGATIVE_COORDS_SVG = `<svg width="100" height="100" viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="0" cy="0" r="50" fill="black"/>
</svg>`;

/**
 * SVG without viewBox
 */
export const NO_VIEWBOX_SVG = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="50" fill="black"/>
</svg>`;

// =====================================================
// Avatar Circle Masks (common use case)
// =====================================================

/**
 * Small avatar circle mask (32x32)
 */
export const AVATAR_SMALL_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="16" fill="black"/>
</svg>`;

/**
 * Medium avatar circle mask (64x64)
 */
export const AVATAR_MEDIUM_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="32" fill="black"/>
</svg>`;

/**
 * Large avatar circle mask (128x128)
 */
export const AVATAR_LARGE_SVG = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="64" fill="black"/>
</svg>`;

// =====================================================
// Mask Transformations
// =====================================================

/**
 * SVG with transform (translation)
 */
export const TRANSLATED_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(10, 10)">
    <circle cx="40" cy="40" r="40" fill="black"/>
  </g>
</svg>`;

/**
 * SVG with transform (rotation)
 */
export const ROTATED_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(45, 50, 50)">
    <rect x="25" y="25" width="50" height="50" fill="black"/>
  </g>
</svg>`;

/**
 * SVG with transform (scale)
 */
export const SCALED_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(0.5)">
    <rect x="0" y="0" width="200" height="200" fill="black"/>
  </g>
</svg>`;

// =====================================================
// Real-World Figma-Style Exports
// =====================================================

/**
 * Figma-style SVG export (with Figma-specific attributes)
 */
export const FIGMA_STYLE_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <desc>Mask</desc>
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="50" fill="#000000" fill-opacity="1"/>
</svg>`;

/**
 * Figma boolean operation mask (union)
 */
export const BOOLEAN_UNION_MASK_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill-rule="evenodd">
    <circle cx="30" cy="30" r="20" fill="black"/>
    <circle cx="70" cy="30" r="20" fill="black"/>
    <circle cx="50" cy="70" r="20" fill="black"/>
  </g>
</svg>`;

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get SVG by name
 */
export function getSvgByName(name: string): string {
  const svgMap: Record<string, string> = {
    circle: CIRCLE_MASK_SVG,
    ellipse: ELLIPSE_MASK_SVG,
    rectangle: RECTANGLE_MASK_SVG,
    roundedRect: ROUNDED_RECT_MASK_SVG,
    triangle: TRIANGLE_MASK_SVG,
    hexagon: HEXAGON_MASK_SVG,
    star: STAR_MASK_SVG,
    polygon: POLYGON_MASK_SVG,
    path: PATH_MASK_SVG,
    heart: HEART_MASK_SVG,
    avatarSmall: AVATAR_SMALL_SVG,
    avatarMedium: AVATAR_MEDIUM_SVG,
    avatarLarge: AVATAR_LARGE_SVG,
  };

  return svgMap[name] || CIRCLE_MASK_SVG;
}

/**
 * Get all SVG fixtures
 */
export function getAllSvgFixtures(): Record<string, string> {
  return {
    circle: CIRCLE_MASK_SVG,
    ellipse: ELLIPSE_MASK_SVG,
    rectangle: RECTANGLE_MASK_SVG,
    roundedRect: ROUNDED_RECT_MASK_SVG,
    triangle: TRIANGLE_MASK_SVG,
    hexagon: HEXAGON_MASK_SVG,
    star: STAR_MASK_SVG,
    polygon: POLYGON_MASK_SVG,
    path: PATH_MASK_SVG,
    heart: HEART_MASK_SVG,
    gradient: GRADIENT_MASK_SVG,
    radialGradient: RADIAL_GRADIENT_MASK_SVG,
    nested: NESTED_MASK_SVG,
    compound: COMPOUND_MASK_SVG,
    avatarSmall: AVATAR_SMALL_SVG,
    avatarMedium: AVATAR_MEDIUM_SVG,
    avatarLarge: AVATAR_LARGE_SVG,
    translated: TRANSLATED_MASK_SVG,
    rotated: ROTATED_MASK_SVG,
    scaled: SCALED_MASK_SVG,
  };
}

// =====================================================
// Vector Optimization Fixtures (Phase 4)
// =====================================================

/**
 * Simple icon SVG for canonicalization testing
 */
export const SIMPLE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" data-figma-id="icon-1">
  <circle cx="12" cy="12" r="10" fill="red"/>
</svg>`;

/**
 * Identical SVG with different ID (for deduplication testing)
 */
export const SIMPLE_ICON_DUPLICATE_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" data-figma-id="icon-2">
  <circle cx="12" cy="12" r="10" fill="red"/>
</svg>`;

/**
 * Identical SVG with different ID (for deduplication testing)
 */
export const SIMPLE_ICON_DUPLICATE_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" data-figma-id="icon-3">
  <circle cx="12" cy="12" r="10" fill="red"/>
</svg>`;

/**
 * SVG with excessive Figma metadata
 */
export const SVG_WITH_METADATA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" data-figma-id="meta-1" data-figma-name="Icon" data-figma-component-id="abc123" data-editor-metadata="some-data">
  <rect x="2" y="2" width="20" height="20" fill="blue"/>
</svg>`;

/**
 * SVG with nested groups
 */
export const SVG_NESTED_GROUPS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g id="group-0" transform="translate(0, 0)">
    <g id="group-1" transform="translate(5, 5)">
      <g id="group-2" transform="translate(5, 5)">
        <circle cx="50" cy="50" r="20" fill="green"/>
      </g>
    </g>
  </g>
</svg>`;

/**
 * SVG without viewBox (edge case)
 */
export const SVG_NO_VIEWBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="yellow"/>
</svg>`;

/**
 * Complex SVG with multiple shapes
 */
export const COMPLEX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" data-figma-id="complex-1" data-editor-metadata="some-data">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" fill="url(#grad1)" rx="10"/>
  <circle cx="50" cy="50" r="30" fill="white"/>
</svg>`;

/**
 * Home icon (for sprite generation)
 */
export const HOME_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
</svg>`;

/**
 * Settings icon (for sprite generation)
 */
export const SETTINGS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
</svg>`;

/**
 * User icon (for sprite generation)
 */
export const USER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4S8,5.79,8,8S9.79,12,12,12z M12,14c-2.67,0-8,1.34-8,4v2h16v-2C20,15.34,14.67,14,12,14z"/>
</svg>`;

/**
 * Search icon (for sprite generation)
 */
export const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M15.5,14h-0.79l-0.28-0.27C15.41,12.59,16,11.11,16,9.5C16,5.91,13.09,3,9.5,3S3,5.91,3,9.5S5.91,16,9.5,16 c1.61,0,3.09-0.59,4.23-1.57l0.27,0.28v0.79l5,4.99L20.49,19L15.5,14z M9.5,14C7.01,14,5,11.99,5,9.5S7.01,5,9.5,5S14,7.01,14,9.5 S11.99,14,9.5,14z"/>
</svg>`;

/**
 * Menu icon (for sprite generation)
 */
export const MENU_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z"/>
</svg>`;

/**
 * Arrow icons for sprite generation
 */
export const ARROW_UP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M7.41,15.41L12,10.83l4.59,4.58L18,14l-6-6l-6,6L7.41,15.41z"/>
</svg>`;

export const ARROW_DOWN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M7.41,8.59L12,13.17l4.59-4.58L18,10l-6,6l-6-6L7.41,8.59z"/>
</svg>`;

export const ARROW_LEFT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M15.41,7.41L10.83,12l4.58,4.59L14,18l-6-6l6-6L15.41,7.41z"/>
</svg>`;

export const ARROW_RIGHT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M8.59,16.59L13.17,12L8.59,7.41L10,6l6,6l-6,6L8.59,16.59z"/>
</svg>`;

/**
 * Checkbox icons for sprite generation
 */
export const CHECKBOX_UNCHECKED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
</svg>`;

export const CHECKBOX_CHECKED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
  <path d="M9,16.17L4.83,12l-1.42,1.41L9,19L21,7l-1.41-1.41L9,16.17z" fill="white"/>
</svg>`;

/**
 * Close/X icon
 */
export const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41z"/>
</svg>`;

/**
 * Plus/Add icon
 */
export const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z"/>
</svg>`;

/**
 * Minus icon
 */
export const MINUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M19,13H5v-2h14V13z"/>
</svg>`;

/**
 * Heart icon (filled)
 */
export const HEART_FILLED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"/>
</svg>`;

/**
 * Star icon (filled)
 */
export const STAR_FILLED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,17.27L18.18,21l-1.64-7.03L22,9.24l-7.19-0.61L12,2L9.19,8.63L2,9.24l5.46,4.73L5.82,21L12,17.27z"/>
</svg>`;

/**
 * Trash/delete icon
 */
export const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M6,19c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V7H6V19z M19,4h-3.5l-1-1h-5l-1,1H5v2h14V4z"/>
</svg>`;

/**
 * Edit/pencil icon
 */
export const EDIT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M3,17.25V21h3.75L17.81,9.94l-3.75-3.75L3,17.25z M20.71,7.04c0.39-0.39,0.39-1.02,0-1.41l-2.34-2.34c-0.39-0.39-1.02-0.39-1.41,0 l-1.83,1.83l3.75,3.75L20.71,7.04z"/>
</svg>`;

/**
 * Download icon
 */
export const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M19,9h-4V3H9v6H5l7,7L19,9z M5,18v2h14v-2H5z"/>
</svg>`;

/**
 * Upload icon
 */
export const UPLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M9,16h6v-6h4l-7-7l-7,7h4V16z M5,18v2h14v-2H5z"/>
</svg>`;

/**
 * Folder icon
 */
export const FOLDER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M10,4H4C2.9,4,2.01,4.9,2.01,6L2,18c0,1.1,0.89,2,1.99,2H18c1.1,0,2-0.9,2-2V8c0-1.1-0.9-2-2-2h-8L10,4z"/>
</svg>`;

/**
 * File/document icon
 */
export const FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M14,2H6C4.9,2,4.01,2.9,4.01,4L4,20c0,1.1,0.89,2,1.99,2H18c1.1,0,2-0.9,2-2V8L14,2z M16,18H8v-2h8V18z M16,14H8v-2h8V14z M13,9V3.5L18.5,9H13z"/>
</svg>`;

/**
 * Info icon
 */
export const INFO_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M13,17h-2v-6h2V17z M13,9h-2V7h2V9z"/>
</svg>`;

/**
 * Warning icon
 */
export const WARNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M1,21h22L12,2L1,21z M13,18h-2v-2h2V18z M13,14h-2v-4h2V14z"/>
</svg>`;

/**
 * Error/cancel icon
 */
export const ERROR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59L10.59,12 L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"/>
</svg>`;

/**
 * Success/checkmark icon
 */
export const SUCCESS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8 l-9,9z"/>
</svg>`;

/**
 * Refresh/reload icon
 */
export const REFRESH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M17.65,6.35C16.2,4.9,14.21,4,12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08c-0.82,2.33-3.04,4-5.65,4 c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z"/>
</svg>`;

/**
 * Get all icon fixtures for sprite generation
 */
export function getAllIconFixtures(): Record<string, string> {
  return {
    home: HOME_ICON,
    settings: SETTINGS_ICON,
    user: USER_ICON,
    search: SEARCH_ICON,
    menu: MENU_ICON,
    arrowUp: ARROW_UP_ICON,
    arrowDown: ARROW_DOWN_ICON,
    arrowLeft: ARROW_LEFT_ICON,
    arrowRight: ARROW_RIGHT_ICON,
    checkboxUnchecked: CHECKBOX_UNCHECKED_ICON,
    checkboxChecked: CHECKBOX_CHECKED_ICON,
    close: CLOSE_ICON,
    plus: PLUS_ICON,
    minus: MINUS_ICON,
    heartFilled: HEART_FILLED_ICON,
    starFilled: STAR_FILLED_ICON,
    trash: TRASH_ICON,
    edit: EDIT_ICON,
    download: DOWNLOAD_ICON,
    upload: UPLOAD_ICON,
    folder: FOLDER_ICON,
    file: FILE_ICON,
    info: INFO_ICON,
    warning: WARNING_ICON,
    error: ERROR_ICON,
    success: SUCCESS_ICON,
    refresh: REFRESH_ICON,
  };
}
