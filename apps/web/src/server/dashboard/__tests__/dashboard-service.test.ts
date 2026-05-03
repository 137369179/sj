import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  DashboardQueryError,
  buildDashboardSummary,
  getMarketDashboardSummary
} from "../service";

describe("dashboard service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds market dashboard metrics from status buckets", () => {
    expect(
      buildDashboardSummary({
        submittedCount: 3,
        underReviewCount: 2,
        approvedCount: 4,
        rejectedCount: 1,
        assignedCount: 2,
        totalStalls: 10,
        activeStalls: 8,
        occupiedStalls: 5
      })
    ).toEqual({
      totalApplications: 12,
      pendingReviewCount: 5,
      approvedCount: 4,
      rejectedCount: 1,
      assignedCount: 2,
      approvalRate: 0.5,
      totalStalls: 10,
      activeStalls: 8,
      occupiedStalls: 5,
      stallOccupancyRate: 0.625
    });
  });

  it("returns market scoped dashboard data for organizers", async () => {
    const marketSpy = vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州"
    } as Awaited<ReturnType<typeof db.market.findUnique>>);
    const applicationSpy = vi.spyOn(db.application, "findMany").mockResolvedValue([
      { status: "submitted" },
      { status: "under_review" },
      { status: "approved" },
      { status: "stall_assigned" },
      { status: "rejected" }
    ] as Awaited<ReturnType<typeof db.application.findMany>>);
    const stallSpy = vi.spyOn(db.stall, "findMany").mockResolvedValue([
      {
        isActive: true,
        assignedApplicationId: "app_1"
      },
      {
        isActive: true,
        assignedApplicationId: null
      },
      {
        isActive: false,
        assignedApplicationId: null
      }
    ] as Awaited<ReturnType<typeof db.stall.findMany>>);

    const summary = await getMarketDashboardSummary({
      organizerId: "org_1",
      marketId: "market_1"
    });

    expect(marketSpy).toHaveBeenCalledWith({
      where: {
        id: "market_1"
      },
      select: {
        id: true,
        organizerId: true,
        title: true,
        city: true
      }
    });
    expect(applicationSpy).toHaveBeenCalledWith({
      where: {
        marketId: "market_1"
      },
      select: {
        status: true
      }
    });
    expect(stallSpy).toHaveBeenCalledWith({
      where: {
        marketId: "market_1"
      },
      select: {
        isActive: true,
        assignedApplicationId: true
      }
    });
    expect(summary).toEqual({
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
        approvalRate: 0.4,
        totalStalls: 3,
        activeStalls: 2,
        occupiedStalls: 1,
        stallOccupancyRate: 0.5
      }
    });
  });

  it("rejects dashboard queries outside organizer scope", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_2",
      title: "春日咖啡市集",
      city: "杭州"
    } as Awaited<ReturnType<typeof db.market.findUnique>>);

    await expect(
      getMarketDashboardSummary({
        organizerId: "org_1",
        marketId: "market_1"
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
