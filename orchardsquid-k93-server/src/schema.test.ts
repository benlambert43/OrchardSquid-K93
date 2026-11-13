import { getTableName } from "drizzle-orm";
import { expect, it } from "vitest";

import { notes } from "./schema.ts";

it("has a notes table that takes Hello World", () => {
  const note = { body: "Hello World" } satisfies typeof notes.$inferInsert;
  expect(note.body).toBe("Hello World");
  expect(getTableName(notes)).toBe("notes");
});
