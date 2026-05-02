import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getMarketDashboardSummary } from "../../server/dashboard/service";
import OrganizerDashboardPage from "../(organizer)/organizer/dashboard/[marketId]/page";

vi.mock("../../server/dashboard/service", () => ({
  getMarketDashboardSummary: vi.fn()
}));

describe("Organizer dashboard page", () => {
  it("renders market level metrics from the dashboard service", async () => {
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

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        organizerId: "org_1"
      })
    });

    render(page);

    expect(screen.getByRole("heading", { name: "市集看板" })).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("总报名数")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
