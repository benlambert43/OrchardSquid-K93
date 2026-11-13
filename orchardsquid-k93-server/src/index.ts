import type { HealthResponse } from "@orchardsquid-k93/shared";
import cors from "cors";
import express from "express";

import { handleError, notFound } from "./errors.ts";
import { checkDatabase } from "./health.ts";
import { serverEnv } from "./serverEnv.ts";

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: [serverEnv.BASE_FRONTEND_URL, ...serverEnv.EXTRA_ALLOWED_ORIGINS],
  }),
);
app.use(express.json());

app.get("/api/v1/health", async (_req, res) => {
  const database = await checkDatabase();
  const body: HealthResponse = { status: "ok", database };
  res.status(database === "ok" ? 200 : 503).json(body);
});

app.use(notFound);
app.use(handleError);

app.listen(serverEnv.API_PORT, (error?: Error) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(
    `orchardsquid-k93-server listening on port ${String(serverEnv.API_PORT)}`,
  );
  void checkDatabase().then((database) => {
    if (database === "ok") {
      console.log(
        `Connected to database "${serverEnv.POSTGRES_DB}" on ${serverEnv.POSTGRES_HOST}:${String(serverEnv.POSTGRES_PORT)}`,
      );
    }
  });
});
