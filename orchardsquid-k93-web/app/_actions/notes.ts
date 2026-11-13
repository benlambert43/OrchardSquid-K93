"use server";

import {
  type NoteFormState,
  submitNewNote,
  submitNoteDelete,
  submitNoteEdit,
} from "@orchardsquid-k93/shared";
import { refresh } from "next/cache";

import { api } from "@/app/_lib/api.ts";

export async function createNote(
  _previousState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const result = await submitNewNote(api, formData);
  if (!result.error) {
    refresh();
  }
  return result;
}

export async function updateNote(
  id: string,
  _previousState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const result = await submitNoteEdit(api, id, formData);
  if (!result.error) {
    refresh();
  }
  return result;
}

export async function deleteNote(
  id: string,
): Promise<{ error: string | null }> {
  const result = await submitNoteDelete(api, id);
  if (!result.error) {
    refresh();
  }
  return result;
}
