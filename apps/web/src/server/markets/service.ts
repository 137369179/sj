import { z } from "zod";

export const marketSchema = z.object({
  title: z.string().trim().min(2),
  city: z.string().trim().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

export type MarketPayload = z.infer<typeof marketSchema>;

export function buildMarketPayload(input: unknown): MarketPayload {
  return marketSchema.parse(input);
}

export function canPublishMarket(status: string) {
  return status === "draft";
}
