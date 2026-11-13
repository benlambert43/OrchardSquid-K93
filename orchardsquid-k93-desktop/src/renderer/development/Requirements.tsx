import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { type ReactNode, useId, useState } from "react";

const listFormat = new Intl.ListFormat(undefined, { type: "conjunction" });

export function Requirements({
  names,
  children,
}: {
  names: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelsId = useId();

  return (
    <div className="-mt-3 flex flex-col gap-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelsId}
        onClick={() => {
          setOpen(!open);
        }}
        className="-mx-2 flex items-center gap-2.5 self-start rounded-lg px-2
          py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100
          dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full bg-emerald-500"
        />
        {listFormat.format(names)} {names.length === 1 ? "is" : "are"} set up
        <ChevronDownIcon
          aria-hidden
          className={`size-4 shrink-0 text-zinc-500 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelsId}
        hidden={!open}
        className="grid items-start gap-6 @2xl:grid-cols-2"
      >
        {children}
      </div>
    </div>
  );
}
