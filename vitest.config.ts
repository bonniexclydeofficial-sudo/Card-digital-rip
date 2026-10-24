import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "db/test/**/*.test.ts",
      "app/test/**/*.test.ts",
    ],
    environment: "node",
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app"),
      "@cdr/econ": path.resolve(__dirname, "packages/econ/src/index.ts"),
      "@cdr/fair": path.resolve(__dirname, "packages/fair/src/index.ts"),
      "@cdr/risk": path.resolve(__dirname, "packages/risk/src/index.ts"),
      "@cdr/db": path.resolve(__dirname, "db/src/index.ts"),
    },
  },
});
