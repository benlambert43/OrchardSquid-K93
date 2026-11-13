import type { Config } from "prettier";
import type { PluginOptions as TailwindOptions } from "prettier-plugin-tailwindcss";

interface ClassnamesOptions {
  endingPosition?: "absolute" | "relative";
}

const config: Config & TailwindOptions & ClassnamesOptions = {
  plugins: [
    "prettier-plugin-tailwindcss",
    "prettier-plugin-classnames",
    "prettier-plugin-merge",
  ],
  tailwindStylesheet: "./orchardsquid-k93-web/app/globals.css",
  endingPosition: "absolute",
};

export default config;
