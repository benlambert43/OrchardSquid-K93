import { PanelNote } from "@orchardsquid-k93/ui";

import type { Connection } from "@/bridge.ts";
import { pageLinks } from "@/renderer/navigation.ts";
import { describeUnreachable } from "@/unreachable.ts";

export function UnreachableNote({ connection }: { connection: Connection }) {
  if (connection.transport === "wifi" && connection.address === null) {
    return (
      <PanelNote>
        The iPad&apos;s Wi-Fi address is not known yet. Enter it on the{" "}
        <a href={pageLinks.settings} className="underline underline-offset-2">
          Settings page
        </a>
        .
      </PanelNote>
    );
  }
  return <PanelNote>{describeUnreachable(connection)}</PanelNote>;
}
