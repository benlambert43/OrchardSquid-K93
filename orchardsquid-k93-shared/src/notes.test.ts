import { expect, it } from "vitest";

import { noteInputSchema } from "./notes.ts";

it("accepts Hello World as a note", () => {
  expect(noteInputSchema.parse({ body: "Hello World" })).toEqual({
    body: "Hello World",
  });
});
