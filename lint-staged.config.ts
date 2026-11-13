import { defineConfig } from "lint-staged/config";

export default defineConfig({
  "*.{ts,tsx,mts,cts,js,mjs,cjs}": [
    () => "npm run typecheck",
    "eslint --max-warnings 0 --fix --no-warn-ignored",
    "prettier --write",
    "vitest related --run --passWithNoTests",
  ],
  "!(*.ts|*.tsx|*.mts|*.cts|*.js|*.mjs|*.cjs)":
    "prettier --write --ignore-unknown",
  ".vscode/settings.json": () => "npm run lint:editor",
  "*.sh": "shellcheck",
});
