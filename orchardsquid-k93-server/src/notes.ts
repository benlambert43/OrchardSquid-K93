import { noteIdSchema, noteInputSchema } from "@orchardsquid-k93/shared";
import { desc, eq } from "drizzle-orm";
import { type Response, Router } from "express";
import { z } from "zod";

import { db } from "./db.ts";
import { notes } from "./schema.ts";

function sendValidationError(res: Response, error: z.ZodError) {
  res.status(400).json({ error: z.prettifyError(error) });
}

function sendNotFound(res: Response) {
  res.status(404).json({ error: "Note not found" });
}

export const notesRouter = Router();

notesRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(notes).orderBy(desc(notes.createdAt));
  res.json(rows);
});

notesRouter.post("/", async (req, res) => {
  const input = noteInputSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }
  const [note] = await db.insert(notes).values(input.data).returning();
  res.status(201).json(note);
});

notesRouter.patch("/:id", async (req, res) => {
  const id = noteIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }
  const input = noteInputSchema.safeParse(req.body);
  if (!input.success) {
    sendValidationError(res, input.error);
    return;
  }
  const [note] = await db
    .update(notes)
    .set(input.data)
    .where(eq(notes.id, id.data))
    .returning();
  if (!note) {
    sendNotFound(res);
    return;
  }
  res.json(note);
});

notesRouter.delete("/:id", async (req, res) => {
  const id = noteIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }
  const [note] = await db
    .delete(notes)
    .where(eq(notes.id, id.data))
    .returning({ id: notes.id });
  if (!note) {
    sendNotFound(res);
    return;
  }
  res.status(204).end();
});
