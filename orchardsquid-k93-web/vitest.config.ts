import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    name: { label: "orchardsquid-k93-web", color: "magenta" },
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
