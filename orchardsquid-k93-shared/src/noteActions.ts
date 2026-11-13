import { noteIdSchema, type NoteInput, noteInputSchema } from "./notes.ts";

export interface NoteFormState {
  body: string;
  error: string | null;
}

export type CreateNoteAction = (
  previousState: NoteFormState,
  formData: FormData,
) => Promise<NoteFormState>;

export type UpdateNoteAction = (
  id: string,
  previousState: NoteFormState,
  formData: FormData,
) => Promise<NoteFormState>;

export type DeleteNoteAction = (
  id: string,
) => Promise<{ error: string | null }>;

export interface NotesApi {
  createNote: (input: NoteInput) => Promise<void>;
  updateNote: (id: string, input: NoteInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

function readNoteBody(formData: FormData): string {
  const body = formData.get("body");
  return typeof body === "string" ? body : "";
}

export async function submitNewNote(
  api: NotesApi,
  formData: FormData,
): Promise<NoteFormState> {
  const body = readNoteBody(formData);
  const input = noteInputSchema.safeParse({ body });
  if (!input.success) {
    return { body, error: input.error.issues[0]?.message ?? "Invalid note." };
  }
  try {
    await api.createNote(input.data);
  } catch (error) {
    console.error(error);
    return { body, error: "Could not save the note. Try again." };
  }
  return { body: "", error: null };
}

export async function submitNoteEdit(
  api: NotesApi,
  id: string,
  formData: FormData,
): Promise<NoteFormState> {
  const body = readNoteBody(formData);
  const noteId = noteIdSchema.safeParse(id);
  const input = noteInputSchema.safeParse({ body });
  if (!noteId.success || !input.success) {
    return {
      body,
      error: input.error?.issues[0]?.message ?? "Invalid note.",
    };
  }
  try {
    await api.updateNote(noteId.data, input.data);
  } catch (error) {
    console.error(error);
    return { body, error: "Could not update the note. Try again." };
  }
  return { body: input.data.body, error: null };
}

export async function submitNoteDelete(
  api: NotesApi,
  id: string,
): Promise<{ error: string | null }> {
  const noteId = noteIdSchema.safeParse(id);
  if (!noteId.success) {
    return { error: "Invalid note." };
  }
  try {
    await api.deleteNote(noteId.data);
  } catch (error) {
    console.error(error);
    return { error: "Could not delete the note. Try again." };
  }
  return { error: null };
}
