import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarketOptions } from "../../server/markets/service";
import { getMarketDashboardSummary } from "../../server/dashboard/service";
import OrganizerDashboardPage from "../(organizer)/organizer/dashboard/[marketId]/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/markets/service", () => ({
  listOrganizerMarketOptions: vi.fn()
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
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海"
      }
    ]);
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
        approvalRate: 0.4,
        totalStalls: 6,
        activeStalls: 5,
        occupiedStalls: 3,
        stallOccupancyRate: 0.6
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
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("摊位总数")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("启用中摊位")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("摊位利用率")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看当前市集申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_1"
    );
    expect(screen.getByRole("link", { name: "春日咖啡市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_1"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2"
    );
  });

  it("renders an applications return link when opened from organizer applications", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      }
    ]);
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
        approvalRate: 0.4,
        totalStalls: 6,
        activeStalls: 5,
        occupiedStalls: 3,
        stallOccupancyRate: 0.6
      }
    });

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        from: "applications",
        status: "approved"
      })
    });

    render(page);

    expect(screen.getByText("当前来自报名申请页。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回当前市集申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1&status=approved"
    );
  });

  it("renders a stalls return link when opened from organizer stalls", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州"
      }
    ]);
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
        approvalRate: 0.4,
        totalStalls: 6,
        activeStalls: 5,
        occupiedStalls: 3,
        stallOccupancyRate: 0.6
      }
    });

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        from: "stalls",
        status: "assigned"
      })
    });

    render(page);

    expect(screen.getByText("当前来自摊位管理页。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_1&status=assigned"
    );
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
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(screen.getByText("当前市集编号：market_1")).toBeInTheDocument();
    expect(getMarketDashboardSummary).not.toHaveBeenCalled();
  });
});
