import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { SectionHeading } from "./AppShell.tsx";

it("renders Hello World", () => {
  render(<SectionHeading>Hello World</SectionHeading>);
  expect(
    screen.getByRole("heading", { name: "Hello World" }),
  ).toBeInTheDocument();
});
