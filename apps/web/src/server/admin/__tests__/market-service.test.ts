import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  approveMarket,
  getAdminMarketById,
  listAdminMarkets,
  rejectMarket
} from "../market-service";

vi.mock("../../../lib/db", () => ({
  db: {
    market: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe("admin market service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAdminMarketById", () => {
    it("returns market with organizer details", async () => {
      vi.mocked(db.market.findUnique).mockResolvedValue({ id: "market_1" } as any);
      await getAdminMarketById("market_1");
      expect(db.market.findUnique).toHaveBeenCalledWith({
        where: { id: "market_1" },
        include: { organizer: { select: { name: true, phone: true } } }
      });
    });
  });

  describe("listAdminMarkets", () => {
    it("returns markets with stats", async () => {
      vi.mocked(db.market.findMany).mockResolvedValue([{ id: "market_1" }] as any);
      await listAdminMarkets();
      expect(db.market.findMany).toHaveBeenCalledWith({
        include: {
          organizer: { select: { name: true } },
          _count: { select: { stalls: true, applications: true } }
        },
        orderBy: { startsAt: "desc" }
      });
    });
  });

  describe("approveMarket", () => {
    it("approves a published market", async () => {
      vi.mocked(db.market.findUnique).mockResolvedValue({
        id: "market_1",
        status: "published"
      } as any);

      await approveMarket("market_1");

      expect(db.market.update).toHaveBeenCalledWith({
        where: { id: "market_1" },
        data: { isPlatformApproved: true }
      });
    });

    it("throws if market is not published", async () => {
      vi.mocked(db.market.findUnique).mockResolvedValue({
        id: "market_1",
        status: "draft"
      } as any);

      await expect(approveMarket("market_1")).rejects.toThrow("Only published markets can be approved");
    });
  });

  describe("rejectMarket", () => {
    it("rejects market and returns it to draft", async () => {
      vi.mocked(db.market.findUnique).mockResolvedValue({
        id: "market_1",
        status: "published"
      } as any);

      await rejectMarket("market_1");

      expect(db.market.update).toHaveBeenCalledWith({
        where: { id: "market_1" },
        data: { status: "draft", isPlatformApproved: false }
      });
    });
  });
});