import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the React Router plugin is not needed in tests.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
  },
});
