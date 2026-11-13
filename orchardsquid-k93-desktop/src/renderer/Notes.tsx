import {
  type DeleteNoteAction,
  type Note,
  submitNewNote,
  submitNoteDelete,
  submitNoteEdit,
  type UpdateNoteAction,
} from "@orchardsquid-k93/shared";
import { NoteList, NoteListFallback, NotesSection } from "@orchardsquid-k93/ui";
import { startTransition, Suspense, use, useState } from "react";

import { api } from "@/renderer/api.ts";

function loadNotes(): Promise<Note[] | null> {
  return api.getNotes().catch((error: unknown) => {
    console.error(error);
    return null;
  });
}

function LoadedNotes({
  notes,
  updateAction,
  deleteAction,
}: {
  notes: Promise<Note[] | null>;
  updateAction: UpdateNoteAction;
  deleteAction: DeleteNoteAction;
}) {
  return (
    <NoteList
      notes={use(notes)}
      updateAction={updateAction}
      deleteAction={deleteAction}
    />
  );
}

export function Notes() {
  const [notes, setNotes] = useState(loadNotes);

  async function reloadAfter<Result extends { error: string | null }>(
    action: Promise<Result>,
  ): Promise<Result> {
    const result = await action;
    if (!result.error) {
      startTransition(() => {
        setNotes(loadNotes());
      });
    }
    return result;
  }

  return (
    <NotesSection
      createAction={(_previousState, formData) =>
        reloadAfter(submitNewNote(api, formData))
      }
    >
      <Suspense fallback={<NoteListFallback />}>
        <LoadedNotes
          notes={notes}
          updateAction={(id, _previousState, formData) =>
            reloadAfter(submitNoteEdit(api, id, formData))
          }
          deleteAction={(id) => reloadAfter(submitNoteDelete(api, id))}
        />
      </Suspense>
    </NotesSection>
  );
}
