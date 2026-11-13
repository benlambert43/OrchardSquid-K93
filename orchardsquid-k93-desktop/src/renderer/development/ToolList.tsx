import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { type ReactNode, useId, useState } from "react";

import { Command } from "@/renderer/Command.tsx";

export function ToolList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {children}
    </ul>
  );
}

export function Tool({
  name,
  ready,
  value,
  action,
  status,
  defaultOpen = false,
  children,
}: {
  name: string;
  ready?: boolean;
  value?: string | undefined;
  action?: ReactNode;
  status?: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const detailsId = useId();
  const summary = (
    <>
      {ready !== undefined && (
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full ${
            ready ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
      )}
      <span className="font-medium">{name}</span>
      {value && (
        <span
          className={`ml-auto min-w-0 text-right wrap-anywhere ${
            ready ? "font-mono text-xs" : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {value}
        </span>
      )}
    </>
  );

  return (
    <li className="py-2.5">
      <div className="flex min-h-9 items-center gap-3">
        {children ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => {
              setOpen(!open);
            }}
            className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-md
              p-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {summary}
            <ChevronDownIcon
              aria-hidden
              className={`size-4 shrink-0 text-zinc-500 ${
                value ? "" : "ml-auto"
              } ${open ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {summary}
          </div>
        )}
        {action}
      </div>
      {status}
      {children && (
        <div
          id={detailsId}
          hidden={!open}
          className="mt-2 flex flex-col gap-2 pl-5.5"
        >
          {children}
        </div>
      )}
    </li>
  );
}

export function ToolNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-zinc-600 dark:text-zinc-400">{children}</p>;
}

export function ToolCommands({
  note,
  commands,
}: {
  note: string;
  commands: string[];
}) {
  return (
    <div>
      <ToolNote>{note}</ToolNote>
      {commands.map((command) => (
        <Command key={command}>{command}</Command>
      ))}
    </div>
  );
}

export function ToolDetails({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
      {children}
    </dl>
  );
}

export function ToolDetail({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className={mono ? "font-mono wrap-anywhere" : "wrap-anywhere"}>
        {children}
      </dd>
    </>
  );
}

export function ToolOutput({ children }: { children: string }) {
  return (
    <pre
      className="mt-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono text-xs
        whitespace-pre-wrap dark:bg-zinc-900"
    >
      {children}
    </pre>
  );
}
