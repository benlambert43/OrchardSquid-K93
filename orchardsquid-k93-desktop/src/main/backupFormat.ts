import { z } from "zod";

export const backupFormat = "orchardsquid-k93-ssh-backup";
export const backupVersion = 1;

const maxKeyLength = 16_384;
const maxEntries = 100;

const lineSchema = z.string().regex(/^[^\p{Cc}]*$/u);
const wordSchema = z.string().regex(/^\S+$/);
const hostPattern = String.raw`(?:\[[\w.:-]+\]:\d+|[\w.:-]+)`;
const hashedHostPattern = String.raw`\|1\|[A-Za-z0-9+/=]+\|[A-Za-z0-9+/=]+`;

export const knownHostSchema = z.object({
  hosts: z
    .string()
    .regex(
      new RegExp(
        `^(?:${hashedHostPattern}|${hostPattern}(?:,${hostPattern})*)$`,
      ),
    ),
  type: wordSchema,
  key: wordSchema,
});

const publicKeySchema = z.object({
  type: wordSchema,
  key: wordSchema,
  fingerprint: z.string(),
});

export const configHostSchema = z.object({
  host: lineSchema.min(1),
  options: z
    .array(z.object({ name: wordSchema, value: lineSchema }))
    .max(maxEntries),
});

export const backupSchema = z.object({
  "manifest.json": z.object({
    format: z.literal(backupFormat),
    version: z.literal(backupVersion),
    createdAt: z.string(),
    appVersion: z.string(),
    computer: z.string(),
    files: z.array(z.string()),
  }),
  "connection.json": z.object({
    transport: z.literal("usb"),
    usbProductId: z.number(),
    port: z.number(),
    username: z.string(),
  }),
  "ipad.json": z.object({
    ipad: z
      .object({
        name: z.string(),
        productType: z.string(),
        hardwareModel: z.string(),
        productVersion: z.string(),
        buildVersion: z.string(),
        wifiAddress: z.string(),
        udid: z.string(),
      })
      .nullable(),
    hostKey: publicKeySchema.nullable(),
  }),
  "key.json": z.object({
    path: z.string(),
    type: z.string().nullable(),
    fingerprint: z.string().nullable(),
    privateKey: z.string().min(1).max(maxKeyLength),
    publicKey: z.string().max(maxKeyLength).nullable(),
  }),
  "known-hosts.json": z.object({
    entries: z.array(knownHostSchema).max(maxEntries),
  }),
  "ssh-config.json": z.object({
    hosts: z.array(configHostSchema).max(maxEntries),
  }),
});

export type BackupFiles = z.infer<typeof backupSchema>;

export type PublicKey = z.infer<typeof publicKeySchema>;
export type KnownHost = z.infer<typeof knownHostSchema>;
export type ConfigHost = z.infer<typeof configHostSchema>;
