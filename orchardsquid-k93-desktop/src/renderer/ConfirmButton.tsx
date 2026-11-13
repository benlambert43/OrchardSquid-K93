import { Button } from "@orchardsquid-k93/ui";
import { type ReactNode, useId, useRef } from "react";

export function ConfirmButton({
  label,
  title,
  disabled = false,
  action,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  action: () => void | Promise<void>;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const close = () => {
    dialog.current?.close();
  };

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          dialog.current?.showModal();
        }}
      >
        {label}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border
          border-zinc-200 bg-background p-5 text-left text-sm font-normal
          text-foreground shadow-xl backdrop:bg-black/40 dark:border-zinc-800"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-zinc-600 dark:text-zinc-400">
          {children}
        </p>
        <form
          action={action}
          onSubmit={close}
          className="mt-5 flex justify-end gap-3"
        >
          <Button onClick={close}>Cancel</Button>
          <Button type="submit">Confirm</Button>
        </form>
      </dialog>
    </>
  );
}
