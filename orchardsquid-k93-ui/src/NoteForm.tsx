"use client";

import {
  type CreateNoteAction,
  NOTE_BODY_MAX_LENGTH,
  type NoteFormState,
} from "@orchardsquid-k93/shared";
import { useActionState } from "react";

const initialState: NoteFormState = { body: "", error: null };

export function NoteForm({ createAction }: { createAction: CreateNoteAction }) {
  const [state, formAction, pending] = useActionState(
    createAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="new-note" className="sr-only">
        New note
      </label>
      <textarea
        id="new-note"
        name="body"
        rows={3}
        required
        maxLength={NOTE_BODY_MAX_LENGTH}
        defaultValue={state.body}
        placeholder="Write a note…"
        className="w-full resize-y rounded-lg border border-zinc-300
          bg-transparent px-3 py-2 focus:border-zinc-500 focus:outline-none
          dark:border-zinc-700"
      />
      <div className="flex items-center gap-3">
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm
            font-medium text-white hover:bg-zinc-700 disabled:opacity-50
            dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Adding…" : "Add note"}
        </button>
      </div>
    </form>
  );
}
