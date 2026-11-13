import type { ReactNode } from "react";

const fullMeterFraction = 0.9;
const emptyMeterFraction = 0.2;

type MeterAlert = "full" | "empty";

function isAlert(meter: number, alertWhen: MeterAlert): boolean {
  return alertWhen === "full"
    ? meter >= fullMeterFraction
    : meter <= emptyMeterFraction;
}

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {children}
    </dl>
  );
}

export function DetailNote({ children }: { children: ReactNode }) {
  return (
    <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400">
      {children}
    </span>
  );
}

export function Detail({
  label,
  meter,
  alertWhen = "full",
  children,
}: {
  label: string;
  meter?: number;
  alertWhen?: MeterAlert;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex items-baseline justify-between gap-6">
        <dt className="shrink-0 text-zinc-600 dark:text-zinc-400">{label}</dt>
        <dd className="min-w-0 text-right font-medium wrap-anywhere">
          {children}
        </dd>
      </div>
      {meter !== undefined && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(meter * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-zinc-200
            dark:bg-zinc-800"
        >
          <div
            className={`h-full rounded-full ${
              isAlert(meter, alertWhen) ? "bg-red-500" : "bg-emerald-500"
            }`}
            style={{ width: `${String(meter * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
