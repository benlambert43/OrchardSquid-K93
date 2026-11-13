type StatusState = "checking" | "ok" | "error";

const indicatorClassNames: Record<StatusState, string> = {
  checking: "bg-zinc-400 animate-pulse",
  ok: "bg-emerald-500",
  error: "bg-red-500",
};

const stateLabels: Record<StatusState, string> = {
  checking: "Checking…",
  ok: "Online",
  error: "Unreachable",
};

export function StatusRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: StatusState;
  detail?: string;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className={`size-2.5 shrink-0 rounded-full
          ${indicatorClassNames[state]}`}
      />
      <span className="font-medium">{label}</span>
      <span
        className="ml-auto text-right text-sm text-zinc-600 dark:text-zinc-400"
      >
        {stateLabels[state]}
        {detail && <span className="block font-mono text-xs">{detail}</span>}
      </span>
    </li>
  );
}
