import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { POST } from "./route";

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

describe("POST /api/markets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("rejects requests without an organizer session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const request = new Request("http://localhost/api/markets", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: "2026-05-18T10:00:00.000Z",
        endsAt: "2026-05-18T18:00:00.000Z"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "unauthorized" });
  });

  it("creates a market with organizerId from session instead of request body", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    const createSpy = vi.spyOn(db.market, "create").mockResolvedValue({
      id: "market_1",
      organizerId: "org_session_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "draft"
    } as Awaited<ReturnType<typeof db.market.create>>);

    const request = new Request("http://localhost/api/markets", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: "2026-05-18T10:00:00.000Z",
        endsAt: "2026-05-18T18:00:00.000Z"
      })
    });

    const response = await POST(request);

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        organizerId: "org_session_1",
        title: "春日咖啡市集",
        city: "杭州",
        coverUrl: null,
        description: null,
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        status: "draft"
      }
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "market_1",
      organizerId: "org_session_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: "2026-05-18T10:00:00.000Z",
      endsAt: "2026-05-18T18:00:00.000Z",
      status: "draft"
    });
  });

  it("returns field errors when start time is after end time", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });

    const request = new Request("http://localhost/api/markets", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: "2026-05-18T18:00:00.000Z",
        endsAt: "2026-05-18T10:00:00.000Z"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "validation failed",
      fieldErrors: {
        startsAt: ["开始时间不能晚于结束时间"],
        endsAt: ["结束时间不能早于开始时间"]
      }
    });
  });
});
