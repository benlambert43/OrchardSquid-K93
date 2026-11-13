import { defineConfig } from "drizzle-kit";

import { serverEnv } from "./src/serverEnv.ts";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    user: serverEnv.POSTGRES_USER,
    password: serverEnv.POSTGRES_PASSWORD,
    database: serverEnv.POSTGRES_DB,
    host: serverEnv.POSTGRES_HOST,
    port: serverEnv.POSTGRES_PORT,
    ssl: false,
  },
});
