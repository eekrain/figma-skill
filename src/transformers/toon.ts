/**
 * Toon format - Token-efficient design representation
 *
 * Toon format is a compact string representation that's 30-60% smaller
 * than JSON while maintaining all essential design information.
 */
import type { SimplifiedDesign, SimplifiedNode } from "@/extractors/types";

/**
 * Convert SimplifiedDesign to Toon format (compact string)
 */
export function toToon(design: SimplifiedDesign): string {
  const parts: string[] = [];

  // Header with name
  parts.push(`n:${escapeValue(design.name)}`);

  // Nodes
  if (design.nodes.length > 0) {
    parts.push(`nodes:${serializeNodes(design.nodes)}`);
  }

  // Components
  if (Object.keys(design.components).length > 0) {
    parts.push(`comp:${serializeComponents(design.components)}`);
  }

  // Component sets
  if (Object.keys(design.componentSets).length > 0) {
    parts.push(`sets:${serializeComponentSets(design.componentSets)}`);
  }

  // Global vars
  if (Object.keys(design.globalVars.styles).length > 0) {
    parts.push(`vars:${serializeGlobalVars(design.globalVars)}`);
  }

  return parts.join("|");
}

/**
 * Parse Toon format back to SimplifiedDesign
 */
export function fromToon(toon: string): SimplifiedDesign {
  const parts = toon.split("|");
  const design = {
    name: "",
    nodes: [] as SimplifiedNode[],
    components: {} as Record<string, unknown>,
    componentSets: {} as Record<string, unknown>,
    globalVars: { styles: {} },
  };

  for (const part of parts) {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) continue;

    const key = part.slice(0, colonIndex);
    const value = part.slice(colonIndex + 1);

    switch (key) {
      case "n":
        design.name = unescapeValue(value);
        break;
      case "nodes":
        design.nodes = deserializeNodes(value);
        break;
      case "comp":
        design.components = deserializeComponents(value);
        break;
      case "sets":
        design.componentSets = deserializeComponentSets(value);
        break;
      case "vars":
        design.globalVars = deserializeGlobalVars(value);
        break;
    }
  }

  return design as SimplifiedDesign;
}

/**
 * Serialize nodes to compact format
 * Uses semicolon to separate nodes, comma for properties
 */
function serializeNodes(nodes: SimplifiedNode[]): string {
  return nodes.map(serializeNode).join(";");
}

function serializeNode(node: SimplifiedNode): string {
  const parts: string[] = [];

  // Basic properties (short keys for compactness)
  parts.push(`i=${node.id}`);
  parts.push(`n=${escapeValue(node.name)}`);
  parts.push(`t=${node.type}`);
  if (node.visible === false) parts.push(`v=0`);

  // Layout
  if (node.layout) {
    parts.push(`l=${serializeObject(node.layout)}`);
  }

  // Text
  if (node.text) {
    parts.push(`x=${escapeValue(node.text)}`);
  }
  if (node.textStyle) {
    parts.push(`xs=${serializeObject(node.textStyle)}`);
  }

  // Visuals
  if (node.fills && node.fills.length > 0) {
    parts.push(`f=${serializeArray(node.fills)}`);
  }
  if (node.strokes) {
    parts.push(`s=${serializeObject(node.strokes)}`);
  }
  if (node.strokeWeight) {
    parts.push(`sw=${node.strokeWeight}`);
  }
  if (node.boxShadow) {
    parts.push(`bs=${escapeValue(node.boxShadow)}`);
  }
  if (node.opacity !== undefined && node.opacity !== 1) {
    parts.push(`o=${node.opacity}`);
  }
  if (node.borderRadius) {
    parts.push(`br=${escapeValue(node.borderRadius)}`);
  }

  // Component
  if (node.componentId) {
    parts.push(`cid=${node.componentId}`);
  }
  if (node.componentProperties && node.componentProperties.length > 0) {
    parts.push(`cp=${serializeArray(node.componentProperties)}`);
  }

  // Children
  if (node.children && node.children.length > 0) {
    parts.push(`c=[${serializeNodes(node.children)}]`);
  }

  return parts.join(",");
}

function deserializeNodes(data: string): SimplifiedNode[] {
  if (data === "") return [];
  const nodeStrings = splitTopLevel(data, ";");
  return nodeStrings.map(deserializeNode);
}

