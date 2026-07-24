import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/node_modules.dataless-backup-*/**",
      "**/.git*/**",
      "**/.next/**",
      "**/tests/e2e/**",
    ],
    coverage: {
      reporter: ["text", "html"],
    },
    pool: "forks",
    maxWorkers: 1,
  },
});
