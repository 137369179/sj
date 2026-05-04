import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import {
  DashboardQueryError,
  getMarketDashboardSummary
} from "../../../../../server/dashboard/service";
import { GET } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
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
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_1"),
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

  it("uses the session userId for dashboard queries without requiring organizerId in search params", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(getMarketDashboardSummary).mockResolvedValue({
      market: {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      metrics: {
        totalApplications: 5,
        submittedCount: 2,
        underReviewCount: 0,
        pendingReviewCount: 2,
        approvedCount: 1,
        rejectedCount: 1,
        assignedCount: 1,
        paidCount: 0,
        supplementPendingCount: 1,
        waitlistPendingCount: 2,
        followUpUrgentCount: 1,
        paymentPendingCount: 2,
        paymentUrgentCount: 1,
        paymentOverdueCount: 1,
        paymentCreatedCount: 4,
        paymentCompletedCount: 1,
        paymentReleasedCount: 1,
        paymentReminderCount: 2,
        paymentReminderConvertedCount: 1,
        paymentCompletionRate: 0.25,
        paymentReleaseRate: 0.25,
        paymentReminderConversionRate: 0.5,
        approvalRate: 0.4,
        totalStalls: 6,
        activeStalls: 5,
        occupiedStalls: 2,
        stallOccupancyRate: 0.4,
        totalRevenue: 0
      },
      recentAutomationActivities: [
        {
          title: "支付自动催办已执行",
          content: "春日咖啡市集已自动催办 2 笔支付临期订单。",
          createdAt: "2026-05-03T10:30:00.000Z"
        }
      ]
    });

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_1"),
      {
        params: Promise.resolve({
          marketId: "market_1"
        })
      }
    );

    expect(getMarketDashboardSummary).toHaveBeenCalledWith({
      organizerId: "org_session_1",
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
        submittedCount: 2,
        underReviewCount: 0,
        pendingReviewCount: 2,
        approvedCount: 1,
        rejectedCount: 1,
        assignedCount: 1,
        paidCount: 0,
        supplementPendingCount: 1,
        waitlistPendingCount: 2,
        followUpUrgentCount: 1,
        paymentPendingCount: 2,
        paymentUrgentCount: 1,
        paymentOverdueCount: 1,
        paymentCreatedCount: 4,
        paymentCompletedCount: 1,
        paymentReleasedCount: 1,
        paymentReminderCount: 2,
        paymentReminderConvertedCount: 1,
        paymentCompletionRate: 0.25,
        paymentReleaseRate: 0.25,
        paymentReminderConversionRate: 0.5,
        approvalRate: 0.4,
        totalStalls: 6,
        activeStalls: 5,
        occupiedStalls: 2,
        stallOccupancyRate: 0.4,
        totalRevenue: 0
      },
      recentAutomationActivities: [
        {
          title: "支付自动催办已执行",
          content: "春日咖啡市集已自动催办 2 笔支付临期订单。",
          createdAt: "2026-05-03T10:30:00.000Z"
        }
      ]
    });
  });

  it("returns not found when the market does not exist", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(getMarketDashboardSummary).mockRejectedValue(
      new DashboardQueryError("NOT_FOUND")
    );

    const response = await GET(
      new Request("http://localhost/api/dashboard/markets/market_404"),
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
