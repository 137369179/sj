import { db } from "../../lib/db";
import { getOrganizerFollowUpState } from "../../lib/role-play";
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
  paymentOverdueCount: number;
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
    paymentOverdueCount: input.paymentOverdueCount,
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
  const market = await db.market.findUnique({
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
      createdAt: true
    }
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
      ...countStalls(stalls),
      totalRevenue
    })
  };
}

function countStatuses(
  statuses: ApplicationStatus[]
): Omit<
  DashboardSummaryInput,
  | "supplementPendingCount"
  | "waitlistPendingCount"
  | "followUpUrgentCount"
  | "paymentPendingCount"
  | "paymentOverdueCount"
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
    createdAt: Date;
  }>
) {
  const counts = {
    paymentPendingCount: 0,
    paymentOverdueCount: 0
  };

  for (const order of orders) {
    if (order.status !== "pending") {
      continue;
    }

    counts.paymentPendingCount += 1;

    const remainingHours = Math.ceil(
      (order.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)
    );

    if (remainingHours <= 0) {
      counts.paymentOverdueCount += 1;
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
