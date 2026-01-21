/**
 * Integration test for extraction pipeline
 */
import type { Node } from "@figma/rest-api-spec";
import { describe, expect, it } from "@jest/globals";

import { allExtractors, collapseSvgContainers } from "@/extractors/built-in";
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

    const { nodes, globalVars } = extractFromDesign([mockFrame], allExtractors);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("1:1");
    expect(nodes[0].name).toBe("Test Frame");
    expect(nodes[0].layout).toBeDefined();

    // Layout can be a string reference or direct value
    if (typeof nodes[0].layout === "string") {
      // If it's a string reference, check the globalVars
      const layoutValue = globalVars.styles[nodes[0].layout];
      expect(layoutValue).toBeDefined();
      expect(layoutValue).toHaveProperty("mode", "row");
    } else {
      expect(nodes[0].layout?.mode).toBe("row");
    }
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

  describe("SVG Container Collapsing", () => {
    it("should collapse frame with all SVG-eligible children to IMAGE-SVG", () => {
      const svgChildren = [
        {
          id: "1:2",
          name: "Rectangle",
          type: "RECTANGLE",
          visible: true,
        },
        {
          id: "1:3",
          name: "Ellipse",
          type: "ELLIPSE",
          visible: true,
        },
      ] as unknown as Node[];

      const mockFrame = {
        id: "1:1",
        name: "SVG Frame",
        type: "FRAME",
        visible: true,
        children: svgChildren,
      } as unknown as Node;

      const simplifiedChildren = svgChildren.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type as string,
      }));

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockFrame.id,
        name: mockFrame.name,
        type: mockFrame.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockFrame,
        result,
        simplifiedChildren
      );

      expect(result.type).toBe("IMAGE-SVG");
      expect(filteredChildren).toEqual([]);
    });

    it("should not collapse frame with mixed children", () => {
      const mixedChildren = [
        {
          id: "1:2",
          name: "Rectangle",
          type: "RECTANGLE",
          visible: true,
        },
        {
          id: "1:3",
          name: "Text",
          type: "TEXT",
          visible: true,
        },
      ] as unknown as Node[];

      const mockFrame = {
        id: "1:1",
        name: "Mixed Frame",
        type: "FRAME",
        visible: true,
        children: mixedChildren,
      } as unknown as Node;

      const simplifiedChildren = mixedChildren.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type as string,
      }));

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockFrame.id,
        name: mockFrame.name,
        type: mockFrame.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockFrame,
        result,
        simplifiedChildren
      );

      expect(result.type).toBe("FRAME");
      expect(filteredChildren).toHaveLength(2);
    });

    it("should collapse group with all SVG-eligible children", () => {
      const svgChildren = [
        {
          id: "1:2",
          name: "Vector",
          type: "VECTOR",
          visible: true,
        },
      ] as unknown as Node[];

      const mockGroup = {
        id: "1:1",
        name: "SVG Group",
        type: "GROUP",
        visible: true,
        children: svgChildren,
      } as unknown as Node;

      const simplifiedChildren = svgChildren.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type as string,
      }));

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockGroup.id,
        name: mockGroup.name,
        type: mockGroup.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockGroup,
        result,
        simplifiedChildren
      );

      expect(result.type).toBe("IMAGE-SVG");
      expect(filteredChildren).toEqual([]);
    });

    it("should collapse instance with all SVG-eligible children", () => {
      const svgChildren = [
        {
          id: "1:2",
          name: "Star",
          type: "STAR",
          visible: true,
        },
      ] as unknown as Node[];

      const mockInstance = {
        id: "1:1",
        name: "SVG Instance",
        type: "INSTANCE",
        visible: true,
        children: svgChildren,
      } as unknown as Node;

      const simplifiedChildren = svgChildren.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type as string,
      }));

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockInstance.id,
        name: mockInstance.name,
        type: mockInstance.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockInstance,
        result,
        simplifiedChildren
      );

      expect(result.type).toBe("IMAGE-SVG");
      expect(filteredChildren).toEqual([]);
    });

    it("should not collapse non-container nodes", () => {
      const svgChildren = [
        {
          id: "1:2",
          name: "Rectangle",
          type: "RECTANGLE",
          visible: true,
        },
      ] as unknown as Node[];

      const mockDocument = {
        id: "1:1",
        name: "DOCUMENT",
        type: "DOCUMENT",
        visible: true,
        children: svgChildren,
      } as unknown as Node;

      const simplifiedChildren = svgChildren.map((child) => ({
        id: child.id,
        name: child.name,
        type: child.type as string,
      }));

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockDocument.id,
        name: mockDocument.name,
        type: mockDocument.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockDocument,
        result,
        simplifiedChildren
      );

      expect(result.type).toBe("DOCUMENT");
      expect(filteredChildren).toHaveLength(1);
    });

    it("should handle empty children array", () => {
      const mockFrame = {
        id: "1:1",
        name: "Empty Frame",
        type: "FRAME",
        visible: true,
        children: [],
      } as unknown as Node;

      const result: {
        id: string;
        name: string;
        type: string;
      } = {
        id: mockFrame.id,
        name: mockFrame.name,
        type: mockFrame.type as string,
      };

      const filteredChildren = collapseSvgContainers(
        mockFrame,
        result,
        []
      );

      // Empty array passes the every() check, so it should collapse
      expect(result.type).toBe("IMAGE-SVG");
      expect(filteredChildren).toEqual([]);
    });
  });
});
