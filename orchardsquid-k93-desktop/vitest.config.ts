import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    name: { label: "orchardsquid-k93-desktop", color: "cyan" },
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
