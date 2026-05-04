import { db } from "../../lib/db";
import {
  getOrganizerFollowUpState,
  getOrganizerPaymentFollowUpState
} from "../../lib/role-play";
import type { ApplicationStatus } from "../applications/status";

export type DashboardSummaryInput = {
  submittedCount: number;
  underReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  assignedCount: number;
  paidCount: number;
  supplementPendingCount: number;
  waitlistPendingCount: number;
  followUpUrgentCount: number;
  paymentPendingCount: number;
  paymentUrgentCount: number;
  paymentOverdueCount: number;
  paymentCreatedCount: number;
  paymentCompletedCount: number;
  paymentReleasedCount: number;
  paymentReminderCount: number;
  paymentReminderConvertedCount: number;
  totalStalls: number;
  activeStalls: number;
  occupiedStalls: number;
  totalRevenue: number;
};

export type MarketDashboardSummary = {
  market: {
    id: string;
    title: string;
    city: string;
  };
  metrics: ReturnType<typeof buildDashboardSummary>;
  recentAutomationActivities: Array<{
    title: string;
    content: string;
    createdAt: Date;
  }>;
};

export type DashboardQueryErrorCode = "NOT_FOUND" | "FORBIDDEN";

export class DashboardQueryError extends Error {
  code: DashboardQueryErrorCode;

  constructor(code: DashboardQueryErrorCode) {
    super(code);
    this.code = code;
  }
}

export function buildDashboardSummary(input: DashboardSummaryInput) {
  const totalApplications =
    input.submittedCount +
    input.underReviewCount +
    input.approvedCount +
    input.rejectedCount +
    input.assignedCount +
    input.paidCount;
  const acceptedCount = input.approvedCount + input.assignedCount + input.paidCount;
  const paymentCompletionRate =
    input.paymentCreatedCount === 0
      ? 0
      : input.paymentCompletedCount / input.paymentCreatedCount;
  const paymentReleaseRate =
    input.paymentCreatedCount === 0
      ? 0
      : input.paymentReleasedCount / input.paymentCreatedCount;
  const paymentReminderConversionRate =
    input.paymentReminderCount === 0
      ? 0
      : input.paymentReminderConvertedCount / input.paymentReminderCount;

  return {
    totalApplications,
    submittedCount: input.submittedCount,
    underReviewCount: input.underReviewCount,
    pendingReviewCount: input.submittedCount + input.underReviewCount,
    approvedCount: input.approvedCount,
    rejectedCount: input.rejectedCount,
    assignedCount: input.assignedCount,
    paidCount: input.paidCount,
    supplementPendingCount: input.supplementPendingCount,
    waitlistPendingCount: input.waitlistPendingCount,
    followUpUrgentCount: input.followUpUrgentCount,
    paymentPendingCount: input.paymentPendingCount,
    paymentUrgentCount: input.paymentUrgentCount,
    paymentOverdueCount: input.paymentOverdueCount,
    paymentCreatedCount: input.paymentCreatedCount,
    paymentCompletedCount: input.paymentCompletedCount,
    paymentReleasedCount: input.paymentReleasedCount,
    paymentReminderCount: input.paymentReminderCount,
    paymentReminderConvertedCount: input.paymentReminderConvertedCount,
    paymentCompletionRate,
    paymentReleaseRate,
    paymentReminderConversionRate,
    approvalRate: totalApplications === 0 ? 0 : acceptedCount / totalApplications,
    totalStalls: input.totalStalls,
    activeStalls: input.activeStalls,
    occupiedStalls: input.occupiedStalls,
    stallOccupancyRate:
      input.activeStalls === 0 ? 0 : input.occupiedStalls / input.activeStalls,
    totalRevenue: input.totalRevenue
  };
}

