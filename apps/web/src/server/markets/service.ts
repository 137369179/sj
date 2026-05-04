import { z } from "zod";

import { db } from "../../lib/db";

export const marketSchema = z
  .object({
    title: z.string().trim().min(2),
    city: z.string().trim().min(2),
    coverUrl: z.string().url().optional().or(z.literal("")),
    description: z.string().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .superRefine((value, context) => {
    const startsAt = new Date(value.startsAt);
    const endsAt = new Date(value.endsAt);

    if (startsAt.getTime() <= endsAt.getTime()) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "开始时间不能晚于结束时间",
      path: ["startsAt"]
    });
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "结束时间不能早于开始时间",
      path: ["endsAt"]
    });
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
  isPlatformApproved: boolean;
  startsAt: Date;
  endsAt: Date;
};

export type PublishedMarketListItem = {
  id: string;
  title: string;
  city: string;
  coverUrl?: string | null;
  description?: string | null;
  startsAt: Date;
  endsAt: Date;
  status?: string;
  organizerName: string;
  stallsCount: number;
};

export type CreateOrganizerMarketInput = MarketPayload & {
  organizerId: string;
};

export type PublishOrganizerMarketInput = {
  marketId: string;
  organizerId: string;
};

export type MarketPublishErrorCode = "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS" | "UNVERIFIED_ORGANIZER";

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

export function filterMarkets<T extends { city: string; title: string; startsAt: Date; endsAt: Date }>(
  markets: T[],
  filters: {
    city?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  return markets.filter((market) => {
    const cityMatched = filters.city ? market.city === filters.city : true;
    const keywordMatched = filters.keyword
      ? market.title.includes(filters.keyword)
      : true;

    let dateMatched = true;
    if (filters.dateFrom) {
      dateMatched = dateMatched && market.endsAt.getTime() >= new Date(filters.dateFrom).getTime();
    }
    if (filters.dateTo) {
      // Add one day to dateTo to include the entire day
      const toDate = new Date(filters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      dateMatched = dateMatched && market.startsAt.getTime() < toDate.getTime();
    }

    return cityMatched && keywordMatched && dateMatched;
  });
}

export function listDemoMarkets() {
  return [...demoMarkets];
}

export function getDemoMarketById(marketId: string) {
  return demoMarkets.find((market) => market.id === marketId);
}

function mapDemoMarketToPublishedMarket(market: DemoMarket): PublishedMarketListItem {
  const startsAt = new Date(`${market.date}T00:00:00.000Z`);
  const endsAt = new Date(`${market.date}T23:59:59.999Z`);

  return {
    id: market.id,
    title: market.title,
    city: market.city,
    description: market.description,
    startsAt,
    endsAt,
    status: "published",
    organizerName: "平台示例",
    stallsCount: 0
  };
}

export async function listPublishedMarkets(filters: {
  city?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PublishedMarketListItem[]> {
  if (isDemoLoginEnabled()) {
    return filterMarkets(demoMarkets.map(mapDemoMarketToPublishedMarket), filters);
  }

  try {
    const markets = await db.market.findMany({
      where: {
        status: "published",
        isPlatformApproved: true
      },
      select: {
        id: true,
        title: true,
        city: true,
        coverUrl: true,
        description: true,
        startsAt: true,
        endsAt: true,
        organizer: {
          select: { name: true }
        },
        _count: {
          select: { stalls: { where: { isActive: true } } }
        }
      },
      orderBy: {
        startsAt: "asc"
      }
    });

    return filterMarkets(
      markets.map((m) => ({
        id: m.id,
        title: m.title,
        city: m.city,
        coverUrl: m.coverUrl,
        description: m.description,
        startsAt: m.startsAt,
        endsAt: m.endsAt,
        status: "published",
        organizerName: m.organizer.name,
        stallsCount: m._count.stalls
      })),
      filters
    );
  } catch {
    return filterMarkets(demoMarkets.map(mapDemoMarketToPublishedMarket), filters);
  }
}

export async function getPublishedMarketById(
  marketId: string
): Promise<PublishedMarketListItem | null> {
  if (isDemoLoginEnabled()) {
    const demoMarket = getDemoMarketById(marketId);
    return demoMarket ? mapDemoMarketToPublishedMarket(demoMarket) : null;
  }

  const market = await db.market.findFirst({
    where: {
      id: marketId,
      status: "published",
      isPlatformApproved: true
    },
    select: {
      id: true,
      title: true,
      city: true,
      coverUrl: true,
      description: true,
      startsAt: true,
      endsAt: true,
      status: true,
      organizer: {
        select: { name: true }
      },
      _count: {
        select: { stalls: { where: { isActive: true } } }
      }
    }
  });

  if (!market) {
    return null;
  }

  return {
    id: market.id,
    title: market.title,
    city: market.city,
    coverUrl: market.coverUrl,
    description: market.description,
    startsAt: market.startsAt,
    endsAt: market.endsAt,
    status: market.status,
    organizerName: market.organizer.name,
    stallsCount: market._count.stalls
  };
}

export async function listOrganizerMarketOptions(
  organizerId: string
): Promise<OrganizerMarketOption[]> {
  if (isDemoOrganizerUser(organizerId)) {
    return [];
  }

  try {
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
  } catch (error) {
    if (isDemoLoginEnabled()) {
      return [];
    }

    throw error;
  }
}

export async function listOrganizerMarkets(
  organizerId: string
): Promise<OrganizerMarketListItem[]> {
  if (isDemoOrganizerUser(organizerId)) {
    return [];
  }

  try {
    return await db.market.findMany({
      where: {
        organizerId
      },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        isPlatformApproved: true,
        startsAt: true,
        endsAt: true
      },
      orderBy: {
        startsAt: "desc"
      }
    });
  } catch (error) {
    if (isDemoLoginEnabled()) {
      return [];
    }

    throw error;
  }
}

export async function createOrganizerMarket(input: CreateOrganizerMarketInput) {
  const payload = buildMarketPayload(input);
  return db.market.create({
    data: {
      organizerId: input.organizerId,
      title: payload.title,
      city: payload.city,
      coverUrl: payload.coverUrl || null,
      description: payload.description || null,
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
    },
    include: {
      organizer: {
        select: { isVerified: true }
      }
    }
  });

  if (!market) {
    throw new MarketPublishError("NOT_FOUND");
  }

  if (market.organizerId !== input.organizerId) {
    throw new MarketPublishError("FORBIDDEN");
  }

  if (!market.organizer.isVerified) {
    throw new MarketPublishError("UNVERIFIED_ORGANIZER");
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

export async function updateOrganizerMarket(
  marketId: string,
  input: MarketPayload & { organizerId: string }
) {
  const payload = buildMarketPayload(input);

  const market = await db.market.findUnique({
    where: { id: marketId }
  });

  if (!market) {
    throw new Error("Market not found");
  }

  if (market.organizerId !== input.organizerId) {
    throw new Error("Forbidden");
  }

  if (market.status !== "draft") {
    throw new Error("Only draft markets can be edited");
  }

  return db.market.update({
    where: { id: marketId },
    data: {
      title: payload.title,
      city: payload.city,
      coverUrl: payload.coverUrl || null,
      description: payload.description || null,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt)
    }
  });
}

function isDemoLoginEnabled() {
  return process.env.AUTH_ENABLE_DEMO_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

function isDemoOrganizerUser(organizerId: string) {
  return isDemoLoginEnabled() && organizerId === "organizer_1";
}
