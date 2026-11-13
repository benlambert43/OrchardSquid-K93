import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { contentSecurityPolicy } from "./src/contentSecurityPolicy.ts";
import { envSchema } from "./src/envSchema.ts";

function loadAppEnv(mode: string) {
  const parsed = envSchema.safeParse(
    loadEnv(mode, import.meta.dirname, "VITE_"),
  );
  if (!parsed.success) {
    throw new Error(
      `Set VITE_API_BASE_URL in .env (see .env.template) or in the environment: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

export default defineConfig(({ mode }) => {
  const env = loadAppEnv(mode);
  return {
    build: { target: "esnext" },
    server: {
      port: 5173,
      strictPort: true,
      headers: {
        "Content-Security-Policy": contentSecurityPolicy(
          env.VITE_API_BASE_URL,
          { devServer: true },
        ),
      },
    },
    resolve: { tsconfigPaths: true },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
  };
});
