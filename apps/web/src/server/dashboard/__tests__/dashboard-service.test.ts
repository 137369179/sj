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
        paidCount: 1,
        supplementPendingCount: 2,
        waitlistPendingCount: 1,
        followUpUrgentCount: 1,
        paymentPendingCount: 2,
        paymentUrgentCount: 1,
        paymentOverdueCount: 1,
        paymentCreatedCount: 4,
        paymentCompletedCount: 1,
        paymentReleasedCount: 1,
        paymentReminderCount: 2,
        paymentReminderConvertedCount: 1,
        totalStalls: 10,
        activeStalls: 8,
        occupiedStalls: 5,
        totalRevenue: 500
      })
    ).toEqual({
      totalApplications: 13,
      submittedCount: 3,
      underReviewCount: 2,
      pendingReviewCount: 5,
      approvedCount: 4,
      rejectedCount: 1,
      assignedCount: 2,
      paidCount: 1,
      supplementPendingCount: 2,
      waitlistPendingCount: 1,
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
      approvalRate: 7 / 13,
      totalStalls: 10,
      activeStalls: 8,
      occupiedStalls: 5,
      stallOccupancyRate: 5 / 8,
      totalRevenue: 500
    });
  });

  it("returns market scoped dashboard data for organizers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    const marketSpy = vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集",
      city: "杭州"
    } as Awaited<ReturnType<typeof db.market.findUnique>>);
    const applicationSpy = vi.spyOn(db.application, "findMany").mockResolvedValue([
      { status: "submitted", reviewedAt: null, reviews: [] },
      {
        status: "under_review",
        reviewedAt: new Date("2026-05-01T06:00:00.000Z"),
        reviews: [{ decision: "supplement", createdAt: new Date("2026-05-01T06:00:00.000Z") }]
      },
      {
        status: "under_review",
        reviewedAt: new Date("2026-05-01T00:00:00.000Z"),
        reviews: [{ decision: "waitlist", createdAt: new Date("2026-05-01T00:00:00.000Z") }]
      },
      { status: "approved", reviewedAt: null, reviews: [] },
      { status: "stall_assigned", reviewedAt: null, reviews: [] },
      { status: "rejected", reviewedAt: null, reviews: [] }
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
    const orderSpy = vi.spyOn(db.order, "findMany").mockResolvedValue([
      {
        amount: 100,
        status: "paid",
        vendorId: "vendor_1",
        createdAt: new Date("2026-05-02T08:00:00.000Z"),
        paidAt: new Date("2026-05-03T10:00:00.000Z")
      },
      {
        amount: 150,
        status: "paid",
        vendorId: "vendor_2",
        createdAt: new Date("2026-05-02T09:00:00.000Z"),
        paidAt: new Date("2026-05-02T12:00:00.000Z")
      },
      {
        amount: 80,
        status: "pending",
        vendorId: "vendor_3",
        createdAt: new Date("2026-05-02T06:00:00.000Z"),
        paidAt: null
      },
      {
        amount: 60,
        status: "pending",
        vendorId: "vendor_4",
        createdAt: new Date("2026-05-04T02:00:00.000Z"),
        paidAt: null
      },
      {
        amount: 70,
        status: "cancelled",
        vendorId: "vendor_5",
        createdAt: new Date("2026-05-02T04:00:00.000Z"),
        paidAt: null
      }
    ] as any);
    const notificationSpy = vi.spyOn(db.notification, "findMany").mockResolvedValue([
      {
        id: "notification_1",
        userId: "vendor_1",
        title: "支付进度提醒",
        content: "主办方提醒你尽快完成春日咖啡市集的摊位费用支付，当前待支付金额为¥100。",
        createdAt: new Date("2026-05-03T06:00:00.000Z")
      },
      {
        id: "notification_2",
        userId: "vendor_3",
        title: "支付进度提醒",
        content: "主办方提醒你尽快完成春日咖啡市集的摊位费用支付，当前待支付金额为¥80。",
        createdAt: new Date("2026-05-03T08:00:00.000Z")
      }
    ] as any);

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
        status: true,
        reviewedAt: true,
        reviews: {
          select: {
            decision: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
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
    expect(notificationSpy).toHaveBeenCalledWith({
      where: {
        userId: {
          in: ["vendor_1", "vendor_2", "vendor_3", "vendor_4", "vendor_5"]
        },
        title: "支付进度提醒",
        content: {
          contains: "春日咖啡市集"
        }
      },
      select: {
        userId: true,
        createdAt: true
      }
    });
    expect(summary).toEqual({
      market: {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      metrics: {
        totalApplications: 6,
        submittedCount: 1,
        underReviewCount: 2,
        pendingReviewCount: 3,
        approvedCount: 1,
        rejectedCount: 1,
        assignedCount: 1,
        paidCount: 0,
        supplementPendingCount: 1,
        waitlistPendingCount: 1,
        followUpUrgentCount: 2,
        paymentPendingCount: 2,
        paymentUrgentCount: 1,
        paymentOverdueCount: 1,
        paymentCreatedCount: 5,
        paymentCompletedCount: 2,
        paymentReleasedCount: 1,
        paymentReminderCount: 2,
        paymentReminderConvertedCount: 1,
        paymentCompletionRate: 0.4,
        paymentReleaseRate: 0.2,
        paymentReminderConversionRate: 0.5,
        approvalRate: 2 / 6,
        totalStalls: 3,
        activeStalls: 2,
        occupiedStalls: 1,
        stallOccupancyRate: 0.5,
        totalRevenue: 250
      }
    });

    vi.useRealTimers();
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
