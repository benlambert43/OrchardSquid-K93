import { z } from "zod";

const origin = z.url().transform((value, context) => {
  const url = new URL(value);
  if (!url.host) {
    context.addIssue({
      code: "custom",
      message: `${value} has no host; write it as scheme://host[:port]`,
    });
    return z.NEVER;
  }
  return `${url.protocol}//${url.host.toLowerCase()}`;
});

const serverEnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  BASE_FRONTEND_URL: z.url({ protocol: /^https?$/ }).pipe(origin),
  EXTRA_ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    )
    .pipe(z.array(origin)),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().min(1).default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
});

export const serverEnv = serverEnvSchema.parse(process.env);
