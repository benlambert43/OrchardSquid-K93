import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { contentSecurityPolicy } from "./src/contentSecurityPolicy.ts";

export default defineConfig({
  build: { target: "esnext" },
  server: {
    headers: {
      "Content-Security-Policy": contentSecurityPolicy({ devServer: true }),
    },
  },
  resolve: { tsconfigPaths: true, preserveSymlinks: false },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
});
