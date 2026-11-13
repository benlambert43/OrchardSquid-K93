import { Button, Page, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { Suspense, use, useState, useTransition } from "react";

import type { Connection, IpadOnboarding, Transport } from "@/bridge.ts";
import { loadOnboarding } from "@/renderer/onboarding/completion.ts";
import { SshAccess } from "@/renderer/onboarding/SshAccess.tsx";
import {
  loadConnection,
  TransportPicker,
} from "@/renderer/TransportPicker.tsx";

type OnboardingCheck = IpadOnboarding | null;

interface Checks {
  connection: Promise<Connection | null>;
  onboarding: Promise<OnboardingCheck>;
}

function loadChecks(transport?: Transport): Checks {
  const connection = loadConnection(transport);
  return { connection, onboarding: connection.then(() => loadOnboarding()) };
}

function Access({ check }: { check: Promise<OnboardingCheck> }) {
  const onboarding = use(check);
  return onboarding ? (
    <SshAccess onboarding={onboarding} />
  ) : (
    <PanelNote>SSH access could not be checked.</PanelNote>
  );
}

export function Onboarding() {
  const [checks, setChecks] = useState(() => loadChecks());
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = (transport?: Transport) => {
    startRefresh(() => {
      setChecks(loadChecks(transport));
    });
  };

  return (
    <Page
      title="Onboarding"
      actions={
        <div className="flex gap-2">
          <TransportPicker
            connection={checks.connection}
            disabled={isRefreshing}
            onChoose={refresh}
          />
          <Button
            disabled={isRefreshing}
            onClick={() => {
              refresh();
            }}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid max-w-3xl gap-6">
        <Panel title="SSH access">
          <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
            <Access check={checks.onboarding} />
          </Suspense>
        </Panel>
      </div>
    </Page>
  );
}
