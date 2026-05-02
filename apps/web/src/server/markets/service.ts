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

export function filterMarkets<T extends { city: string; title: string }>(
  markets: T[],
  filters: {
    city?: string;
    keyword?: string;
  }
) {
  return markets.filter((market) => {
    const cityMatched = filters.city ? market.city === filters.city : true;
    const keywordMatched = filters.keyword
      ? market.title.includes(filters.keyword)
      : true;

    return cityMatched && keywordMatched;
  });
}
