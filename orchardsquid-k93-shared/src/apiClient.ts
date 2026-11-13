import { type HealthResponse, healthResponseSchema } from "./health.ts";
import { type Note, type NoteInput, noteSchema } from "./notes.ts";

export function createApiClient(apiUrl: (path: string) => URL) {
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<Response> {
    const response = await fetch(apiUrl(path), {
      method,
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(
        `${method} ${path} failed with ${String(response.status)}`,
      );
    }
    return response;
  }

  async function getHealth(): Promise<HealthResponse | null> {
    try {
      const response = await fetch(apiUrl("/api/v1/health"), {
        signal: AbortSignal.timeout(3000),
      });
      const parsed = healthResponseSchema.safeParse(await response.json());
      return parsed.success ? parsed.data : null;
    } catch (error) {
      console.error("API health check failed", error);
      return null;
    }
  }

  async function getNotes(): Promise<Note[]> {
    const response = await request("/api/v1/notes");
    return noteSchema.array().parse(await response.json());
  }

  async function createNote(input: NoteInput): Promise<void> {
    await request("/api/v1/notes", "POST", input);
  }

  async function updateNote(id: string, input: NoteInput): Promise<void> {
    await request(`/api/v1/notes/${id}`, "PATCH", input);
  }

  async function deleteNote(id: string): Promise<void> {
    await request(`/api/v1/notes/${id}`, "DELETE");
  }

  return { getHealth, getNotes, createNote, updateNote, deleteNote };
}

export type ApiClient = ReturnType<typeof createApiClient>;
