import { formatElapsed, formatPercent } from "@/renderer/format.ts";

export function TaskProgress({
  label,
  step,
  item,
  fraction,
  seconds,
}: {
  label: string;
  step: string;
  item: string | null;
  fraction: number | null;
  seconds: number;
}) {
  const percent = fraction === null ? undefined : Math.round(fraction * 100);
  return (
    <div className="flex flex-col gap-1.5 self-stretch">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200
          dark:bg-zinc-800"
      >
        <div
          className={
            percent === undefined
              ? "h-full animate-pulse rounded-full bg-emerald-500"
              : "h-full rounded-full bg-emerald-500"
          }
          style={{ width: `${String(percent ?? 100)}%` }}
        />
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">
        {step}
        {item && (
          <span className="block font-mono text-xs wrap-anywhere">{item}</span>
        )}
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {fraction !== null && `${formatPercent(fraction)} · `}
        {formatElapsed(seconds)}
      </p>
    </div>
  );
}
