import { z } from "zod";

import { storedAttachmentSchema } from "../../lib/storage";

const optionalNoteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const applicationSchema = z.object({
  marketId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  boothPreference: z.string().trim().min(1),
  note: optionalNoteSchema,
  attachments: z.array(storedAttachmentSchema).default([])
});

export type ApplicationPayload = z.infer<typeof applicationSchema>;

export function buildApplicationPayload(input: unknown): ApplicationPayload {
  return applicationSchema.parse(input);
}

export function makeApplicationKey(marketId: string, vendorId: string) {
  return `${marketId}:${vendorId}`;
}
