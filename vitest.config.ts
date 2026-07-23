import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/worker/**/*.test.ts", "src/web/**/*.test.ts"],
  },
});
