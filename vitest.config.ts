import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/layer1/**/*.test.ts", "tests/layer4/**/*.test.ts"],
    testTimeout: 600_000,
  },
});
