import { z } from "zod";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { ALL_ACCEPTED_CLIENT_TYPES, ALLOWED_PROPERTY_KEYS, EVENT_NAMES } from "./events.ts";

const propertyValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

// Explicit allowlist (event contract v1) rather than a denylist alone: a
// property key must be one of the names every platform is documented to
// send. This also structurally forbids credential-shaped keys, since none
// of the allowed names could carry one.
const properties = z
  .record(z.string().max(100), propertyValue)
  .refine((value) => Object.keys(value).length <= 20, { message: "properties: too many keys" })
  .refine((value) => Object.keys(value).every((key) => (ALLOWED_PROPERTY_KEYS as readonly string[]).includes(key)), {
    message: "properties: key not in the event contract's allowlist",
  });

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // clock skew allowance
const PAST_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000; // an offline queue may replay old events, but not indefinitely

const timestamp = z
  .number()
  .int()
  .positive()
  .optional()
  .refine((value) => value === undefined || (value <= Date.now() + FUTURE_TOLERANCE_MS && value >= Date.now() - PAST_TOLERANCE_MS), {
    message: "timestamp outside the accepted window",
  });

export const eventEnvelopeSchema = z.object({
  event: z.enum(EVENT_NAMES),
  event_version: z.number().int().positive().max(100).optional(),
  event_id: z.string().min(1).max(64).optional(),
  timestamp,
  client_type: z.enum(ALL_ACCEPTED_CLIENT_TYPES),
  client_version: z.string().max(64).nullable().optional(),
  install_id: z.string().min(1).max(128),
  session_id: z.string().max(128).nullable().optional(),
  properties: properties.optional(),
});

export const eventBatchSchema = z.object({
  events: z.array(eventEnvelopeSchema).min(1).max(25),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
