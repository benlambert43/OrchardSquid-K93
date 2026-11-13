import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "orchardsquid-k93-shared",
      "orchardsquid-k93-ui",
      "orchardsquid-k93-server",
      "orchardsquid-k93-web",
      "orchardsquid-k93-desktop",
    ],
    coverage: {
      reporter: ["text", "html"],
      include: [
        "orchardsquid-k93-shared/src/**",
        "orchardsquid-k93-ui/src/**",
        "orchardsquid-k93-server/src/**",
        "orchardsquid-k93-web/app/**",
        "orchardsquid-k93-desktop/src/**",
      ],
    },
  },
});
