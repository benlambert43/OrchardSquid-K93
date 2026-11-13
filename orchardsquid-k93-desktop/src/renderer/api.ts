import { createApiClient } from "@orchardsquid-k93/shared";

import { env } from "@/env.ts";

export const api = createApiClient(
  (path) => new URL(path, env.VITE_API_BASE_URL),
);
