import { db } from "../../lib/db";
import type { ApplicationStatus } from "../applications/status";

export type DashboardSummaryInput = {
  submittedCount: number;
  underReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  assignedCount: number;
  totalStalls: number;
  activeStalls: number;
  occupiedStalls: number;
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
    input.assignedCount;
  const acceptedCount = input.approvedCount + input.assignedCount;

  return {
    totalApplications,
    pendingReviewCount: input.submittedCount + input.underReviewCount,
    approvedCount: input.approvedCount,
    rejectedCount: input.rejectedCount,
    assignedCount: input.assignedCount,
    approvalRate: totalApplications === 0 ? 0 : acceptedCount / totalApplications,
    totalStalls: input.totalStalls,
    activeStalls: input.activeStalls,
    occupiedStalls: input.occupiedStalls,
    stallOccupancyRate:
      input.activeStalls === 0 ? 0 : input.occupiedStalls / input.activeStalls
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
      status: true
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

  return {
    market: {
      id: market.id,
      title: market.title,
      city: market.city
    },
    metrics: buildDashboardSummary({
      ...countStatuses(applications.map((item) => item.status)),
      ...countStalls(stalls)
    })
  };
}

function countStatuses(statuses: ApplicationStatus[]): DashboardSummaryInput {
  const counts: DashboardSummaryInput = {
    submittedCount: 0,
    underReviewCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    assignedCount: 0,
    totalStalls: 0,
    activeStalls: 0,
    occupiedStalls: 0
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
