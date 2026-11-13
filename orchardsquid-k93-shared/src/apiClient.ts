import { type HealthResponse, healthResponseSchema } from "./health.ts";

export function createApiClient(apiUrl: (path: string) => URL) {
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

  return { getHealth };
}

export type ApiClient = ReturnType<typeof createApiClient>;
