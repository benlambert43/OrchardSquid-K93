import type { ComponentProps, ReactNode } from "react";

export function Button({
  type = "button",
  disabled,
  onClick,
  children,
}: {
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: ComponentProps<"button">["onClick"];
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm
        font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700
        dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
