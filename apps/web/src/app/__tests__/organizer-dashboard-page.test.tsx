import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { getMarketDashboardSummary } from "../../server/dashboard/service";
import OrganizerDashboardPage from "../(organizer)/organizer/dashboard/[marketId]/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/dashboard/service", () => ({
  getMarketDashboardSummary: vi.fn()
}));

describe("Organizer dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders market level metrics from the dashboard service using session identity", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
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
      })
    });

    render(page);

    expect(getMarketDashboardSummary).toHaveBeenCalledWith({
      marketId: "market_1",
      organizerId: "org_1"
    });
    expect(screen.getByRole("heading", { name: "市集看板" })).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("总报名数")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      })
    });

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后查看看板。")
    ).toBeInTheDocument();
    expect(screen.getByText("当前市集编号：market_1")).toBeInTheDocument();
    expect(getMarketDashboardSummary).not.toHaveBeenCalled();
  });
});
