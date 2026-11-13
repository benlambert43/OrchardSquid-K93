import { z } from "zod";

export const NOTE_BODY_MAX_LENGTH = 1000;

export const noteIdSchema = z.uuid();

export const noteSchema = z.object({
  id: noteIdSchema,
  body: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Note = z.infer<typeof noteSchema>;

export const noteInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(
      NOTE_BODY_MAX_LENGTH,
      `Keep it under ${String(NOTE_BODY_MAX_LENGTH)} characters.`,
    ),
});

export type NoteInput = z.infer<typeof noteInputSchema>;
