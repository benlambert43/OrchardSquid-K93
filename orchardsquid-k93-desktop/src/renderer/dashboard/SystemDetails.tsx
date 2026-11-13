import { Detail, DetailList } from "@orchardsquid-k93/ui";

import type { IpadSystem, Usage } from "@/bridge.ts";
import {
  formatBytes,
  formatDuration,
  formatPercent,
} from "@/renderer/format.ts";

function usage({ usedBytes, totalBytes }: Usage): string {
  return `${formatBytes(usedBytes)} of ${formatBytes(totalBytes)}`;
}

export function SystemDetails({ system }: { system: IpadSystem }) {
  const { cpu, memory } = system;
  return (
    <DetailList>
      <Detail label="Uptime">{formatDuration(system.uptimeSeconds)}</Detail>
      <Detail label="CPU" meter={cpu.userFraction + cpu.systemFraction}>
        {formatPercent(cpu.userFraction)} user,{" "}
        {formatPercent(cpu.systemFraction)} system
      </Detail>
      <Detail label="Load average">
        {system.loadAverages.map((load) => load.toFixed(2)).join(", ")}
      </Detail>
      <Detail label="Memory" meter={memory.usedBytes / memory.totalBytes}>
        {usage(memory)}
      </Detail>
      {system.volumes.map((volume) => (
        <Detail
          key={volume.name}
          label={`${volume.name} volume`}
          meter={volume.usedBytes / volume.totalBytes}
        >
          {usage(volume)}
        </Detail>
      ))}
      <Detail label="Processes">{system.processes}</Detail>
      <Detail label="Kernel">{system.kernel}</Detail>
    </DetailList>
  );
}
