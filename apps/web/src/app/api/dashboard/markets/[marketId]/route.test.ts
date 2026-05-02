import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionRole } from "../../../../../lib/auth";
import {
  DashboardQueryError,
  getMarketDashboardSummary
} from "../../../../../server/dashboard/service";
import { GET } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionRole: vi.fn()
}));

vi.mock("../../../../../server/dashboard/service", () => ({
  DashboardQueryError: class DashboardQueryError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  getMarketDashboardSummary: vi.fn()
}));

describe("GET /api/dashboard/markets/[marketId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-organizer roles", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("vendor");

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_1?organizerId=org_1"),
      {
        params: Promise.resolve({
          marketId: "market_1"
        })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
    expect(getMarketDashboardSummary).not.toHaveBeenCalled();
  });

  it("returns the market dashboard summary for organizers", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(getMarketDashboardSummary).mockResolvedValue({
      market: {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      metrics: {
        totalApplications: 5,
        pendingReviewCount: 2,
        approvedCount: 1,
        rejectedCount: 1,
        assignedCount: 1,
        approvalRate: 0.4
      }
    });

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_1?organizerId=org_1"),
      {
        params: Promise.resolve({
          marketId: "market_1"
        })
      }
    );

    expect(getMarketDashboardSummary).toHaveBeenCalledWith({
      organizerId: "org_1",
      marketId: "market_1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      market: {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      metrics: {
        totalApplications: 5,
        pendingReviewCount: 2,
        approvedCount: 1,
        rejectedCount: 1,
        assignedCount: 1,
        approvalRate: 0.4
      }
    });
  });

  it("returns not found when the market does not exist", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(getMarketDashboardSummary).mockRejectedValue(
      new DashboardQueryError("NOT_FOUND")
    );

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_404?organizerId=org_1"),
      {
        params: Promise.resolve({
          marketId: "market_404"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "market not found" });
  });
});
