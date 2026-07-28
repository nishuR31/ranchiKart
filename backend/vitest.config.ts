import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ranchikart_test";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: process.env.DIRECT_URL || databaseUrl,
    },
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "tests/"],
    },
    reporters: ["default"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});