export async function getMarketDashboardSummary(input: {
  organizerId: string;
  marketId: string;
}): Promise<MarketDashboardSummary> {
  if (isDemoOrganizerUser(input.organizerId)) {
    return buildDemoDashboardSummary(input.marketId);
  }

  let market;

  try {
    market = await db.market.findUnique({
      where: {
        id: input.marketId
      },
      select: {
        id: true,
        organizerId: true,
        title: true,
        city: true
      }
    });
  } catch (error) {
    if (isDemoLoginEnabled()) {
      return buildDemoDashboardSummary(input.marketId);
    }

    throw error;
  }

  if (!market) {
    throw new DashboardQueryError("NOT_FOUND");
  }

  if (market.organizerId !== input.organizerId) {
    throw new DashboardQueryError("FORBIDDEN");
  }

  const applications = await db.application.findMany({
    where: {
      marketId: input.marketId
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
  const stalls = await db.stall.findMany({
    where: {
      marketId: input.marketId
    },
    select: {
      isActive: true,
      assignedApplicationId: true
    }
  });
  const orders = await db.order.findMany({
    where: {
      application: {
        marketId: input.marketId
      }
    },
    select: {
      amount: true,
      status: true,
      vendorId: true,
      createdAt: true,
      paidAt: true
    }
  });
  const vendorIds = Array.from(new Set(orders.map((order) => order.vendorId)));
  const paymentReminderNotifications =
    vendorIds.length === 0
      ? []
      : await db.notification.findMany({
          where: {
            userId: {
              in: vendorIds
            },
            title: "支付进度提醒",
            content: {
              contains: market.title
            }
          },
          select: {
            userId: true,
            createdAt: true
          }
        });
  const recentAutomationActivities = await db.notification.findMany({
    where: {
      userId: input.organizerId,
      title: {
        in: ["支付自动催办已执行", "支付自动释放已执行"]
      },
      content: {
        contains: market.title
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      title: true,
      content: true,
      createdAt: true
    },
    take: 5
  });
  const totalRevenue = orders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.amount, 0);

  return {
    market: {
      id: market.id,
      title: market.title,
      city: market.city
    },
    metrics: buildDashboardSummary({
      ...countStatuses(applications.map((item) => item.status)),
      ...countOrganizerFollowUps(applications),
      ...countPaymentRisks(orders),
      ...countPaymentFunnel(orders),
      ...countPaymentReminderEffect(orders, paymentReminderNotifications),
      ...countStalls(stalls),
      totalRevenue
    }),
    recentAutomationActivities
  };
}

function buildDemoDashboardSummary(marketId: string): MarketDashboardSummary {
  return {
    market: {
      id: marketId,
      title: "演示市集看板",
      city: "演示城市"
    },
    metrics: buildDashboardSummary({
      submittedCount: 0,
      underReviewCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      assignedCount: 0,
      paidCount: 0,
      supplementPendingCount: 0,
      waitlistPendingCount: 0,
      followUpUrgentCount: 0,
      paymentPendingCount: 0,
      paymentUrgentCount: 0,
      paymentOverdueCount: 0,
      paymentCreatedCount: 0,
      paymentCompletedCount: 0,
      paymentReleasedCount: 0,
      paymentReminderCount: 0,
      paymentReminderConvertedCount: 0,
      totalStalls: 0,
      activeStalls: 0,
      occupiedStalls: 0,
      totalRevenue: 0
    }),
    recentAutomationActivities: []
  };
}

function isDemoLoginEnabled() {
  return process.env.AUTH_ENABLE_DEMO_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

function isDemoOrganizerUser(organizerId: string) {
  return isDemoLoginEnabled() && organizerId === "organizer_1";
}

function countStatuses(
  statuses: ApplicationStatus[]
): Omit<
  DashboardSummaryInput,
  | "supplementPendingCount"
  | "waitlistPendingCount"
  | "followUpUrgentCount"
  | "paymentPendingCount"
  | "paymentUrgentCount"
  | "paymentOverdueCount"
  | "paymentCreatedCount"
  | "paymentCompletedCount"
  | "paymentReleasedCount"
  | "paymentReminderCount"
  | "paymentReminderConvertedCount"
  | "totalStalls"
  | "activeStalls"
  | "occupiedStalls"
  | "totalRevenue"
> {
  const counts = {
    submittedCount: 0,
    underReviewCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    assignedCount: 0,
    paidCount: 0
  };

  for (const status of statuses) {
    switch (status) {
      case "submitted":
        counts.submittedCount += 1;
        break;
      case "under_review":
        counts.underReviewCount += 1;
        break;
      case "approved":
        counts.approvedCount += 1;
        break;
      case "rejected":
        counts.rejectedCount += 1;
        break;
      case "stall_assigned":
        counts.assignedCount += 1;
        break;
      case "paid":
        counts.paidCount += 1;
        break;
    }
  }

  return counts;
}

function countOrganizerFollowUps(
  applications: Array<{
    status: ApplicationStatus;
    reviewedAt: Date | null;
    reviews: Array<{
      decision: string;
      createdAt: Date;
    }>;
  }>
) {
  const counts = {
    supplementPendingCount: 0,
    waitlistPendingCount: 0,
    followUpUrgentCount: 0
  };

  for (const application of applications) {
    const latestReviewDecision = application.reviews[0]?.decision ?? null;

    if (application.status !== "under_review") {
      continue;
    }

    if (latestReviewDecision === "supplement") {
      counts.supplementPendingCount += 1;
    }

    if (latestReviewDecision === "waitlist") {
      counts.waitlistPendingCount += 1;
    }

    const followUpState = getOrganizerFollowUpState({
      latestReviewDecision,
      reviewedAt: application.reviewedAt
    });

    if (followUpState === "urgent") {
      counts.followUpUrgentCount += 1;
    }
  }

  return counts;
}

function countPaymentRisks(
  orders: Array<{
    status: string;
    vendorId: string;
    createdAt: Date;
    paidAt: Date | null;
  }>
) {
  const counts = {
    paymentPendingCount: 0,
    paymentUrgentCount: 0,
    paymentOverdueCount: 0
  };

  for (const order of orders) {
    if (order.status !== "pending") {
      continue;
    }

    counts.paymentPendingCount += 1;
    const followUpState = getOrganizerPaymentFollowUpState({
      orderStatus: order.status,
      orderCreatedAt: order.createdAt
    });

    if (followUpState === "urgent") {
      counts.paymentUrgentCount += 1;
    }

    const remainingHours = Math.ceil(
      (order.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)
    );
    if (remainingHours <= 0) {
      counts.paymentOverdueCount += 1;
    }
  }

  return counts;
}

function countPaymentFunnel(
  orders: Array<{
    status: string;
    vendorId: string;
    createdAt: Date;
    paidAt: Date | null;
  }>
) {
  const counts = {
    paymentCreatedCount: orders.length,
    paymentCompletedCount: 0,
    paymentReleasedCount: 0
  };

  for (const order of orders) {
    if (order.status === "paid") {
      counts.paymentCompletedCount += 1;
    }

    if (order.status === "cancelled") {
      counts.paymentReleasedCount += 1;
    }
  }

  return counts;
}

function countPaymentReminderEffect(
  orders: Array<{
    status: string;
    vendorId: string;
    createdAt: Date;
    paidAt: Date | null;
  }>,
  reminders: Array<{
    userId: string;
    createdAt: Date;
  }>
) {
  const latestReminderByUser = new Map<string, Date>();

  for (const reminder of reminders) {
    const previousReminder = latestReminderByUser.get(reminder.userId);

    if (!previousReminder || previousReminder.getTime() < reminder.createdAt.getTime()) {
      latestReminderByUser.set(reminder.userId, reminder.createdAt);
    }
  }

  const counts = {
    paymentReminderCount: latestReminderByUser.size,
    paymentReminderConvertedCount: 0
  };

  for (const order of orders) {
    const latestReminder = latestReminderByUser.get(order.vendorId);

    if (!latestReminder || !order.paidAt) {
      continue;
    }

    if (order.paidAt.getTime() >= latestReminder.getTime()) {
      counts.paymentReminderConvertedCount += 1;
    }
  }

  return counts;
}

function countStalls(
  stalls: Array<{
    isActive: boolean;
    assignedApplicationId: string | null;
  }>
) {
  return {
    totalStalls: stalls.length,
    activeStalls: stalls.filter((stall) => stall.isActive).length,
    occupiedStalls: stalls.filter(
      (stall) => stall.isActive && typeof stall.assignedApplicationId === "string"
    ).length
  };
}
