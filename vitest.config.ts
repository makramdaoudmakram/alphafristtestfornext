import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next builds .tsx with SWC; Vitest uses esbuild, which would emit the classic
  // React.createElement runtime that no source file imports.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
