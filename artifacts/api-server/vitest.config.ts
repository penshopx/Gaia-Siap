import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Run test files in-process so vi.mock hoisting works across the suite
    pool: "forks",
    singleFork: true,
    // Resolve workspace packages (e.g. @workspace/db) from source
    alias: {
      "@workspace/db": new URL("../../lib/db/src/index.ts", import.meta.url)
        .pathname,
      "@workspace/api-zod": new URL(
        "../../lib/api-zod/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
});
