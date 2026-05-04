import { z } from "zod";

export const storedAttachmentSchema = z.object({
  url: z.string().trim().min(1),
  originalName: z.string().trim().min(1)
});

export type StoredAttachment = z.infer<typeof storedAttachmentSchema>;

export function normalizeAttachments(input: unknown): StoredAttachment[] {
  return z.array(storedAttachmentSchema).parse(input ?? []);
}
