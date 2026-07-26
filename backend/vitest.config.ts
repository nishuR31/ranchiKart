import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "tests/"],
    },
    reporters: ["default", "html"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
