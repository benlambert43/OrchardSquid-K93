import type {
  DeleteNoteAction,
  Note,
  UpdateNoteAction,
} from "@orchardsquid-k93/shared";

import { NoteItem } from "./NoteItem.tsx";

export function NoteList({
  notes,
  updateAction,
  deleteAction,
}: {
  notes: Note[] | null;
  updateAction: UpdateNoteAction;
  deleteAction: DeleteNoteAction;
}) {
  if (!notes) {
    return (
      <p role="alert" className="py-3 text-sm text-red-600 dark:text-red-400">
        Could not load notes.
      </p>
    );
  }

  if (notes.length === 0) {
    return <p className="py-3 text-sm text-zinc-500">No notes yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          updateAction={updateAction}
          deleteAction={deleteAction}
        />
      ))}
    </ul>
  );
}

export function NoteListFallback() {
  return <p className="py-3 text-sm text-zinc-500">Loading notes…</p>;
}
