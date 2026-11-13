import { z } from "zod";

export const serviceStatusSchema = z.enum(["ok", "error"]);

export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  database: serviceStatusSchema,
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
