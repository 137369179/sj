import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  buildMarketPayload,
  canPublishMarket,
  listOrganizerMarkets,
  listOrganizerMarketOptions
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
});
