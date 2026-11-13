import { Button, Panel, PanelNote } from "@orchardsquid-k93/ui";
import { Suspense, use, useActionState, useId, useState } from "react";

import type { WifiCheck } from "@/bridge.ts";
import { signedOutExplanation } from "@/renderer/ReportPanel.tsx";

type Outcome =
  | { state: "saved"; address: string; check: WifiCheck }
  | { state: "invalid" }
  | null;

async function save(_previous: Outcome, formData: FormData): Promise<Outcome> {
  const value = formData.get("address");
  const address = typeof value === "string" ? value.trim() : "";
  try {
    const check = await window.bridge.setWifiAddress(address);
    return { state: "saved", address, check };
  } catch (error) {
    console.error("The Wi-Fi address could not be saved", error);
    return { state: "invalid" };
  }
}

function describe(outcome: NonNullable<Outcome>): string {
  if (outcome.state === "invalid") {
    return "That is not an IP address or host name. Nothing was changed.";
  }
  switch (outcome.check) {
    case "connected":
      return `Saved. Connected to the iPad at ${outcome.address} and signed in as root.`;
    case "signed-out":
      return `Saved. The iPad answered at ${outcome.address}, but did not accept the sign-in. ${signedOutExplanation}`;
    case "unreachable":
      return `Saved, but the iPad did not answer at ${outcome.address}. Check that it is awake and on the same network as this computer.`;
    case "failed":
      return `Saved, but the SSH connection to ${outcome.address} failed.`;
  }
}

async function loadWifiAddress(): Promise<string | null> {
  try {
    return await window.bridge.readWifiAddress();
  } catch (error) {
    console.error("The Wi-Fi address could not be read", error);
    return null;
  }
}

function AddressForm({ known }: { known: Promise<string | null> }) {
  const loaded = use(known);
  const inputId = useId();
  const [outcome, action, isBusy] = useActionState(save, null);
  const address = outcome?.state === "saved" ? outcome.address : loaded;

  return (
    <>
      <PanelNote>
        {address
          ? `The app reaches the iPad over Wi-Fi at ${address}. It updates this by itself whenever it reads the iPad's network settings.`
          : "The app does not know the iPad's Wi-Fi address yet. On the iPad, open Settings, then Wi-Fi, and tap the ⓘ next to the network's name to see its IP address."}
      </PanelNote>
      <form
        action={action}
        className="flex flex-wrap items-center gap-3 py-2.5"
      >
        <label htmlFor={inputId} className="sr-only">
          Wi-Fi address
        </label>
        <input
          id={inputId}
          name="address"
          required
          defaultValue={address ?? ""}
          placeholder="192.168.1.20"
          autoComplete="off"
          spellCheck={false}
          className="min-w-40 flex-1 rounded-lg border border-zinc-300
            bg-transparent px-3 py-1.5 font-mono dark:border-zinc-700"
        />
        <Button type="submit" disabled={isBusy}>
          Save
        </Button>
      </form>
      {isBusy ? (
        <p role="status" className="py-2.5 text-zinc-600 dark:text-zinc-400">
          Connecting to the iPad…
        </p>
      ) : (
        outcome && (
          <p
            role="status"
            className={`py-2.5 ${
              outcome.state === "saved" && outcome.check === "connected"
                ? "text-zinc-600 dark:text-zinc-400"
                : "text-red-600 dark:text-red-400"
              }`}
          >
            {describe(outcome)}
          </p>
        )
      )}
    </>
  );
}

export function WifiAddress() {
  const [known] = useState(loadWifiAddress);
  return (
    <Panel title="Wi-Fi address">
      <Suspense fallback={<PanelNote>Checking…</PanelNote>}>
        <AddressForm known={known} />
      </Suspense>
    </Panel>
  );
}
