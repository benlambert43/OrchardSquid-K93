import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  build: {
    target: "esnext",
    sourcemap: mode === "development",
    rolldownOptions: { external: ["cpu-features"] },
  },
  resolve: { tsconfigPaths: true },
}));
