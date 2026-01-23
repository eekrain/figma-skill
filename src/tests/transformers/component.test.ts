/**
 * Tests for transformers/component module
 *
 * Tests component and component set simplification functions.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  type SimplifiedComponentDefinition,
  type SimplifiedComponentSetDefinition,
  simplifyComponentSets,
  simplifyComponents,
} from "@/transformers/component";

describe("transformers/component", () => {
  let mockComponents: Record<string, import("@figma/rest-api-spec").Component>;
  let mockComponentSets: Record<
    string,
    import("@figma/rest-api-spec").ComponentSet
  >;

  beforeEach(() => {
    // Create mock components
    mockComponents = {
      "comp-1": {
        key: "comp-1-key",
        id: "comp-1",
        name: "Button",
        componentSetId: "set-1",
        description: "A button component",
        documentationLinks: [],
        remote: false,
      } as import("@figma/rest-api-spec").Component,
      "comp-2": {
        key: "comp-2-key",
        id: "comp-2",
        name: "Button Primary",
        componentSetId: "set-1",
        description: "Primary button variant",
        documentationLinks: [],
        remote: false,
      } as import("@figma/rest-api-spec").Component,
      "comp-3": {
        key: "comp-3-key",
        id: "comp-3",
        name: "Standalone Card",
        description: "A standalone card component",
        documentationLinks: [],
        remote: false,
      } as any as import("@figma/rest-api-spec").Component,
    };

    // Create mock component sets
    mockComponentSets = {
      "set-1": {
        key: "set-1-key",
        id: "set-1",
        name: "Button Set",
        description: "Button component set",
      } as import("@figma/rest-api-spec").ComponentSet,
      "set-2": {
        key: "set-2-key",
        id: "set-2",
        name: "Input Set",
        description: "Input component set",
      } as import("@figma/rest-api-spec").ComponentSet,
    };
  });

  // =====================================================
  // Test Suite 1: simplifyComponents
  // =====================================================
  describe("simplifyComponents", () => {
    it("should simplify component definitions", () => {
      const result = simplifyComponents(mockComponents);

      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(3);
    });

    it("should preserve component ID", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-1"].id).toBe("comp-1");
      expect(result["comp-2"].id).toBe("comp-2");
      expect(result["comp-3"].id).toBe("comp-3");
    });

    it("should preserve component key", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-1"].key).toBe("comp-1-key");
      expect(result["comp-2"].key).toBe("comp-2-key");
    });

    it("should preserve component name", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-1"].name).toBe("Button");
      expect(result["comp-2"].name).toBe("Button Primary");
    });

    it("should preserve componentSetId when present", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-1"].componentSetId).toBe("set-1");
      expect(result["comp-2"].componentSetId).toBe("set-1");
    });

    it("should set componentSetId to undefined when null", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-3"].componentSetId).toBeUndefined();
    });

    it("should preserve description when present", () => {
      const result = simplifyComponents(mockComponents);

      expect(result["comp-1"].description).toBe("A button component");
      expect(result["comp-2"].description).toBe("Primary button variant");
    });

    it("should set description to undefined when missing", () => {
      // Create a component without description
      const noDescComponents = {
        "comp-no-desc": {
          key: "comp-no-desc-key",
          id: "comp-no-desc",
          name: "No Desc",
          componentSetId: undefined,
          description: "A component",
          documentationLinks: [],
          remote: false,
        } as import("@figma/rest-api-spec").Component,
      };
      // Remove the description property from the type
      const { description: _, ...compWithoutDesc } =
        noDescComponents["comp-no-desc"];
      const componentsWithoutDesc = {
        "comp-no-desc":
          compWithoutDesc as any as import("@figma/rest-api-spec").Component,
      };

      const result = simplifyComponents(componentsWithoutDesc);

      expect(result["comp-no-desc"].description).toBeUndefined();
    });

    it("should handle empty components object", () => {
      const result = simplifyComponents({});

      expect(result).toEqual({});
    });

    it("should handle single component", () => {
      const singleComponent = {
        "comp-1": mockComponents["comp-1"],
      };
      const result = simplifyComponents(singleComponent);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result["comp-1"].name).toBe("Button");
    });

    it("should return correct TypeScript type", () => {
      const result = simplifyComponents(mockComponents);

      // Type assertion test - this will compile correctly only if types match
      const simplified: Record<string, SimplifiedComponentDefinition> = result;
      expect(simplified).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 2: simplifyComponentSets
  // =====================================================
  describe("simplifyComponentSets", () => {
    it("should simplify component set definitions", () => {
      const result = simplifyComponentSets(mockComponentSets);

      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(2);
    });

    it("should preserve component set ID", () => {
      const result = simplifyComponentSets(mockComponentSets);

      expect(result["set-1"].id).toBe("set-1");
      expect(result["set-2"].id).toBe("set-2");
    });

    it("should preserve component set key", () => {
      const result = simplifyComponentSets(mockComponentSets);

      expect(result["set-1"].key).toBe("set-1-key");
      expect(result["set-2"].key).toBe("set-2-key");
    });

    it("should preserve component set name", () => {
      const result = simplifyComponentSets(mockComponentSets);

      expect(result["set-1"].name).toBe("Button Set");
      expect(result["set-2"].name).toBe("Input Set");
    });

    it("should return empty componentKeys when components not provided", () => {
      const result = simplifyComponentSets(mockComponentSets);

      expect(result["set-1"].componentKeys).toEqual([]);
      expect(result["set-2"].componentKeys).toEqual([]);
    });

    it("should populate componentKeys when components provided", () => {
      const result = simplifyComponentSets(mockComponentSets, mockComponents);

      // set-1 should have comp-1 and comp-2 keys
      expect(result["set-1"].componentKeys).toContain("comp-1-key");
      expect(result["set-1"].componentKeys).toContain("comp-2-key");
    });

    it("should not include components from other sets", () => {
      const result = simplifyComponentSets(mockComponentSets, mockComponents);

      // comp-3 is standalone (componentSetId: null), not in set-1
      expect(result["set-1"].componentKeys).not.toContain("comp-3-key");
    });

    it("should handle empty componentSets object", () => {
      const result = simplifyComponentSets({});

      expect(result).toEqual({});
    });

    it("should handle single component set", () => {
      const singleSet = {
        "set-1": mockComponentSets["set-1"],
      };
      const result = simplifyComponentSets(singleSet);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result["set-1"].name).toBe("Button Set");
    });

    it("should return correct TypeScript type", () => {
      const result = simplifyComponentSets(mockComponentSets);

      // Type assertion test
      const simplified: Record<string, SimplifiedComponentSetDefinition> =
        result;
      expect(simplified).toBeDefined();
    });
  });

  // =====================================================
  // Test Suite 3: Edge Cases
  // =====================================================
  describe("Edge cases", () => {
    it("should handle components with undefined properties", () => {
      const componentWithUndefined: Record<
        string,
        import("@figma/rest-api-spec").Component
      > = {
        "comp-1": {
          key: "comp-1-key",
          id: "comp-1",
          name: "Test",
          componentSetId: undefined,
          description: "Test component",
          documentationLinks: [],
          remote: false,
        } as any, // Component type requires all properties
      };

      const result = simplifyComponents(componentWithUndefined);

      expect(result["comp-1"].componentSetId).toBeUndefined();
      expect(result["comp-1"].description).toBe("Test component");
    });

    it("should handle component sets with no matching components", () => {
      const result = simplifyComponentSets(mockComponentSets, mockComponents);

      // set-2 has no components with componentSetId === "set-2"
      expect(result["set-2"].componentKeys).toEqual([]);
    });

    it("should handle component sets with all components in set", () => {
      // All three components point to set-1
      mockComponents["comp-3"].componentSetId = "set-1";

      const result = simplifyComponentSets(mockComponentSets, mockComponents);

      expect(result["set-1"].componentKeys).toHaveLength(3);
    });
  });

  // =====================================================
  // Test Suite 4: Integration
  // =====================================================
  describe("Integration", () => {
    it("should work together for complete simplification", () => {
      const simplifiedComponents = simplifyComponents(mockComponents);
      const simplifiedSets = simplifyComponentSets(
        mockComponentSets,
        mockComponents
      );

      // Verify all data is preserved
      expect(Object.keys(simplifiedComponents)).toHaveLength(3);
      expect(Object.keys(simplifiedSets)).toHaveLength(2);

      // Verify relationship is preserved
      expect(simplifiedSets["set-1"].componentKeys).toContain("comp-1-key");
      expect(simplifiedComponents["comp-1"].componentSetId).toBe("set-1");
    });

    it("should handle circular references gracefully", () => {
      // Create a component that references its own set
      const selfRefSet: Record<
        string,
        import("@figma/rest-api-spec").ComponentSet
      > = {
        "set-1": {
          key: "set-1-key",
          id: "set-1",
          name: "Self Ref Set",
          description: "Self referencing set",
        } as any, // ComponentSet type requires all properties
      };

      const selfRefComponent: Record<
        string,
        import("@figma/rest-api-spec").Component
      > = {
        "comp-1": {
          key: "comp-1-key",
          id: "comp-1",
          name: "Self Ref Component",
          componentSetId: "set-1",
          description: "Component",
          documentationLinks: [],
          remote: false,
        } as any, // Component type requires all properties
      };

      const simplifiedSets = simplifyComponentSets(
        selfRefSet,
        selfRefComponent
      );

      expect(simplifiedSets["set-1"].componentKeys).toContain("comp-1-key");
    });
  });

  // =====================================================
  // Test Suite 5: Type Definitions
  // =====================================================
  describe("Type definitions", () => {
    it("should define ComponentProperties type correctly", () => {
      // Type check at compile time
      const props: import("@/transformers/component").ComponentProperties = {
        name: "test",
        value: "test-value",
        type: "VARIANT",
      };

      expect(props.name).toBe("test");
      expect(props.type).toBe("VARIANT");
    });

    it("should define SimplifiedComponentDefinition type correctly", () => {
      const def: SimplifiedComponentDefinition = {
        id: "comp-1",
        key: "comp-1-key",
        name: "Button",
        componentSetId: "set-1",
        description: "A button",
      };

      expect(def.id).toBe("comp-1");
      expect(def.key).toBe("comp-1-key");
    });

    it("should define SimplifiedComponentSetDefinition type correctly", () => {
      const def: SimplifiedComponentSetDefinition = {
        id: "set-1",
        key: "set-1-key",
        name: "Button Set",
        componentKeys: ["comp-1", "comp-2"],
      };

      expect(def.id).toBe("set-1");
      expect(def.componentKeys).toHaveLength(2);
    });
  });
});
