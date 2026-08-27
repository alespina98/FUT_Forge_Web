import { z } from "zod";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { EVENT_NAMES, CLIENT_TYPES } from "./events.ts";

// Mirrors the sensitive-field tripwire already used server-side for club
// sync ingestion (futforge_backend/app.py) - reject any property whose key
// looks like it could carry credentials/session material.
const SENSITIVE_KEY_PATTERN = /password|otp|token|secret|cookie|credential|authoriz|bearer|refresh|signing|sid\b/i;

const propertyValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

const properties = z
  .record(z.string().max(100), propertyValue)
  .refine((value) => Object.keys(value).length <= 20, { message: "properties: too many keys" })
  .refine((value) => Object.keys(value).every((key) => !SENSITIVE_KEY_PATTERN.test(key)), {
    message: "properties: sensitive key rejected",
  });

export const eventEnvelopeSchema = z.object({
  event: z.enum(EVENT_NAMES),
  timestamp: z.number().int().positive().optional(),
  client_type: z.enum(CLIENT_TYPES),
  client_version: z.string().max(64).nullable().optional(),
  install_id: z.string().min(1).max(128),
  session_id: z.string().max(128).nullable().optional(),
  properties: properties.optional(),
});

export const eventBatchSchema = z.object({
  events: z.array(eventEnvelopeSchema).min(1).max(25),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
