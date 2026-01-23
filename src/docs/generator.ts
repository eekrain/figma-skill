/**
 * Documentation Generator Implementation
 * Phase 4: Design System Documentation
 *
 * Generates comprehensive design system documentation from Figma data.
 */
import type { DesignSystemAnalysis } from "@/analysis/types";
import type { SimplifiedDesign } from "@/extractors/types";
import type { ColorToken, DesignTokens, EffectValue } from "@/tokens/types";

import type {
  ColorTokenData,
  ComponentDocData,
  DocFile,
  DocGenerationOptions,
  OverviewData,
} from "./types";

const DEFAULT_OPTIONS: DocGenerationOptions = {
  format: "markdown",
  includeExamples: true,
  includeAccessibility: true,
  includePreviews: false,
};

/**
 * Generate complete design system documentation
 *
 * @param design - Simplified design from Figma
 * @param tokens - Extracted design tokens
 * @param analysis - Component analysis results
 * @param options - Generation options
 * @returns Array of documentation files
 */
export function generateDesignSystemDoc(
  design: SimplifiedDesign,
  tokens: DesignTokens,
  analysis: DesignSystemAnalysis,
  options: DocGenerationOptions = {}
): DocFile[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const files: DocFile[] = [];

  // Generate overview
  files.push(createOverview(design, tokens, analysis, opts));

  // Generate color documentation
  files.push(...createColorDocs(tokens, opts));

  // Generate typography documentation
  files.push(...createTypographyDocs(tokens, opts));

  // Generate spacing documentation
  files.push(...createSpacingDocs(tokens, opts));

  // Generate effect documentation
  files.push(...createEffectDocs(tokens, opts));

  // Generate component documentation
  files.push(...createComponentDocs(analysis, opts));

  // Generate accessibility guidelines
  if (opts.includeAccessibility) {
    files.push(createAccessibilityDoc(tokens, analysis, opts));
  }

  return files;
}

/**
 * Create overview documentation
 */
function createOverview(
  design: SimplifiedDesign,
  tokens: DesignTokens,
  analysis: DesignSystemAnalysis,
  options: DocGenerationOptions
): DocFile {
  const content = options.templates?.overview
    ? options.templates.overview(buildOverviewData(design, tokens, analysis))
    : generateDefaultOverview(design, tokens, analysis, options);

  return {
    path: "_Overview.md",
    content,
    type: "markdown",
  };
}

