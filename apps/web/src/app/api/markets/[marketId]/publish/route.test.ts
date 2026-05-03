import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

describe("POST /api/markets/[marketId]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("rejects requests without an organizer session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/markets/market_1/publish"), {
      params: Promise.resolve({ marketId: "market_1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "unauthorized" });
  });

  it("rejects publishing a market owned by another organizer", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_other",
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

    const response = await POST(new Request("http://localhost/api/markets/market_1/publish"), {
      params: Promise.resolve({ marketId: "market_1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
  });

  it("publishes a market for the organizer from session identity", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_session_1",
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
      organizerId: "org_session_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      isPlatformApproved: false
    } as Awaited<ReturnType<typeof db.market.update>>);

    const response = await POST(new Request("http://localhost/api/markets/market_1/publish"), {
      params: Promise.resolve({ marketId: "market_1" })
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: "market_1" },
      data: { status: "published" }
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "market_1",
      organizerId: "org_session_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: null,
      description: null,
      startsAt: "2026-05-18T10:00:00.000Z",
      endsAt: "2026-05-18T18:00:00.000Z",
      status: "published",
      isPlatformApproved: false
    });
  });

  it("rejects publishing a market if the organizer is not verified", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_session_1",
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

    const response = await POST(new Request("http://localhost/api/markets/market_1/publish"), {
      params: Promise.resolve({ marketId: "market_1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "unverified organizer" });
  });
});
