/**
 * Tests for code hints generation
 */
import { describe, expect, it } from "@jest/globals";

import { generateCodeHints } from "@/analysis/code-hints";
import type { InferredProp } from "@/analysis/types";

describe("Code Hints Generation", () => {
  const createMockProps = (): InferredProp[] => [
    {
      name: "variant",
      type: "enum",
      enumValues: ["primary", "secondary", "ghost"],
      defaultValue: "primary",
      required: false,
      description: "Button variant style",
      tsType: '"primary" | "secondary" | "ghost"',
    },
    {
      name: "size",
      type: "enum",
      enumValues: ["sm", "md", "lg"],
      defaultValue: "md",
      required: false,
      description: "Button size",
      tsType: '"sm" | "md" | "lg"',
    },
    {
      name: "disabled",
      type: "boolean",
      defaultValue: "false",
      required: false,
      description: "Disable the button",
    },
    {
      name: "children",
      type: "ReactNode",
      required: false,
      description: "Button content",
    },
    {
      name: "onClick",
      type: "string",
      required: true,
      description: "Click handler",
    },
  ];

  describe("generateCodeHints", () => {
    it("should generate React hints", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react).toBeDefined();
      expect(hints.react?.componentName).toBe("Button");
      expect(hints.react?.propsInterface).toContain(
        "export interface ButtonProps"
      );
      expect(hints.react?.propsInterface).toContain("variant?:");
      expect(hints.react?.propsInterface).toContain("size?:");
      expect(hints.react?.propsInterface).toContain("disabled?:");
      expect(hints.react?.propsInterface).toMatch(/children\??/);
      expect(hints.react?.propsInterface).toContain("onClick:");
      expect(hints.react?.usageExample).toContain("<Button");
    });

    it("should generate Vue hints", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["vue"]);

      expect(hints.vue).toBeDefined();
      expect(hints.vue?.componentName).toBe("Button");
      expect(hints.vue?.propsDefinition).toContain(
        "const props = defineProps({"
      );
      expect(hints.vue?.propsDefinition).toContain("variant:");
      expect(hints.vue?.propsDefinition).toContain("size:");
      expect(hints.vue?.usageExample).toContain("<Button");
    });

    it("should generate hints for both React and Vue", () => {
      const hints = generateCodeHints("Button", createMockProps(), [
        "react",
        "vue",
      ]);

      expect(hints.react).toBeDefined();
      expect(hints.vue).toBeDefined();
    });

    it("should generate accessibility props for buttons", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.a11yProps).toBeDefined();
      expect(hints.react?.a11yProps).toContain("aria-label");
      expect(hints.react?.a11yProps).toContain("aria-disabled");
      expect(hints.react?.a11yProps).toContain("aria-pressed");
    });

    it("should generate accessibility props for inputs", () => {
      const hints = generateCodeHints("Input", createMockProps(), ["react"]);

      expect(hints.react?.a11yProps).toBeDefined();
      expect(hints.react?.a11yProps).toContain("aria-label");
      expect(hints.react?.a11yProps).toContain("aria-invalid");
      expect(hints.react?.a11yProps).toContain("aria-describedby");
    });

    it("should generate accessibility props for dialogs", () => {
      const hints = generateCodeHints("Dialog", createMockProps(), ["react"]);

      expect(hints.react?.a11yProps).toBeDefined();
      expect(hints.react?.a11yProps).toContain("aria-labelledby");
      expect(hints.react?.a11yProps).toContain("aria-describedby");
      expect(hints.react?.a11yProps).toContain('role="dialog"');
    });

    it("should handle empty props", () => {
      const hints = generateCodeHints("SimpleBox", [], ["react"]);

      expect(hints.react?.componentName).toBe("SimpleBox");
      expect(hints.react?.propsInterface).toContain(
        "export interface SimpleBoxProps {"
      );
      expect(hints.react?.propsInterface).toContain("}");
      expect(hints.react?.usageExample).toContain("<SimpleBox />");
    });
  });

  describe("React Props Interface Generation", () => {
    it("should include prop descriptions as comments", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.propsInterface).toContain(
        "/** Button variant style */"
      );
      expect(hints.react?.propsInterface).toContain(
        "/** Disable the button */"
      );
    });

    it("should mark required props without question mark", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.propsInterface).toContain("onClick:");
      expect(hints.react?.propsInterface).toContain("variant?:");
    });

    it("should use TypeScript union types for enums", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.propsInterface).toContain(
        '"primary" | "secondary" | "ghost"'
      );
    });
  });

  describe("Vue Props Definition Generation", () => {
    it("should include required flag for required props", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["vue"]);

      expect(hints.vue?.propsDefinition).toContain("onClick:");
      expect(hints.vue?.propsDefinition).toContain("required: true");
    });

    it("should include default values for optional props", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["vue"]);

      expect(hints.vue?.propsDefinition).toContain("default:");
    });

    it("should map prop types correctly", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["vue"]);

      expect(hints.vue?.propsDefinition).toContain("type: String");
      expect(hints.vue?.propsDefinition).toContain("type: Boolean");
    });
  });

  describe("Usage Examples", () => {
    it("should generate React usage with required props", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.usageExample).toContain("onClick=");
    });

    it("should generate multi-line React usage when props exist", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["react"]);

      expect(hints.react?.usageExample).toContain("\n");
    });

    it("should generate Vue usage with v-bind syntax", () => {
      const hints = generateCodeHints("Button", createMockProps(), ["vue"]);

      expect(hints.vue?.usageExample).toContain(":onClick=");
    });
  });

  describe("Component Name Conversion", () => {
    it("should convert kebab-case to PascalCase", () => {
      const hints = generateCodeHints("my-button", [], ["react"]);

      expect(hints.react?.componentName).toBe("MyButton");
    });

    it("should convert snake_case to PascalCase", () => {
      const hints = generateCodeHints("my_button", [], ["react"]);

      expect(hints.react?.componentName).toBe("MyButton");
    });

    it("should handle mixed case", () => {
      const hints = generateCodeHints("myAwesome-button", [], ["react"]);

      expect(hints.react?.componentName).toBe("MyAwesomeButton");
    });

    it("should capitalize first letter", () => {
      const hints = generateCodeHints("button", [], ["react"]);

      expect(hints.react?.componentName).toBe("Button");
    });
  });
});
