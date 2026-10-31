import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"] },
});
