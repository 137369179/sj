import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarketOptions } from "../../server/markets/service";
import { getMarketDashboardSummary } from "../../server/dashboard/service";
import { runAutomaticPaymentReminders } from "../../server/payments/service";
import { runAutomaticPaymentReleases } from "../../server/payments/service";
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

vi.mock("../../server/payments/service", () => ({
  runAutomaticPaymentReminders: vi.fn(),
  runAutomaticPaymentReleases: vi.fn(),
  PaymentError: class PaymentError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

vi.mock("recharts", async () => {
  const OriginalRechartsModule = await vi.importActual("recharts");
  return {
    ...OriginalRechartsModule,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 800 }}>{children}</div>
    )
  };
});

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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: [
        {
          title: "支付自动释放已执行",
          content: "春日咖啡市集已自动释放 1 笔支付超时订单。",
          createdAt: new Date("2026-05-03T11:00:00.000Z")
        },
        {
          title: "支付自动催办已执行",
          content: "春日咖啡市集已自动催办 2 笔支付临期订单。",
          createdAt: new Date("2026-05-03T10:30:00.000Z")
        }
      ]
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
    expect(screen.getByText("成场风险提醒")).toBeInTheDocument();
    expect(screen.getByText(/确认率偏低或空位较多时/)).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("总报名数")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("补件催办")).toBeInTheDocument();
    expect(screen.getByText("候补待决")).toBeInTheDocument();
    expect(screen.getByText("高优先风险")).toBeInTheDocument();
    expect(screen.getByText("待支付")).toBeInTheDocument();
    expect(screen.getByText("支付临期")).toBeInTheDocument();
    expect(screen.getByText("支付超时")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "支付漏斗" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行自动释放" })).toBeInTheDocument();
    expect(screen.getByText("已创建支付单")).toBeInTheDocument();
    expect(screen.getByText("已释放档期")).toBeInTheDocument();
    expect(screen.getByText("支付完成率")).toBeInTheDocument();
    expect(screen.getByText("已发送催办")).toBeInTheDocument();
    expect(screen.getByText("催办后支付")).toBeInTheDocument();
    expect(screen.getByText("催办转化率")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行自动催办" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最近自动处理" })).toBeInTheDocument();
    expect(screen.getByText("支付自动释放已执行")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集已自动催办 2 笔支付临期订单。")).toBeInTheDocument();
    expect(screen.getAllByText("25%").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("摊位总数")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("启用中摊位")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("摊位利用率")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: []
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
    expect(screen.getByRole("link", { name: "返回当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1&status=approved"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_1&from=applications&status=approved"
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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: []
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
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1&from=stalls&status=assigned"
    );
  });

  it("renders a markets return link when opened from organizer markets", async () => {
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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: []
    });

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        from: "markets",
        marketStatus: "published"
      })
    });

    render(page);

    expect(screen.getByText("当前来自我的市集页。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回我的市集" })).toHaveAttribute(
      "href",
      "/organizer/markets?status=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_1&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "春日咖啡市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_1?from=markets&marketStatus=published"
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
      screen.getByText("请先以主办方身份登录后查看市集看板。")
    ).toBeInTheDocument();
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(screen.getByText("当前市集编号：market_1")).toBeInTheDocument();
    expect(getMarketDashboardSummary).not.toHaveBeenCalled();
  });

  it("shows automatic reminder receipt when dashboard action has run", async () => {
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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: []
    });

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        autoRemindedCount: "2"
      } as any)
    });

    render(page);

    expect(screen.getByText("已自动催办 2 笔支付临期订单。")).toBeInTheDocument();
    expect(runAutomaticPaymentReminders).not.toHaveBeenCalled();
  });

  it("shows automatic release receipt when dashboard action has run", async () => {
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
        occupiedStalls: 3,
        stallOccupancyRate: 0.6,
        totalRevenue: 0
      },
      recentAutomationActivities: []
    });

    const page = await OrganizerDashboardPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        autoReleasedCount: "1"
      } as any)
    });

    render(page);

    expect(screen.getByText("已自动释放 1 笔支付超时订单。")).toBeInTheDocument();
    expect(runAutomaticPaymentReleases).not.toHaveBeenCalled();
  });
});