function deserializeNode(data: string): SimplifiedNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = {
    id: "",
    name: "",
    type: "",
    visible: true,
  };

  const props = splitTopLevel(data, ",");
  for (const prop of props) {
    const eqIndex = prop.indexOf("=");
    if (eqIndex === -1) continue;

    const key = prop.slice(0, eqIndex);
    const value = prop.slice(eqIndex + 1);

    switch (key) {
      case "i":
        node.id = value;
        break;
      case "n":
        node.name = unescapeValue(value);
        break;
      case "t":
        node.type = value;
        break;
      case "v":
        node.visible = value !== "0";
        break;
      case "l":
        node.layout = deserializeObject(value);
        break;
      case "x":
        node.text = unescapeValue(value);
        break;
      case "xs":
        node.textStyle = deserializeObject(value);
        break;
      case "f":
        node.fills = deserializeArray(value);
        break;
      case "s":
        node.strokes = deserializeObject(value);
        break;
      case "sw":
        node.strokeWeight = value;
        break;
      case "bs":
        node.boxShadow = unescapeValue(value);
        break;
      case "o":
        node.opacity = parseFloat(value);
        break;
      case "br":
        node.borderRadius = unescapeValue(value);
        break;
      case "cid":
        node.componentId = value;
        break;
      case "cp":
        node.componentProperties = deserializeArray(value);
        break;
      case "c":
        if (value.startsWith("[") && value.endsWith("]")) {
          node.children = deserializeNodes(value.slice(1, -1));
        }
        break;
    }
  }

  return node;
}

function serializeComponents(components: Record<string, unknown>): string {
  const entries = Object.entries(components).map(
    ([k, v]) => `${k}=${serializeObject(v)}`
  );
  return entries.join(",");
}

function deserializeComponents(data: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data === "") return result;

  const entries = splitTopLevel(data, ",");
  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) continue;
    const key = entry.slice(0, eqIndex);
    const value = entry.slice(eqIndex + 1);
    result[key] = deserializeObject(value);
  }
  return result;
}

function serializeComponentSets(
  componentSets: Record<string, unknown>
): string {
  const entries = Object.entries(componentSets).map(
    ([k, v]) => `${k}=${serializeObject(v)}`
  );
  return entries.join(",");
}

function deserializeComponentSets(data: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data === "") return result;

  const entries = splitTopLevel(data, ",");
  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) continue;
    const key = entry.slice(0, eqIndex);
    const value = entry.slice(eqIndex + 1);
    result[key] = deserializeObject(value);
  }
  return result;
}

function serializeGlobalVars(globalVars: {
  styles: Record<string, unknown>;
}): string {
  return serializeObject(globalVars.styles);
}

function deserializeGlobalVars(data: string): {
  styles: Record<string, unknown>;
} {
  return {
    styles: deserializeObject(data) as Record<string, unknown>,
  };
}

/**
 * Serialize object to compact format
 */
function serializeObject(obj: unknown): string {
  if (obj === null || obj === undefined) return "";
  if (typeof obj === "string") return escapeValue(obj);
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "boolean") return obj ? "1" : "0";
  if (Array.isArray(obj)) return serializeArray(obj);
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}:${serializeObject(v)}`);
    return `{${entries.join(",")}}`;
  }
  return "";
}

function deserializeObject(data: string): unknown {
  if (data === "") return "";
  if (data.startsWith("{") && data.endsWith("}")) {
    const inner = data.slice(1, -1);
    if (inner === "") return {};
    const entries = splitTopLevel(inner, ",");
    const result: Record<string, unknown> = {};
    for (const entry of entries) {
      const colonIndex = entry.indexOf(":");
      if (colonIndex === -1) continue;
      const key = entry.slice(0, colonIndex);
      const value = entry.slice(colonIndex + 1);
      result[key] = deserializeObject(value);
    }
    return result;
  }
  return unescapeValue(data);
}

/**
 * Serialize array to compact format
 */
function serializeArray(arr: unknown[]): string {
  if (arr.length === 0) return "";
  return arr.map(serializeObject).join(",");
}

function deserializeArray(data: string): unknown[] {
  if (data === "") return [];
  const items = splitTopLevel(data, ",");
  return items.map(deserializeObject);
}

/**
 * Escape special characters in values
 */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/**
 * Unescape special characters in values
 */
function unescapeValue(value: string): string {
  return value.replace(/\\([\\:;,|{}[\]])/g, (_, char) => char);
}

/**
 * Split string at delimiter, respecting escape sequences
 */
function splitTopLevel(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "{" || char === "[") {
      depth++;
      current += char;
      continue;
    }

    if (char === "}" || char === "]") {
      depth--;
      current += char;
      continue;
    }

    if (char === delimiter && depth === 0) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    result.push(current);
  }

  return result;
}
