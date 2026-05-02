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

export type OrganizerMarketListItem = {
  id: string;
  title: string;
  city: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
};

export type CreateOrganizerMarketInput = MarketPayload & {
  organizerId: string;
};

export type PublishOrganizerMarketInput = {
  marketId: string;
  organizerId: string;
};

export type MarketPublishErrorCode = "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS";

export class MarketPublishError extends Error {
  code: MarketPublishErrorCode;

  constructor(code: MarketPublishErrorCode) {
    super(code);
    this.code = code;
  }
}

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

export async function listOrganizerMarkets(
  organizerId: string
): Promise<OrganizerMarketListItem[]> {
  return db.market.findMany({
    where: {
      organizerId
    },
    select: {
      id: true,
      title: true,
      city: true,
      status: true,
      startsAt: true,
      endsAt: true
    },
    orderBy: {
      startsAt: "desc"
    }
  });
}

export async function createOrganizerMarket(input: CreateOrganizerMarketInput) {
  const payload = buildMarketPayload(input);

  return db.market.create({
    data: {
      organizerId: input.organizerId,
      title: payload.title,
      city: payload.city,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt),
      status: "draft"
    }
  });
}

export async function publishOrganizerMarket(input: PublishOrganizerMarketInput) {
  const market = await db.market.findUnique({
    where: {
      id: input.marketId
    }
  });

  if (!market) {
    throw new MarketPublishError("NOT_FOUND");
  }

  if (market.organizerId !== input.organizerId) {
    throw new MarketPublishError("FORBIDDEN");
  }

  if (!canPublishMarket(market.status)) {
    throw new MarketPublishError("INVALID_STATUS");
  }

  return db.market.update({
    where: {
      id: input.marketId
    },
    data: {
      status: "published"
    }
  });
}
