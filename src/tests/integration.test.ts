/**
 * Integration test for extraction pipeline
 */
import type { Node } from "@figma/rest-api-spec";
import { describe, expect, it } from "@jest/globals";

import { allExtractors } from "@/extractors/built-in";
import { extractFromDesign } from "@/extractors/node-walker";

describe("Extraction Pipeline Integration", () => {
  it("should extract layout from a simple frame node", () => {
    const mockFrame = {
      id: "1:1",
      name: "Test Frame",
      type: "FRAME",
      visible: true,
      children: [],
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10,
      itemSpacing: 10,
      width: 100,
      height: 100,
    } as unknown as Node;

    const { nodes } = extractFromDesign([mockFrame], allExtractors);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("1:1");
    expect(nodes[0].name).toBe("Test Frame");
    expect(nodes[0].layout).toBeDefined();
    expect(nodes[0].layout?.mode).toBe("row");
  });

  it("should extract text from a text node", () => {
    const mockText: Node = {
      id: "1:2",
      name: "Test Text",
      type: "TEXT",
      visible: true,
      characters: "Hello World",
      style: {
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: 16,
        lineHeightPx: 24,
      },
    } as unknown as Node;

    const { nodes } = extractFromDesign([mockText], allExtractors);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].text).toBe("Hello World");
    expect(nodes[0].textStyle).toBeDefined();
  });

  it("should extract fills and effects from a rectangle", () => {
    const mockRect: Node = {
      id: "1:3",
      name: "Test Rectangle",
      type: "RECTANGLE",
      visible: true,
      fills: [
        {
          type: "SOLID",
          visible: true,
          opacity: 1,
          color: { r: 1, g: 0, b: 0, a: 1 },
        },
      ],
      effects: [],
      strokes: [],
      strokeWeight: 1,
    } as unknown as Node;

    const { nodes } = extractFromDesign([mockRect], allExtractors);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].fills).toBeDefined();
  });

  it("should handle nested children correctly", () => {
    const mockChild = {
      id: "1:5",
      name: "Child",
      type: "FRAME",
      visible: true,
      children: [],
      width: 50,
      height: 50,
    } as unknown as Node;

    const mockParent = {
      id: "1:4",
      name: "Parent",
      type: "FRAME",
      visible: true,
      children: [mockChild],
      layoutMode: "VERTICAL",
      width: 100,
      height: 100,
    } as unknown as Node;

    const { nodes } = extractFromDesign([mockParent], allExtractors);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children?.[0].name).toBe("Child");
  });
});
