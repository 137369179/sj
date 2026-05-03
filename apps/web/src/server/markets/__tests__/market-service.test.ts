import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  buildMarketPayload,
  canPublishMarket,
  createOrganizerMarket,
  getPublishedMarketById,
  listOrganizerMarkets,
  listOrganizerMarketOptions,
  listPublishedMarkets,
  MarketPublishError,
  publishOrganizerMarket,
  updateOrganizerMarket
} from "../service";

describe("market service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes a market payload", () => {
    const result = buildMarketPayload({
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: "2026-05-01T10:00:00.000Z",
      endsAt: "2026-05-02T18:00:00.000Z"
    });

    expect(result.title).toBe("春日咖啡市集");
    expect(result.city).toBe("杭州");
  });

  it("rejects a market payload when start time is after end time", () => {
    expect(() =>
      buildMarketPayload({
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: "2026-05-02T18:00:00.000Z",
        endsAt: "2026-05-01T10:00:00.000Z"
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      [ZodError: [
        {
          "code": "custom",
          "message": "开始时间不能晚于结束时间",
          "path": [
            "startsAt"
          ]
        },
        {
          "code": "custom",
          "message": "结束时间不能早于开始时间",
          "path": [
            "endsAt"
          ]
        }
      ]]
    `);
  });

  it("allows publish only for draft market", () => {
    expect(canPublishMarket("draft")).toBe(true);
    expect(canPublishMarket("published")).toBe(false);
  });

  it("lists organizer market options ordered by start time", async () => {
    vi.spyOn(db.market, "findMany").mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        startsAt: new Date("2026-06-08T10:00:00.000Z")
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: new Date("2026-05-18T10:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof db.market.findMany>>);

    await expect(listOrganizerMarketOptions("org_1")).resolves.toEqual([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海"
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      }
    ]);
  });

  it("lists organizer markets with management fields", async () => {
    vi.spyOn(db.market, "findMany").mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z"),
        status: "published"
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        status: "draft"
      }
    ] as Awaited<ReturnType<typeof db.market.findMany>>);

    await expect(listOrganizerMarkets("org_1")).resolves.toEqual([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        status: "published",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z")
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        status: "draft",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z")
      }
    ]);
  });

  it("lists only published markets for vendors and applies filters", async () => {
    const findManySpy = vi.spyOn(db.market, "findMany").mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        coverUrl: "https://example.com/cover2.jpg",
        description: "Desc 2",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z"),
        organizer: { name: "Org 2" },
        _count: { stalls: 5 }
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        coverUrl: "https://example.com/cover1.jpg",
        description: "Desc 1",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        organizer: { name: "Org 1" },
        _count: { stalls: 10 }
      }
    ] as any);

    await expect(
      listPublishedMarkets({
        city: "上海",
        keyword: "面包"
      })
    ).resolves.toEqual([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        coverUrl: "https://example.com/cover2.jpg",
        description: "Desc 2",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z"),
        status: "published",
        organizerName: "Org 2",
        stallsCount: 5
      }
    ]);

    expect(findManySpy).toHaveBeenCalledWith({
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
        organizer: { select: { name: true } },
        _count: { select: { stalls: { where: { isActive: true } } } }
      },
      orderBy: {
        startsAt: "asc"
      }
    });
  });

  it("returns a published market by id for vendor pages", async () => {
    const findFirstSpy = vi.spyOn(db.market, "findFirst").mockResolvedValue({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: "https://example.com/cover1.jpg",
      description: "Desc 1",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      organizer: { name: "Org 1" },
      _count: { stalls: 10 }
    } as any);

    await expect(getPublishedMarketById("market_1")).resolves.toEqual({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: "https://example.com/cover1.jpg",
      description: "Desc 1",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      organizerName: "Org 1",
      stallsCount: 10
    });

    expect(findFirstSpy).toHaveBeenCalledWith({
      where: {
        id: "market_1",
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
        organizer: { select: { name: true } },
        _count: { select: { stalls: { where: { isActive: true } } } }
      }
    });
  });

  it("creates an organizer market as draft", async () => {
    const createSpy = vi.spyOn(db.market, "create").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "draft"
    } as Awaited<ReturnType<typeof db.market.create>>);

    await expect(
      createOrganizerMarket({
        organizerId: "org_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: "2026-05-18T10:00:00.000Z",
        endsAt: "2026-05-18T18:00:00.000Z"
      })
    ).resolves.toMatchObject({
      id: "market_1",
      organizerId: "org_1",
      status: "draft"
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        organizerId: "org_1",
        title: "春日咖啡市集",
        city: "杭州",
        coverUrl: null,
        description: null,
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        status: "draft"
      }
    });
  });

  it("updates an existing draft market", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      status: "draft"
    } as any);

    const updateSpy = vi.spyOn(db.market, "update").mockResolvedValue({} as any);

    await updateOrganizerMarket("market_1", {
      organizerId: "org_1",
      title: "更新后的咖啡市集",
      city: "杭州",
      coverUrl: "https://example.com/cover2.jpg",
      description: "Desc 2",
      startsAt: "2026-05-18T10:00:00.000Z",
      endsAt: "2026-05-18T18:00:00.000Z"
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "market_1" },
      data: {
        title: "更新后的咖啡市集",
        city: "杭州",
        coverUrl: "https://example.com/cover2.jpg",
        description: "Desc 2",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z")
      }
    });
  });

  it("publishes a draft market for the same organizer", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "draft",
      isPlatformApproved: false,
      organizer: { isVerified: true }
    } as Awaited<ReturnType<typeof db.market.findUnique>>);
    const updateSpy = vi.spyOn(db.market, "update").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      isPlatformApproved: false
    } as Awaited<ReturnType<typeof db.market.update>>);

    await expect(
      publishOrganizerMarket({
        marketId: "market_1",
        organizerId: "org_1"
      })
    ).resolves.toMatchObject({
      id: "market_1",
      status: "published"
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: "market_1"
      },
      data: {
        status: "published"
      }
    });
  });

  it("rejects publishing a market from another organizer", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_2",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "draft",
      isPlatformApproved: false,
      organizer: { isVerified: true }
    } as Awaited<ReturnType<typeof db.market.findUnique>>);

    await expect(
      publishOrganizerMarket({
        marketId: "market_1",
        organizerId: "org_1"
      })
    ).rejects.toEqual(new MarketPublishError("FORBIDDEN"));
  });

  it("rejects publishing a market if the organizer is not verified", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "draft",
      isPlatformApproved: false,
      organizer: { isVerified: false }
    } as Awaited<ReturnType<typeof db.market.findUnique>>);

    await expect(
      publishOrganizerMarket({
        marketId: "market_1",
        organizerId: "org_1"
      })
    ).rejects.toEqual(new MarketPublishError("UNVERIFIED_ORGANIZER"));
  });
});
