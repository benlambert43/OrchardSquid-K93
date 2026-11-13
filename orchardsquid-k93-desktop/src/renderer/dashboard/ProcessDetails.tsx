import { Detail, DetailList } from "@orchardsquid-k93/ui";

import type { IpadSystem } from "@/bridge.ts";
import { formatBytes } from "@/renderer/format.ts";

export function ProcessDetails({ system }: { system: IpadSystem }) {
  return (
    <DetailList>
      {system.topProcesses.map(({ pid, name, memoryBytes }) => (
        <Detail key={pid} label={name}>
          {formatBytes(memoryBytes)}
        </Detail>
      ))}
    </DetailList>
  );
}
