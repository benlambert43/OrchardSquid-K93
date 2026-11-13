import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";
import { serverEnv } from "./serverEnv.ts";

const pool = new Pool({
  user: serverEnv.POSTGRES_USER,
  password: serverEnv.POSTGRES_PASSWORD,
  database: serverEnv.POSTGRES_DB,
  host: serverEnv.POSTGRES_HOST,
  port: serverEnv.POSTGRES_PORT,
});

pool.on("error", (error) => {
  console.error("Idle database client error", error);
});

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
