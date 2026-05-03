import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import { listOrganizers } from "../service";

vi.mock("../../../lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn()
    }
  }
}));

describe("admin service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listOrganizers", () => {
    it("returns list of organizers with market counts", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([
        {
          id: "org_1",
          name: "Org 1",
          phone: "123",
          createdAt: new Date("2026-05-01T10:00:00Z"),
          _count: { organizedMarkets: 2 }
        }
      ] as any);

      const results = await listOrganizers();

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { role: "organizer" },
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
          _count: { select: { organizedMarkets: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: "org_1",
        name: "Org 1",
        phone: "123",
        createdAt: new Date("2026-05-01T10:00:00Z"),
        marketCount: 2
      });
    });
  });
});