function generateDefaultOverview(
  design: SimplifiedDesign,
  tokens: DesignTokens,
  analysis: DesignSystemAnalysis,
  _options: DocGenerationOptions
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${design.name} Design System`);
  lines.push("");
  lines.push("> Auto-generated from Figma");
  lines.push("");

  // Stats
  lines.push("## System Statistics");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total Colors | ${tokens.stats.totalColorTokens} |`);
  lines.push(
    `| Semantic Colors | ${Object.keys(tokens.colors.semantic).length} |`
  );
  lines.push(
    `| Color Families | ${Object.keys(tokens.colors.families).length} |`
  );
  lines.push(`| Typography Styles | ${tokens.stats.totalTypographyTokens} |`);
  lines.push(`| Spacing Tokens | ${tokens.stats.totalSpacingTokens} |`);
  lines.push(`| Effect Tokens | ${tokens.stats.totalEffectTokens} |`);
  lines.push(`| Components | ${analysis.summary.totalComponents} |`);
  lines.push(
    `| Ready for Implementation | ${analysis.implementationReadiness.readyToImplement.length} |`
  );
  lines.push("");

  // Color families overview
  if (Object.keys(tokens.colors.families).length > 0) {
    lines.push("## Color Families");
    lines.push("");
    for (const [family, scales] of Object.entries(tokens.colors.families)) {
      const scaleKeys = Object.keys(scales)
        .map((k) => parseInt(k, 10))
        .sort((a, b) => a - b);
      lines.push(`- **${family}**: ${scaleKeys.join(", ")}`);
    }
    lines.push("");
  }

  // Font families
  if (tokens.typography.families.length > 0) {
    lines.push("## Font Families");
    lines.push("");
    for (const family of tokens.typography.families) {
      lines.push(`- ${family}`);
    }
    lines.push("");
  }

  // Component overview
  lines.push("## Components by Atomic Level");
  lines.push("");
  lines.push("| Level | Count |");
  lines.push("|-------|-------|");
  for (const [level, count] of Object.entries(analysis.summary.byCategory)) {
    lines.push(`| ${level} | ${count} |`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Create color documentation
 */
function createColorDocs(
  tokens: DesignTokens,
  options: DocGenerationOptions
): DocFile[] {
  const files: DocFile[] = [];

  // Semantic colors
  const semanticContent = generateColorDoc(
    "Semantic Colors",
    Object.values(tokens.colors.semantic),
    options
  );
  files.push({
    path: "GlobalStyles/Colors.md",
    content: semanticContent,
    type: "markdown",
  });

  // Color families
  for (const [family, scales] of Object.entries(tokens.colors.families)) {
    const familyContent = generateColorFamilyDoc(family, scales, options);
    files.push({
      path: `GlobalStyles/Colors/${capitalize(family)}.md`,
      content: familyContent,
      type: "markdown",
    });
  }

  return files;
}

function generateColorDoc(
  title: string,
  colors: ColorToken[],
  options: DocGenerationOptions
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push("");

  if (options.includeAccessibility) {
    lines.push(
      "| Name | Value | Preview | Contrast on White | Contrast on Black |"
    );
    lines.push(
      "|------|-------|---------|-------------------|------------------|"
    );
  } else {
    lines.push("| Name | Value | Preview |");
    lines.push("|------|-------|---------|");
  }

  for (const color of colors) {
    const preview = generateColorPreview(color.value);

    if (options.includeAccessibility && color.contrast) {
      const wcagAA = color.contrast.onWhite >= 4.5 ? "✅ AA" : "❌";
      const wcagAAA = color.contrast.onWhite >= 7 ? "✅ AAA" : "";
      lines.push(
        `| ${color.name} | \`${color.value}\` | ${preview} | ${color.contrast.onWhite.toFixed(2)} ${wcagAA} ${wcagAAA} | ${color.contrast.onBlack.toFixed(2)} |`
      );
    } else {
      lines.push(`| ${color.name} | \`${color.value}\` | ${preview} |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function generateColorFamilyDoc(
  family: string,
  scales: Record<number, ColorToken>,
  options: DocGenerationOptions
): string {
  const lines: string[] = [];

  lines.push(`# ${capitalize(family)} Color Scale`);
  lines.push("");

  if (options.includeAccessibility) {
    lines.push(
      "| Scale | Value | Preview | Contrast on White | Contrast on Black |"
    );
    lines.push(
      "|-------|-------|---------|-------------------|------------------|"
    );
  } else {
    lines.push("| Scale | Value | Preview |");
    lines.push("|-------|-------|---------|");
  }

  const sortedScales = Object.entries(scales).sort(
    ([a], [b]) => parseInt(a, 10) - parseInt(b, 10)
  );

  for (const [scale, token] of sortedScales) {
    const preview = generateColorPreview(token.value);

    if (options.includeAccessibility && token.contrast) {
      const wcagAA = token.contrast.onWhite >= 4.5 ? "✅ AA" : "❌";
      const wcagAAA = token.contrast.onWhite >= 7 ? "✅ AAA" : "";
      lines.push(
        `| ${scale} | \`${token.value}\` | ${preview} | ${token.contrast.onWhite.toFixed(2)} ${wcagAA} ${wcagAAA} | ${token.contrast.onBlack.toFixed(2)} |`
      );
    } else {
      lines.push(`| ${scale} | \`${token.value}\` | ${preview} |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function generateColorPreview(hexValue: string): string {
  // Remove # if present
  const hex = hexValue.replace("#", "");
  return `![${hexValue}](https://via.placeholder.com/20/${hex}/000000?text=+)`;
}

/**
 * Create typography documentation
 */
function createTypographyDocs(
  tokens: DesignTokens,
  _options: DocGenerationOptions
): DocFile[] {
  const lines: string[] = [];

  lines.push("# Typography");
  lines.push("");
  lines.push("| Name | Font Family | Size | Weight | Line Height |");
  lines.push("|------|-------------|------|--------|-------------|");

  for (const [name, token] of Object.entries(tokens.typography.styles)) {
    lines.push(
      `| ${name} | ${token.value.fontFamily} | ${token.value.fontSize} | ${token.value.fontWeight} | ${token.value.lineHeight} |`
    );
  }

  lines.push("");

  return [
    {
      path: "GlobalStyles/Typography.md",
      content: lines.join("\n"),
      type: "markdown",
    },
  ];
}

/**
 * Create spacing documentation
 */
function createSpacingDocs(
  tokens: DesignTokens,
  _options: DocGenerationOptions
): DocFile[] {
  const lines: string[] = [];

  lines.push("# Spacing Scale");
  lines.push("");
  lines.push("| Token | Value |");
  lines.push("|-------|-------|");

  for (const [name, token] of Object.entries(tokens.spacing.scale)) {
    lines.push(`| ${name} | ${token.value} |`);
  }

  lines.push("");

  return [
    {
      path: "GlobalStyles/Spacing.md",
      content: lines.join("\n"),
      type: "markdown",
    },
  ];
}

/**
 * Create effect documentation
 */
function createEffectDocs(
  tokens: DesignTokens,
  _options: DocGenerationOptions
): DocFile[] {
  const lines: string[] = [];

  lines.push("# Effects");
  lines.push("");
  lines.push("## Shadows");
  lines.push("");
  lines.push("| Name | Value |");
  lines.push("|------|-------|");

  for (const [name, token] of Object.entries(tokens.effects.shadows)) {
    lines.push(`| ${name} | \`${effectToShadowString(token.value)}\` |`);
  }

  lines.push("");

  return [
    {
      path: "GlobalStyles/Effects.md",
      content: lines.join("\n"),
      type: "markdown",
    },
  ];
}

/**
 * Create component documentation
 */
function createComponentDocs(
  analysis: DesignSystemAnalysis,
  options: DocGenerationOptions
): DocFile[] {
  const files: DocFile[] = [];

  for (const [key, component] of Object.entries(analysis.components)) {
    const docData = componentToDocData(component);
    const content = options.templates?.component
      ? options.templates.component(docData)
      : generateDefaultComponentDoc(docData, options);

    const fileName = toKebabCase(component.name);
    files.push({
      path: `Components/${fileName}.md`,
      content,
      type: "markdown",
    });
  }

  return files;
}

function componentToDocData(
  component: DesignSystemAnalysis["components"][string]
): ComponentDocData {
  return {
    name: component.name,
    description: component.description,
    atomicLevel: component.atomicLevel,
    props: component.props.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      description: p.description,
      defaultValue: p.defaultValue,
    })),
    variants: component.variants.map((v) => ({
      property: v.property,
      value: v.value,
    })),
    readiness: {
      score: component.readiness.score,
      ready: component.readiness.ready,
      warnings: component.readiness.warnings,
      suggestions: component.readiness.suggestions,
    },
    codeHints: component.codeHints,
    tags: component.tags,
  };
}

function generateDefaultComponentDoc(
  component: ComponentDocData,
  options: DocGenerationOptions
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${component.name}`);
  lines.push("");

  // Metadata badges
  const badges = [
    `Atomic: ${component.atomicLevel}`,
    `Readiness: ${component.readiness.score}%`,
    component.readiness.ready ? "✅ Ready" : "⚠️ Needs Work",
  ];
  lines.push(badges.join(" | "));
  lines.push("");

  // Tags
  if (component.tags.length > 0) {
    lines.push("**Tags**: " + component.tags.map((t) => `\`${t}\``).join(", "));
    lines.push("");
  }

  // Description
  if (component.description) {
    lines.push(component.description);
    lines.push("");
  }

  // Props
  if (component.props.length > 0) {
    lines.push("## Props");
    lines.push("");
    lines.push("| Name | Type | Required | Default | Description |");
    lines.push("|------|------|----------|---------|-------------|");

    for (const prop of component.props) {
      lines.push(
        `| ${prop.name} | \`${prop.type}\` | ${prop.required ? "Yes" : "No"} | ${prop.defaultValue ?? "-"} | ${prop.description || "-"} |`
      );
    }

    lines.push("");
  }

  // Variants
  if (component.variants.length > 0) {
    lines.push("## Variants");
    lines.push("");

    // Group by property
    const variantsByProperty = new Map<string, string[]>();
    for (const variant of component.variants) {
      if (!variantsByProperty.has(variant.property)) {
        variantsByProperty.set(variant.property, []);
      }
      variantsByProperty.get(variant.property)!.push(variant.value);
    }

    for (const [property, values] of variantsByProperty) {
      lines.push(
        `**${property}**: ${values.map((v) => `\`${v}\``).join(", ")}`
      );
    }

    lines.push("");
  }

  // React code hints
  if (options.includeExamples && component.codeHints?.react) {
    lines.push("## React Implementation");
    lines.push("");

    const { react } = component.codeHints;
    lines.push("### Props Interface");
    lines.push("");
    lines.push("```typescript");
    lines.push(react.propsInterface);
    lines.push("```");
    lines.push("");

    lines.push("### Usage Example");
    lines.push("");
    lines.push("```jsx");
    lines.push(react.usageExample);
    lines.push("```");
    lines.push("");
  }

  // Readiness notes
  if (
    component.readiness.warnings.length > 0 ||
    (component.readiness.suggestions &&
      component.readiness.suggestions.length > 0)
  ) {
    lines.push("## Implementation Notes");
    lines.push("");

    if (component.readiness.warnings.length > 0) {
      lines.push("### Warnings");
      lines.push("");
      for (const warning of component.readiness.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push("");
    }

    if (
      component.readiness.suggestions &&
      component.readiness.suggestions.length > 0
    ) {
      lines.push("### Suggestions");
      lines.push("");
      for (const suggestion of component.readiness.suggestions) {
        lines.push(`- 💡 ${suggestion}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Create accessibility documentation
 */
function createAccessibilityDoc(
  tokens: DesignTokens,
  analysis: DesignSystemAnalysis,
  _options: DocGenerationOptions
): DocFile {
  const lines: string[] = [];

  lines.push("# Accessibility Guidelines");
  lines.push("");
  lines.push("## Color Contrast");
  lines.push("");
  lines.push(
    "The following color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text):"
  );
  lines.push("");

  for (const [name, token] of Object.entries(tokens.colors.all)) {
    if (token.contrast) {
      const onWhite = token.contrast.onWhite;
      const onBlack = token.contrast.onBlack;

      const status = (contrast: number) => {
        if (contrast >= 7) return "✅ AAA";
        if (contrast >= 4.5) return "✅ AA";
        if (contrast >= 3) return "⚠️ Large text only";
        return "❌ Fail";
      };

      lines.push(`### ${name}`);
      lines.push("");
      lines.push(`- On white: ${onWhite.toFixed(2)}:1 ${status(onWhite)}`);
      lines.push(`- On black: ${onBlack.toFixed(2)}:1 ${status(onBlack)}`);
      lines.push("");
    }
  }

  lines.push("## Component Accessibility");
  lines.push("");
  lines.push("Components requiring attention:");
  lines.push("");

  let hasWarnings = false;
  for (const [key, component] of Object.entries(analysis.components)) {
    const hasA11yProps =
      component.codeHints?.react?.a11yProps &&
      component.codeHints.react.a11yProps.length > 0;
    if (!hasA11yProps) {
      hasWarnings = true;
      lines.push(`### ${component.name}`);
      lines.push("");
      lines.push("- ⚠️ No accessibility properties detected");
      lines.push("");
    }
  }

  if (!hasWarnings) {
    lines.push("✅ All components have accessibility properties defined.");
    lines.push("");
  }

  return {
    path: "Guidelines/Accessibility.md",
    content: lines.join("\n"),
    type: "markdown",
  };
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Convert effect array to CSS shadow string
 */
function effectToShadowString(effects: EffectValue[]): string {
  return effects
    .filter((e) => e.type === "DROP_SHADOW")
    .map((e) => {
      const x = e.x ?? 0;
      const y = e.y ?? 0;
      const blur = e.blur ?? 0;
      const spread = e.spread ?? 0;
      const color = e.color ?? "#000000";

      // Omit spread when 0 for cleaner output
      if (spread === 0) {
        return `${x}px ${y}px ${blur}px ${color}`;
      }
      return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    })
    .join(", ");
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Build overview data for custom templates
 */
function buildOverviewData(
  design: SimplifiedDesign,
  tokens: DesignTokens,
  analysis: DesignSystemAnalysis
): OverviewData {
  return {
    designName: design.name,
    totalTokens:
      tokens.stats.totalColorTokens +
      tokens.stats.totalTypographyTokens +
      tokens.stats.totalSpacingTokens +
      tokens.stats.totalEffectTokens,
    totalComponents: analysis.summary.totalComponents,
    colorFamilies: Object.keys(tokens.colors.families),
    fontFamilies: tokens.typography.families,
    componentStats: {
      ready: analysis.implementationReadiness.readyToImplement.length,
      needsWork: analysis.implementationReadiness.needsSpecification.length,
    },
  };
}
