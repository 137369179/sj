import { z } from "zod";

import { db } from "../../lib/db";

export const marketSchema = z.object({
  title: z.string().trim().min(2),
  city: z.string().trim().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

export type MarketPayload = z.infer<typeof marketSchema>;

export type DemoMarket = {
  id: string;
  title: string;
  city: string;
  date: string;
  description: string;
};

export type OrganizerMarketOption = {
  id: string;
  title: string;
  city: string;
};

const demoMarkets: DemoMarket[] = [
  {
    id: "spring-coffee",
    title: "春日咖啡市集",
    city: "杭州",
    date: "2026-05-18",
    description: "面向精品咖啡、甜点与生活方式品牌开放招募。"
  },
  {
    id: "craft-weekend",
    title: "独立手作品牌周末",
    city: "上海",
    date: "2026-06-06",
    description: "聚焦手作、文创与小众设计品牌的周末限定市集。"
  }
];

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

export function listDemoMarkets() {
  return [...demoMarkets];
}

export function getDemoMarketById(marketId: string) {
  return demoMarkets.find((market) => market.id === marketId);
}

export async function listOrganizerMarketOptions(
  organizerId: string
): Promise<OrganizerMarketOption[]> {
  const markets = await db.market.findMany({
    where: {
      organizerId
    },
    select: {
      id: true,
      title: true,
      city: true,
      startsAt: true
    },
    orderBy: {
      startsAt: "desc"
    }
  });

  return markets.map(({ id, title, city }) => ({
    id,
    title,
    city
  }));
}
