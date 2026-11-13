import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Suspense, use } from "react";

import type { Connection, Transport } from "@/bridge.ts";
import { transportNames } from "@/unreachable.ts";

const transports: Transport[] = ["wifi", "usb"];

interface TransportPickerProps {
  connection: Promise<Connection | null>;
  disabled: boolean;
  onChoose: (transport: Transport) => void;
}

function Picker({ connection, disabled, onChoose }: TransportPickerProps) {
  const loaded = use(connection);
  return (
    <span className="relative inline-flex">
      <select
        aria-label="Connection"
        defaultValue={loaded?.transport ?? "wifi"}
        disabled={disabled}
        onChange={(event) => {
          onChoose(event.target.value as Transport);
        }}
        className="appearance-none rounded-lg border border-zinc-300
          bg-transparent py-1.5 pr-9 pl-3 text-sm font-medium hover:bg-zinc-100
          disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {transports.map((transport) => (
          <option key={transport} value={transport}>
            {transportNames[transport]}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4
          -translate-y-1/2 text-zinc-500"
      />
    </span>
  );
}

export function TransportPicker(props: TransportPickerProps) {
  return (
    <Suspense>
      <Picker {...props} />
    </Suspense>
  );
}

export async function loadConnection(
  transport?: Transport,
): Promise<Connection | null> {
  try {
    if (transport) {
      await window.bridge.chooseTransport(transport);
    }
    return await window.bridge.readConnection();
  } catch (error) {
    console.error("The connection setting could not be read", error);
    return null;
  }
}
