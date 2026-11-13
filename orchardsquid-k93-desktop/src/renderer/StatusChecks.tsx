import type { HealthResponse } from "@orchardsquid-k93/shared";
import { StatusRow, StatusSection } from "@orchardsquid-k93/ui";
import { Suspense, use, useState } from "react";

import { api } from "@/renderer/api.ts";

function loadAppVersion(): Promise<string | null> {
  if (!("bridge" in window)) {
    return Promise.resolve(null);
  }
  return window.bridge.getAppVersion().catch((error: unknown) => {
    console.error("Electron main process check failed", error);
    return null;
  });
}

function MainProcessCheck({ version }: { version: Promise<string | null> }) {
  const loadedVersion = use(version);
  return loadedVersion ? (
    <StatusRow
      label="Electron main"
      state="ok"
      detail={`Version ${loadedVersion}`}
    />
  ) : (
    <StatusRow label="Electron main" state="error" />
  );
}

function ApiChecks({ health }: { health: Promise<HealthResponse | null> }) {
  const loadedHealth = use(health);
  return (
    <>
      <StatusRow label="API" state={loadedHealth ? "ok" : "error"} />
      <StatusRow
        label="Database"
        state={loadedHealth?.database === "ok" ? "ok" : "error"}
        {...(!loadedHealth && { detail: "Unknown: API unreachable" })}
      />
    </>
  );
}

export function StatusChecks() {
  const [version] = useState(loadAppVersion);
  const [health] = useState(api.getHealth);

  return (
    <StatusSection>
      <Suspense fallback={<StatusRow label="Electron main" state="checking" />}>
        <MainProcessCheck version={version} />
      </Suspense>
      <Suspense
        fallback={
          <>
            <StatusRow label="API" state="checking" />
            <StatusRow label="Database" state="checking" />
          </>
        }
      >
        <ApiChecks health={health} />
      </Suspense>
    </StatusSection>
  );
}
