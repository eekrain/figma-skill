/**
 * Code Generation Hints
 *
 * Generates code hints for React and Vue frameworks
 * including component names, props interfaces, and usage examples.
 */
import type { CodeHints, InferredProp } from "./types";

/**
 * Generate code hints for specific frameworks
 */
export function generateCodeHints(
  componentName: string,
  props: InferredProp[],
  frameworks: Array<"react" | "vue">
): CodeHints {
  const hints: CodeHints = {};

  const pascalName = toPascalCase(componentName);

  if (frameworks.includes("react")) {
    hints.react = generateReactHints(pascalName, props);
  }

  if (frameworks.includes("vue")) {
    hints.vue = generateVueHints(pascalName, props);
  }

  return hints;
}

/**
 * Generate React-specific code hints
 */
function generateReactHints(
  componentName: string,
  props: InferredProp[]
): CodeHints["react"] {
  return {
    componentName,
    propsInterface: generateReactPropsInterface(componentName, props),
    usageExample: generateReactUsageExample(componentName, props),
    a11yProps: generateA11yProps(componentName),
  };
}

/**
 * Generate Vue-specific code hints
 */
function generateVueHints(
  componentName: string,
  props: InferredProp[]
): CodeHints["vue"] {
  return {
    componentName,
    propsDefinition: generateVuePropsDefinition(props),
    usageExample: generateVueUsageExample(componentName, props),
  };
}

/**
 * Generate TypeScript props interface for React
 */
function generateReactPropsInterface(
  componentName: string,
  props: InferredProp[]
): string {
  const lines: string[] = [];

  lines.push(`export interface ${componentName}Props {`);

  for (const prop of props) {
    const optional = prop.required ? "" : "?";
    const comment = prop.description ? `  /** ${prop.description} */\n` : "";
    const tsType = prop.tsType || getTsType(prop);
    lines.push(`${comment}  ${prop.name}${optional}: ${tsType};`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate React usage example
 */
function generateReactUsageExample(
  componentName: string,
  props: InferredProp[]
): string {
  const requiredProps = props.filter((p) => p.required);
  const importantOptionalProps = props
    .filter((p) => !p.required && (p.name === "variant" || p.name === "size"))
    .slice(0, 2);

  const propsLines: string[] = [];

  for (const prop of [...requiredProps, ...importantOptionalProps]) {
    const value = getExampleValue(prop);
    propsLines.push(`  ${prop.name}={${value}}`);
  }

  if (propsLines.length > 0) {
    return `<${componentName}\n${propsLines.join("\n")}\n/>`;
  }

  return `<${componentName} />`;
}

/**
 * Generate Vue props definition
 */
function generateVuePropsDefinition(props: InferredProp[]): string {
  const lines: string[] = [];

  lines.push("const props = defineProps({");

  for (const prop of props) {
    const vueType = getVueType(prop.type);
    const required = prop.required
      ? "required: true"
      : `default: ${getDefaultVueValue(prop)}`;
    const comment = prop.description ? `    // ${prop.description}\n` : "";

    lines.push(`${comment}  ${prop.name}: {`);
    lines.push(`    type: ${vueType},`);
    lines.push(`    ${required}`);
    lines.push("  },");
  }

  lines.push("});");

  return lines.join("\n");
}

/**
 * Generate Vue usage example
 */
function generateVueUsageExample(
  componentName: string,
  props: InferredProp[]
): string {
  const requiredProps = props.filter((p) => p.required);
  const importantOptionalProps = props
    .filter((p) => !p.required && (p.name === "variant" || p.name === "size"))
    .slice(0, 2);

  const propsLines: string[] = [];

  for (const prop of [...requiredProps, ...importantOptionalProps]) {
    const value = getExampleValue(prop);
    propsLines.push(`  :${prop.name}="${value}"`);
  }

  if (propsLines.length > 0) {
    return `<${componentName}\n${propsLines.join("\n")}\n/>`;
  }

  return `<${componentName} />`;
}

/**
 * Generate accessibility props for a component
 */
function generateA11yProps(componentName: string): string[] {
  const props: string[] = [];
  const lowerName = componentName.toLowerCase();

  if (lowerName.includes("button")) {
    props.push("aria-label", "aria-disabled", "aria-pressed");
  }

  if (lowerName.includes("input") || lowerName.includes("field")) {
    props.push("aria-label", "aria-invalid", "aria-describedby");
  }

  if (lowerName.includes("dialog") || lowerName.includes("modal")) {
    props.push("aria-labelledby", "aria-describedby", 'role="dialog"');
  }

  if (lowerName.includes("link")) {
    props.push("aria-label", "aria-current");
  }

  if (lowerName.includes("menu") || lowerName.includes("nav")) {
    props.push('role="navigation"', 'aria-label="navigation"');
  }

  return props;
}

/**
 * Get TypeScript type for a prop
 */
function getTsType(prop: InferredProp): string {
  switch (prop.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "enum":
      return prop.enumValues?.map((v) => `"${v}"`).join(" | ") || "string";
    case "ReactNode":
      return "React.ReactNode";
    default:
      return "unknown";
  }
}

/**
 * Get Vue type definition for a prop type
 */
function getVueType(propType: InferredProp["type"]): string {
  switch (propType) {
    case "string":
      return "String";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    case "enum":
    case "ReactNode":
      return "[String, Number, Boolean, Object, Array]";
    default:
      return "String";
  }
}

/**
 * Get default Vue value for a prop
 */
function getDefaultVueValue(prop: InferredProp): string {
  switch (prop.type) {
    case "string":
    case "enum":
      return `"${prop.defaultValue || ""}"`;
    case "number":
      return prop.defaultValue || "0";
    case "boolean":
      return prop.defaultValue || "false";
    case "ReactNode":
      return "null";
    default:
      return "null";
  }
}

/**
 * Get example value for usage examples
 */
function getExampleValue(prop: InferredProp): string {
  switch (prop.type) {
    case "string":
      return `"${prop.defaultValue || "example"}"`;
    case "number":
      return prop.defaultValue || "0";
    case "boolean":
      return prop.defaultValue || "true";
    case "enum":
      return `"${prop.enumValues?.[0] || "value"}"`;
    case "ReactNode":
      return "{/* content */}";
    default:
      return '"..."';
  }
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}
