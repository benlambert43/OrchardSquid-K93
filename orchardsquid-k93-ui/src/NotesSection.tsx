import type { CreateNoteAction } from "@orchardsquid-k93/shared";
import type { ReactNode } from "react";

import { SectionHeading } from "./AppShell.tsx";
import { NoteForm } from "./NoteForm.tsx";

export function NotesSection({
  createAction,
  children,
}: {
  createAction: CreateNoteAction;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full max-w-xl flex-col gap-4 text-left">
      <SectionHeading>Notes</SectionHeading>
      <NoteForm createAction={createAction} />
      {children}
    </section>
  );
}
