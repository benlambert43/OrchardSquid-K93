import { Button } from "@orchardsquid-k93/ui";
import { type ReactNode, useId, useRef } from "react";

export function ConfirmButton({
  label,
  title,
  disabled = false,
  action,
  fields,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  action: (formData: FormData) => void | Promise<void>;
  fields?: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => {
          dialog.current?.showModal();
          form.current?.querySelector("button")?.focus();
        }}
      >
        {label}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={() => {
          form.current?.reset();
        }}
        className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md
          overflow-y-auto rounded-xl border border-zinc-200 bg-background p-5
          text-left text-sm font-normal text-foreground shadow-xl
          backdrop:bg-black/40 dark:border-zinc-800"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-zinc-600 dark:text-zinc-400">
          {children}
        </p>
        <form
          ref={form}
          action={action}
          onSubmit={() => {
            dialog.current?.close();
          }}
        >
          {fields && <div className="mt-4">{fields}</div>}
          <div className="mt-5 flex justify-end gap-3">
            <Button
              onClick={() => {
                form.current?.reset();
                dialog.current?.close();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
