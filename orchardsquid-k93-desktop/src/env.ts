import { envSchema } from "@/envSchema.ts";

export const env = envSchema.parse(import.meta.env);
