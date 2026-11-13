"use client";

import {
  type DeleteNoteAction,
  type Note,
  NOTE_BODY_MAX_LENGTH,
  type NoteFormState,
  type UpdateNoteAction,
} from "@orchardsquid-k93/shared";
import {
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useActionState, useEffect, useRef, useState } from "react";

const iconButtonClassName =
  "rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export function NoteItem({
  note,
  updateAction,
  deleteAction,
}: {
  note: Note;
  updateAction: UpdateNoteAction;
  deleteAction: DeleteNoteAction;
}) {
  const [editing, setEditing] = useState(false);
  const editField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const field = editField.current;
    if (editing && field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }, [editing]);

  const [editState, submitEdit, editPending] = useActionState(
    async (previousState: NoteFormState, formData: FormData) => {
      const result = await updateAction(note.id, previousState, formData);
      if (!result.error) {
        setEditing(false);
      }
      return result;
    },
    { body: note.body, error: null },
  );

  const [deleteState, submitDelete, deletePending] = useActionState(
    () => deleteAction(note.id),
    { error: null },
  );

  const error = editing ? editState.error : deleteState.error;

  if (editing) {
    return (
      <li className="py-3">
        <form action={submitEdit} className="flex items-start gap-2">
          <label htmlFor={`note-${note.id}`} className="sr-only">
            Edit note
          </label>
          <textarea
            ref={editField}
            id={`note-${note.id}`}
            name="body"
            rows={2}
            required
            maxLength={NOTE_BODY_MAX_LENGTH}
            defaultValue={editState.error ? editState.body : note.body}
            className="flex-1 resize-y rounded-lg border border-zinc-300
              bg-transparent px-3 py-2 focus:border-zinc-500 focus:outline-none
              dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={editPending}
            aria-label="Save note"
            className={iconButtonClassName}
          >
            <CheckIcon aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            disabled={editPending}
            aria-label="Cancel editing"
            onClick={() => {
              setEditing(false);
            }}
            className={iconButtonClassName}
          >
            <XMarkIcon aria-hidden className="size-5" />
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className={`py-3 ${deletePending ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 py-1.5 wrap-break-word whitespace-pre-wrap">
          {note.body}
        </p>
        <button
          type="button"
          disabled={deletePending}
          aria-label="Edit note"
          onClick={() => {
            setEditing(true);
          }}
          className={iconButtonClassName}
        >
          <PencilSquareIcon aria-hidden className="size-5" />
        </button>
        <form action={submitDelete}>
          <button
            type="submit"
            disabled={deletePending}
            aria-label="Delete note"
            className={iconButtonClassName}
          >
            <TrashIcon aria-hidden className="size-5" />
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}
