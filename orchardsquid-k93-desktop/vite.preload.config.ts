import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  build: {
    target: "esnext",
    sourcemap: mode === "development",
  },
  resolve: { tsconfigPaths: true },
}));
