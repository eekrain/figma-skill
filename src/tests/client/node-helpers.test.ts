/**
 * TDD Tests for Node Helpers - API Redesign Feature
 *
 * Test order:
 * 1. Type definitions (compile-time checks)
 * 2. findImages - find image fills in design
 * 3. findText - find text nodes in design
 * 4. findFrames - find frame nodes in design
 * 5. findComponents - find component nodes in design
 * 6. Integration tests
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Import functions to test (will be implemented)
import {
  findComponents,
  findFrames,
  findImages,
  findText,
  withPath,
} from "@/client/node-helpers";
import type { SimplifiedDesign, SimplifiedNode } from "@/extractors/types";

describe("Node Helpers - TDD", () => {
  // =====================================================
  // Test Suite 1: Type Definitions (compile-time)
  // =====================================================
  describe("Type Definitions", () => {
    it("should define NodeWithPath type correctly", () => {
      const nodeWithPath = {
        node: {
          id: "node-1",
          name: "Test",
          type: "FRAME",
        } as SimplifiedNode,
        path: ["Page", "Frame", "Test"],
      };

      expect(nodeWithPath.node.id).toBe("node-1");
      expect(nodeWithPath.path).toEqual(["Page", "Frame", "Test"]);
    });

    it("should define NodeFinder type correctly", () => {
      const finder: (design: SimplifiedDesign) => SimplifiedNode[] = () => [];
      expect(typeof finder).toBe("function");
    });
  });

  // =====================================================
  // Test Suite 2: findImages
  // =====================================================
  describe("findImages", () => {
    it("should find nodes with image fills", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "image-1",
            name: "Photo",
            type: "FRAME",
            fills: [
              {
                type: "IMAGE",
                imageRef: "img_123",
                scaleMode: "FILL",
              },
            ],
          },
          {
            id: "solid-1",
            name: "Background",
            type: "FRAME",
            fills: ["#ffffff"],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const images = findImages(design);
      expect(images).toHaveLength(1);
      expect(images[0].id).toBe("image-1");
    });

    it("should find images in nested structures", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Container",
            type: "FRAME",
            children: [
              {
                id: "image-1",
                name: "Photo",
                type: "RECTANGLE",
                fills: [
                  {
                    type: "IMAGE",
                    imageRef: "img_456",
                    scaleMode: "FILL",
                  },
                ],
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const images = findImages(design);
      expect(images).toHaveLength(1);
      expect(images[0].id).toBe("image-1");
    });

    it("should return empty array when no images found", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "solid-1",
            name: "Background",
            type: "FRAME",
            fills: ["#ffffff"],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const images = findImages(design);
      expect(images).toEqual([]);
    });

    it("should handle gradient fills (not images)", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "gradient-1",
            name: "Gradient",
            type: "FRAME",
            fills: [
              {
                type: "GRADIENT_LINEAR",
                gradient: "linear-gradient(90deg, #ff0000, #0000ff)",
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const images = findImages(design);
      expect(images).toEqual([]);
    });
  });

  // =====================================================
  // Test Suite 3: findText
  // =====================================================
  describe("findText", () => {
    it("should find all text nodes", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "text-1",
            name: "Heading",
            type: "TEXT",
            text: "Welcome",
          },
          {
            id: "text-2",
            name: "Body",
            type: "TEXT",
            text: "Lorem ipsum",
          },
          {
            id: "frame-1",
            name: "Container",
            type: "FRAME",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const textNodes = findText(design);
      expect(textNodes).toHaveLength(2);
      expect(textNodes.map((n: SimplifiedNode) => n.id)).toEqual(
        expect.arrayContaining(["text-1", "text-2"])
      );
    });

    it("should find text in nested structures", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Card",
            type: "FRAME",
            children: [
              {
                id: "text-1",
                name: "Title",
                type: "TEXT",
                text: "Card Title",
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const textNodes = findText(design);
      expect(textNodes).toHaveLength(1);
      expect(textNodes[0].id).toBe("text-1");
    });

    it("should filter by text content when provided", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "text-1",
            name: "Title",
            type: "TEXT",
            text: "Welcome",
          },
          {
            id: "text-2",
            name: "Body",
            type: "TEXT",
            text: "Lorem ipsum",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const welcomeText = findText(design, "Welcome");
      expect(welcomeText).toHaveLength(1);
      expect(welcomeText[0].id).toBe("text-1");
    });

    it("should support regex filtering", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "text-1",
            name: "Title",
            type: "TEXT",
            text: "Heading 1",
          },
          {
            id: "text-2",
            name: "Title2",
            type: "TEXT",
            text: "Heading 2",
          },
          {
            id: "text-3",
            name: "Body",
            type: "TEXT",
            text: "Lorem ipsum",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const headings = findText(design, /^Heading/);
      expect(headings).toHaveLength(2);
    });
  });

  // =====================================================
  // Test Suite 4: findFrames
  // =====================================================
  describe("findFrames", () => {
    it("should find all frame nodes", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Frame 1",
            type: "FRAME",
          },
          {
            id: "frame-2",
            name: "Frame 2",
            type: "FRAME",
          },
          {
            id: "text-1",
            name: "Text",
            type: "TEXT",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const frames = findFrames(design);
      expect(frames).toHaveLength(2);
      expect(frames.map((f: SimplifiedNode) => f.id)).toEqual([
        "frame-1",
        "frame-2",
      ]);
    });

    it("should find frames in nested structures", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "page-1",
            name: "Page",
            type: "PAGE",
            children: [
              {
                id: "frame-1",
                name: "Frame",
                type: "FRAME",
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const frames = findFrames(design);
      expect(frames).toHaveLength(1);
      expect(frames[0].id).toBe("frame-1");
    });

    it("should filter by name when provided", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Button",
            type: "FRAME",
          },
          {
            id: "frame-2",
            name: "Card",
            type: "FRAME",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const buttons = findFrames(design, "Button");
      expect(buttons).toHaveLength(1);
      expect(buttons[0].name).toBe("Button");
    });
  });

  // =====================================================
  // Test Suite 5: findComponents
  // =====================================================
  describe("findComponents", () => {
    it("should find nodes with componentId", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "instance-1",
            name: "Button",
            type: "INSTANCE",
            componentId: "comp-1",
            componentProperties: [
              { name: "label", value: "Click me", type: "TEXT" },
            ],
          },
          {
            id: "frame-1",
            name: "Container",
            type: "FRAME",
          },
        ],
        components: {
          "comp-1": {
            key: "comp-1",
            id: "comp-1",
            name: "Button",
          },
        },
        componentSets: {},
        globalVars: { styles: {} },
      };

      const components = findComponents(design);
      expect(components).toHaveLength(1);
      expect(components[0].id).toBe("instance-1");
    });

    it("should find components in nested structures", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Page",
            type: "FRAME",
            children: [
              {
                id: "instance-1",
                name: "Button",
                type: "INSTANCE",
                componentId: "comp-1",
              },
            ],
          },
        ],
        components: {
          "comp-1": {
            key: "comp-1",
            id: "comp-1",
            name: "Button",
          },
        },
        componentSets: {},
        globalVars: { styles: {} },
      };

      const components = findComponents(design);
      expect(components).toHaveLength(1);
      expect(components[0].id).toBe("instance-1");
    });

    it("should filter by component key", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "instance-1",
            name: "Button Primary",
            type: "INSTANCE",
            componentId: "button-primary",
          },
          {
            id: "instance-2",
            name: "Button Secondary",
            type: "INSTANCE",
            componentId: "button-secondary",
          },
        ],
        components: {
          "button-primary": {
            key: "button-primary",
            id: "button-primary",
            name: "Button Primary",
          },
          "button-secondary": {
            key: "button-secondary",
            id: "button-secondary",
            name: "Button Secondary",
          },
        },
        componentSets: {},
        globalVars: { styles: {} },
      };

      const primaryButtons = findComponents(design, "button-primary");
      expect(primaryButtons).toHaveLength(1);
      expect(primaryButtons[0].componentId).toBe("button-primary");
    });

    it("should return empty array when no components found", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Container",
            type: "FRAME",
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const components = findComponents(design);
      expect(components).toEqual([]);
    });
  });

  // =====================================================
  // Test Suite 6: withPath helper
  // =====================================================
  describe("withPath", () => {
    it("should add path information to nodes", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "frame-1",
            name: "Page",
            type: "FRAME",
            children: [
              {
                id: "text-1",
                name: "Title",
                type: "TEXT",
                text: "Hello",
              },
            ],
          },
        ],
        components: {},
        componentSets: {},
        globalVars: { styles: {} },
      };

      const textNodes = findText(design);
      const withPathNodes = withPath(textNodes, design);

      expect(withPathNodes).toHaveLength(1);
      expect(withPathNodes[0].path).toEqual(["Page", "Title"]);
    });
  });

  // =====================================================
  // Test Suite 7: Integration
  // =====================================================
  describe("Integration", () => {
    it("should work with complex nested designs", () => {
      const design: SimplifiedDesign = {
        name: "test",
        nodes: [
          {
            id: "page-1",
            name: "Desktop",
            type: "PAGE",
            children: [
              {
                id: "frame-1",
                name: "Header",
                type: "FRAME",
                children: [
                  {
                    id: "instance-1",
                    name: "Logo",
                    type: "COMPONENT",
                    componentId: "logo-comp",
                  },
                  {
                    id: "text-1",
                    name: "Title",
                    type: "TEXT",
                    text: "Welcome",
                  },
                ],
              },
              {
                id: "frame-2",
                name: "Content",
                type: "FRAME",
                children: [
                  {
                    id: "image-1",
                    name: "Hero",
                    type: "RECTANGLE",
                    fills: [
                      {
                        type: "IMAGE",
                        imageRef: "img_789",
                        scaleMode: "FILL",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        components: {
          "logo-comp": {
            key: "logo-comp",
            id: "logo-comp",
            name: "Logo",
          },
        },
        componentSets: {},
        globalVars: { styles: {} },
      };

      const images = findImages(design);
      const textNodes = findText(design);
      const frames = findFrames(design);
      const components = findComponents(design);

      expect(images).toHaveLength(1);
      expect(textNodes).toHaveLength(1);
      expect(frames).toHaveLength(2); // Header, Content
      expect(components).toHaveLength(1);
    });
  });
});
