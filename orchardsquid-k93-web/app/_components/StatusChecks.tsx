import { StatusRow, StatusSection } from "@orchardsquid-k93/ui";
import { connection } from "next/server";
import { Suspense } from "react";

import { api } from "@/app/_lib/api.ts";

async function BffCheck() {
  await connection();
  return (
    <StatusRow
      label="Next.js BFF"
      state="ok"
      detail={`Rendered at ${new Date().toISOString()}`}
    />
  );
}

async function ApiChecks() {
  await connection();
  const health = await api.getHealth();
  return (
    <>
      <StatusRow label="API" state={health ? "ok" : "error"} />
      <StatusRow
        label="Database"
        state={health?.database === "ok" ? "ok" : "error"}
        {...(!health && { detail: "Unknown: API unreachable" })}
      />
    </>
  );
}

export function StatusChecks() {
  return (
    <StatusSection>
      <Suspense fallback={<StatusRow label="Next.js BFF" state="checking" />}>
        <BffCheck />
      </Suspense>
      <Suspense
        fallback={
          <>
            <StatusRow label="API" state="checking" />
            <StatusRow label="Database" state="checking" />
          </>
        }
      >
        <ApiChecks />
      </Suspense>
    </StatusSection>
  );
}
