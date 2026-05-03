import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import { listOrganizers, verifyOrganizer } from "../service";

vi.mock("../../../lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
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
          isVerified: false,
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
          isVerified: true,
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
        isVerified: false,
        createdAt: new Date("2026-05-01T10:00:00Z"),
        marketCount: 2
      });
    });
  });

  describe("verifyOrganizer", () => {
    it("verifies an organizer successfully", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "org_1",
        role: "organizer"
      } as any);

      await verifyOrganizer("org_1");

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "org_1" },
        data: { isVerified: true }
      });
    });

    it("throws if user is not found or not an organizer", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      await expect(verifyOrganizer("org_1")).rejects.toThrow("Organizer not found");

      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "vendor_1",
        role: "vendor"
      } as any);
      await expect(verifyOrganizer("vendor_1")).rejects.toThrow("Organizer not found");
    });
  });
});