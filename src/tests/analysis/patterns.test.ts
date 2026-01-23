/**
 * Tests for design pattern detection
 */
import { describe, expect, it } from "@jest/globals";

import { buildAtomicHierarchy, detectPatterns } from "@/analysis/patterns";
import type { ComponentAnalysis } from "@/analysis/types";

describe("Design Pattern Detection", () => {
  const createMockComponent = (
    name: string,
    atomicLevel: ComponentAnalysis["atomicLevel"],
    props: ComponentAnalysis["props"] = []
  ): ComponentAnalysis => ({
    key: name.toLowerCase().replace(/\s+/g, "-"),
    id: `comp-${name}`,
    name,
    atomicLevel,
    tags: [atomicLevel],
    variants: [],
    props,
    slots: [],
    readiness: {
      score: 80,
      ready: true,
      missing: [],
      warnings: [],
      suggestions: [],
    },
    codeHints: {},
  });

  describe("detectPatterns", () => {
    it("should detect button system pattern", () => {
      const components: Record<string, ComponentAnalysis> = {
        "button-primary": createMockComponent("Button Primary", "atoms", [
          {
            name: "variant",
            type: "enum",
            enumValues: ["primary", "secondary", "ghost"],
            required: false,
          },
        ]),
        "button-secondary": createMockComponent("Button Secondary", "atoms"),
        "icon-button": createMockComponent("Icon Button", "atoms"),
      };

      const patterns = detectPatterns(components);

      const buttonPattern = patterns.find((p) => p.name === "Button System");
      expect(buttonPattern).toBeDefined();
      expect(buttonPattern?.components.length).toBe(3);
      expect(buttonPattern?.description).toContain("button");
    });

    it("should detect card pattern", () => {
      const components: Record<string, ComponentAnalysis> = {
        "card-basic": createMockComponent("Card Basic", "molecules"),
        "card-media": createMockComponent("Card Media", "molecules"),
        "card-product": createMockComponent("Product Card", "molecules"),
      };

      const patterns = detectPatterns(components);

      const cardPattern = patterns.find((p) => p.name === "Card Pattern");
      expect(cardPattern).toBeDefined();
      expect(cardPattern?.components.length).toBe(3);
    });

    it("should detect form input system", () => {
      const components: Record<string, ComponentAnalysis> = {
        "text-input": createMockComponent("Text Input", "atoms"),
        "number-field": createMockComponent("Number Field", "atoms"),
        "password-input": createMockComponent("Password Input", "atoms"),
      };

      const patterns = detectPatterns(components);

      const inputPattern = patterns.find((p) => p.name === "Form Input System");
      expect(inputPattern).toBeDefined();
      expect(inputPattern?.components.length).toBeGreaterThanOrEqual(3);
    });

    it("should detect navigation pattern", () => {
      const components: Record<string, ComponentAnalysis> = {
        "main-nav": createMockComponent("Main Nav", "organisms"),
        "menu-bar": createMockComponent("Menu Bar", "molecules"),
        "header-nav": createMockComponent("Header Nav", "organisms"),
      };

      const patterns = detectPatterns(components);

      const navPattern = patterns.find((p) => p.name === "Navigation Pattern");
      expect(navPattern).toBeDefined();
      expect(navPattern?.components.length).toBeGreaterThan(0);
    });

    it("should detect size scale patterns", () => {
      const components: Record<string, ComponentAnalysis> = {
        button: createMockComponent("Button", "atoms", [
          {
            name: "size",
            type: "enum",
            enumValues: ["sm", "md", "lg"],
            required: false,
          },
        ]),
        input: createMockComponent("Input", "atoms", [
          {
            name: "size",
            type: "enum",
            enumValues: ["sm", "md", "lg", "xl"],
            required: false,
          },
        ]),
      };

      const patterns = detectPatterns(components);

      const sizePattern = patterns.find((p) => p.name.startsWith("Size Scale"));
      expect(sizePattern).toBeDefined();
      expect(sizePattern?.description).toContain("size");
    });

    it("should detect color variant patterns", () => {
      const components: Record<string, ComponentAnalysis> = {
        button: createMockComponent("Button", "atoms", [
          {
            name: "variant",
            type: "enum",
            enumValues: ["primary", "secondary", "ghost"],
            required: false,
          },
        ]),
        badge: createMockComponent("Badge", "atoms", [
          {
            name: "color",
            type: "enum",
            enumValues: ["success", "warning", "error"],
            required: false,
          },
        ]),
      };

      const patterns = detectPatterns(components);

      const variantPattern = patterns.find((p) =>
        p.name.startsWith("Color Variant")
      );
      expect(variantPattern).toBeDefined();
    });

    it("should handle empty components", () => {
      const patterns = detectPatterns({});

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("should not create duplicate patterns", () => {
      const components: Record<string, ComponentAnalysis> = {
        "button-1": createMockComponent("Button 1", "atoms"),
        "button-2": createMockComponent("Button 2", "atoms"),
      };

      const patterns = detectPatterns(components);

      const buttonPatterns = patterns.filter((p) => p.name === "Button System");
      expect(buttonPatterns.length).toBe(1);
    });
  });

  describe("buildAtomicHierarchy", () => {
    it("should categorize components by atomic level", () => {
      const components: Record<string, ComponentAnalysis> = {
        button: createMockComponent("Button", "atoms"),
        icon: createMockComponent("Icon", "atoms"),
        card: createMockComponent("Card", "molecules"),
        form: createMockComponent("Form", "molecules"),
        navbar: createMockComponent("Navbar", "organisms"),
        layout: createMockComponent("Layout", "templates"),
      };

      const hierarchy = buildAtomicHierarchy(components);

      expect(hierarchy.atoms).toContain("button");
      expect(hierarchy.atoms).toContain("icon");
      expect(hierarchy.molecules).toContain("card");
      expect(hierarchy.molecules).toContain("form");
      expect(hierarchy.organisms).toContain("navbar");
      expect(hierarchy.templates).toContain("layout");
    });

    it("should handle empty components", () => {
      const hierarchy = buildAtomicHierarchy({});

      expect(hierarchy.atoms).toHaveLength(0);
      expect(hierarchy.molecules).toHaveLength(0);
      expect(hierarchy.organisms).toHaveLength(0);
      expect(hierarchy.templates).toHaveLength(0);
      expect(hierarchy.pages).toHaveLength(0);
    });

    it("should include all atomic levels in result", () => {
      const components: Record<string, ComponentAnalysis> = {
        component: createMockComponent("Component", "atoms"),
      };

      const hierarchy = buildAtomicHierarchy(components);

      expect(hierarchy).toHaveProperty("atoms");
      expect(hierarchy).toHaveProperty("molecules");
      expect(hierarchy).toHaveProperty("organisms");
      expect(hierarchy).toHaveProperty("templates");
      expect(hierarchy).toHaveProperty("pages");
    });

    it("should return component keys, not component objects", () => {
      const components: Record<string, ComponentAnalysis> = {
        "button-primary": createMockComponent("Button Primary", "atoms"),
      };

      const hierarchy = buildAtomicHierarchy(components);

      expect(hierarchy.atoms[0]).toBe("button-primary");
      expect(typeof hierarchy.atoms[0]).toBe("string");
    });
  });

  describe("Pattern Components", () => {
    it("should include all matching components in pattern", () => {
      const components: Record<string, ComponentAnalysis> = {
        "btn-primary": createMockComponent("Primary Button", "atoms"),
        "btn-secondary": createMockComponent("Secondary Button", "atoms"),
        "btn-ghost": createMockComponent("Ghost Button", "atoms"),
      };

      const patterns = detectPatterns(components);
      const buttonPattern = patterns.find((p) => p.name === "Button System");

      expect(buttonPattern?.components).toHaveLength(3);
      expect(buttonPattern?.components).toContain("primary-button");
      expect(buttonPattern?.components).toContain("secondary-button");
      expect(buttonPattern?.components).toContain("ghost-button");
    });
  });

  describe("Pattern Guidance", () => {
    it("should provide usage guidance", () => {
      const components: Record<string, ComponentAnalysis> = {
        button: createMockComponent("Button", "atoms"),
      };

      const patterns = detectPatterns(components);
      const buttonPattern = patterns.find((p) => p.name === "Button System");

      expect(buttonPattern?.usage).toBeDefined();
      expect(buttonPattern?.usage.length).toBeGreaterThan(0);
    });

    it("should provide implementation guidance", () => {
      const components: Record<string, ComponentAnalysis> = {
        button: createMockComponent("Button", "atoms"),
      };

      const patterns = detectPatterns(components);
      const buttonPattern = patterns.find((p) => p.name === "Button System");

      expect(buttonPattern?.implementation).toBeDefined();
      expect(buttonPattern?.implementation.length).toBeGreaterThan(0);
    });
  });
});
