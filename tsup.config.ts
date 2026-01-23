import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/extractors/index.ts",
    "src/transformers/index.ts",
    "src/streaming/index.ts",
    "src/compression/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: "es2022",
  minify: false,
});
