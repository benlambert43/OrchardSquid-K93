import { builtinModules, createRequire } from "node:module";
import path from "node:path";

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const nodeGlobals = Object.keys(globals.node).filter(
  (name) => !(name in globals.browser),
);

const browserGlobals = Object.keys(globals.browser).filter(
  (name) => !(name in globals.node),
);

const nodeModules = ["node:*", ...builtinModules];

const { version: reactVersion } = createRequire(import.meta.url)(
  "react/package.json",
) as { version: string };

export default defineConfig([
  globalIgnores(["**/.next/", "**/coverage/", "**/next-env.d.ts"]),
  js.configs.recommended,
  {
    basePath: "orchardsquid-k93-web",
    extends: [nextVitals, nextTs],
    settings: {
      next: { rootDir: path.join(import.meta.dirname, "orchardsquid-k93-web") },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["orchardsquid-k93-shared/**", "orchardsquid-k93-server/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Decorator",
          message:
            "Node.js runs this code without a build step and cannot strip decorators.",
        },
        {
          selector: "AccessorProperty",
          message:
            "Node.js runs this code without a build step and cannot strip accessor fields.",
        },
      ],
    },
  },
  {
    files: ["orchardsquid-k93-shared/src/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...browserGlobals.map((name) => ({
          name,
          message:
            "This code runs in Node.js as well as in browser windows, so use only what both have.",
        })),
      ],
    },
  },
  {
    files: [
      "orchardsquid-k93-ui/src/**/*.{ts,tsx}",
      "orchardsquid-k93-desktop/src/renderer/**/*.{ts,tsx}",
    ],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    settings: { react: { version: reactVersion } },
    rules: {
      "no-restricted-globals": [
        "error",
        ...nodeGlobals.map((name) => ({
          name,
          message:
            "This code runs in a browser window, where Node.js globals do not exist.",
        })),
      ],
    },
  },
  {
    files: ["orchardsquid-k93-ui/src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", ...nodeModules, "electron"],
              message:
                "Shared components render wherever an app puts them. Take data and actions as props instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "orchardsquid-k93-web/**/*.{ts,tsx}",
      "orchardsquid-k93-ui/**/*.{ts,tsx}",
    ],
    extends: [betterTailwindcss.configs.recommended],
    rules: { "better-tailwindcss/enforce-consistent-line-wrapping": "off" },
    settings: {
      "better-tailwindcss": {
        entryPoint: "orchardsquid-k93-web/app/globals.css",
      },
    },
  },
  globalIgnores([
    "orchardsquid-k93-desktop/.vite/",
    "orchardsquid-k93-desktop/out/",
  ]),
  {
    files: ["orchardsquid-k93-desktop/src/renderer/**/*.{ts,tsx}"],
    extends: [betterTailwindcss.configs.recommended],
    rules: {
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["electron", "electron/*", ...nodeModules],
              message:
                "The renderer is a sandboxed browser window. Reach the main process through window.bridge.",
            },
            {
              regex: "^(?:@/|(?:\\.\\./)+)(?:main|preload)(?:/|$)",
              message:
                "The renderer is a sandboxed browser window. Reach the main process through window.bridge.",
            },
          ],
        },
      ],
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "orchardsquid-k93-desktop/src/renderer/globals.css",
      },
    },
  },
]);
