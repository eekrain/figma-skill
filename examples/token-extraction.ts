/**
 * Token Extraction Example
 *
 * This example demonstrates how to use figma-skill's token extraction
 * to generate design tokens from Figma designs.
 */
import { FigmaExtractor } from "figma-skill";
import { type DesignTokens, extractTokens } from "figma-skill/tokens";

async function main() {
  // Initialize the Figma client
  const figma = new FigmaExtractor({
    token: process.env.FIGMA_TOKEN!,
  });

  // Fetch design data from Figma
  const fileKey = "your-file-key-here";
  const design = await figma.getFile(fileKey);

  // Extract design tokens
  const tokens = extractTokens(design, {
    calculateContrast: true,
    detectPatterns: true,
    inferSemanticNames: true,
  });

  // Access color tokens
  console.log("=== Color Tokens ===");
  console.log("Semantic colors:", Object.keys(tokens.colors.semantic));
  console.log("Color families:", Object.keys(tokens.colors.families));

  // Access specific color family
  if (tokens.colors.families.primary) {
    console.log("\nPrimary color family:");
    for (const [scale, token] of Object.entries(
      tokens.colors.families.primary
    )) {
      console.log(
        `  ${scale}: ${token.value} (contrast on white: ${token.contrast?.onWhite})`
      );
    }
  }

  // Access typography tokens
  console.log("\n=== Typography Tokens ===");
  console.log("Font families:", tokens.typography.families);
  console.log("Text styles:", Object.keys(tokens.typography.styles));

  // Access spacing tokens
  console.log("\n=== Spacing Tokens ===");
  console.log("Spacing values:", Object.keys(tokens.spacing.scale));

  // Access statistics
  console.log("\n=== Statistics ===");
  console.log("Total color tokens:", tokens.stats.totalColorTokens);
  console.log("Total typography tokens:", tokens.stats.totalTypographyTokens);
  console.log(
    "Semantic color coverage:",
    `${(tokens.stats.semanticColorCoverage * 100).toFixed(1)}%`
  );
}

// Example: Generate Tailwind config from tokens
function generateTailwindConfig(tokens: DesignTokens): string {
  const colors: Record<string, string> = {};

  // Add semantic colors
  for (const [name, token] of Object.entries(tokens.colors.semantic)) {
    colors[name] = token.value;
  }

  // Add family colors as nested objects
  for (const [family, scales] of Object.entries(tokens.colors.families)) {
    colors[family] = {};
    for (const [scale, token] of Object.entries(scales)) {
      (colors[family] as Record<string, string>)[scale] = token.value;
    }
  }

  // Build typography config
  const fontSize: Record<string, string> = {};
  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    fontSize[name] = token.value.fontSize;
  }

  return `
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 2)},
      fontSize: ${JSON.stringify(fontSize, null, 2)},
    },
  },
};
`;
}

// Example: Generate CSS variables from tokens
function generateCSSVariables(tokens: DesignTokens): string {
  let css = ":root {\n";

  // Color variables
  for (const [name, token] of Object.entries(tokens.colors.all)) {
    const varName = name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    css += `  --color-${varName}: ${token.value};\n`;
  }

  // Typography variables
  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    const varName = name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    css += `  --font-${varName}-family: ${token.value.fontFamily};\n`;
    css += `  --font-${varName}-size: ${token.value.fontSize};\n`;
  }

  css += "}";
  return css;
}

// Example: Generate JSON for Style Dictionary
function generateStyleDictionaryJSON(tokens: DesignTokens) {
  const sdTokens: Record<string, any> = {
    color: {},
    typography: {},
    spacing: {},
  };

  // Add colors
  for (const [name, token] of Object.entries(tokens.colors.all)) {
    const path = name.split(/-/).map((s, i) => (i === 0 ? s : s.toLowerCase()));
    let current = sdTokens.color;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = {
      value: token.value,
      type: "color",
    };
  }

  // Add typography
  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    sdTokens.typography[name] = {
      value: token.value,
      type: "typography",
    };
  }

  return JSON.stringify(sdTokens, null, 2);
}

export {
  main,
  generateTailwindConfig,
  generateCSSVariables,
  generateStyleDictionaryJSON,
};
