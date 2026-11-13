import type { ReactNode } from "react";

const fullMeterFraction = 0.9;

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {children}
    </dl>
  );
}

export function Detail({
  label,
  meter,
  children,
}: {
  label: string;
  meter?: number;
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
              meter >= fullMeterFraction ? "bg-red-500" : "bg-emerald-500"
            }`}
            style={{ width: `${String(meter * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
