import { Detail, DetailList, DetailNote } from "@orchardsquid-k93/ui";
import { Suspense, use } from "react";

import type { IpadBattery, IpadBatteryHealth, IpadSystem } from "@/bridge.ts";
import { formatNumber, formatPercent } from "@/renderer/format.ts";

const unavailable = "Not available";

const stateLabels: Record<IpadBattery["state"], string> = {
  full: "Fully charged",
  charging: "Charging",
  "not-charging": "Connected to power, not charging",
  discharging: "On battery",
};

function HealthNote({ children }: { children: string }) {
  return (
    <>
      <Detail label="Maximum capacity">{children}</Detail>
      <Detail label="Cycle count">{children}</Detail>
    </>
  );
}

function HealthDetails({
  check,
}: {
  check: Promise<IpadBatteryHealth | null>;
}) {
  const health = use(check);
  if (!health) {
    return <HealthNote>{unavailable}</HealthNote>;
  }
  const fraction = health.maxCapacityMah / health.designCapacityMah;
  return (
    <>
      <Detail
        label="Maximum capacity"
        meter={Math.min(fraction, 1)}
        alertWhen="empty"
      >
        {formatPercent(fraction)}
        <DetailNote>
          {formatNumber(health.maxCapacityMah)} of{" "}
          {formatNumber(health.designCapacityMah)} mAh
        </DetailNote>
      </Detail>
      <Detail label="Cycle count">{formatNumber(health.cycleCount)}</Detail>
    </>
  );
}

export function BatteryDetails({
  system,
  health,
}: {
  system: IpadSystem;
  health: Promise<IpadBatteryHealth | null>;
}) {
  const { battery } = system;
  return (
    <DetailList>
      <Detail
        label="Level"
        alertWhen="empty"
        {...(battery && { meter: battery.level })}
      >
        {battery ? formatPercent(battery.level) : unavailable}
      </Detail>
      <Detail label="Power">
        {battery ? stateLabels[battery.state] : unavailable}
      </Detail>
      <Suspense fallback={<HealthNote>Checking…</HealthNote>}>
        <HealthDetails check={health} />
      </Suspense>
    </DetailList>
  );
}
