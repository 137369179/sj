import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listVendorApplications } from "../../server/applications/service";
import VendorApplicationsPage from "../(vendor)/applications/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  listVendorApplications: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

type MockVendorApplication = Awaited<ReturnType<typeof listVendorApplications>>[number];

function buildVendorApplication(
  overrides: Partial<MockVendorApplication> & Pick<MockVendorApplication, "id" | "marketId" | "marketTitle" | "marketCity" | "status" | "createdAt">
): MockVendorApplication {
  return {
    id: overrides.id,
    marketId: overrides.marketId,
    marketTitle: overrides.marketTitle,
    marketCity: overrides.marketCity,
    status: overrides.status,
    latestReviewDecision: overrides.latestReviewDecision ?? null,
    taskGroup:
      overrides.taskGroup ??
      (overrides.status === "submitted"
        ? "pending-action"
        : overrides.status === "under_review"
          ? "in-progress"
          : "done"),
    note: overrides.note ?? null,
    applicationNote: overrides.applicationNote ?? null,
    reviewNote: overrides.reviewNote ?? null,
    attachments: overrides.attachments ?? [],
    reviewedAt: overrides.reviewedAt ?? null,
    reviews: overrides.reviews ?? [],
    createdAt: overrides.createdAt,
    assignedStallId: overrides.assignedStallId ?? null,
    assignedStallCode: overrides.assignedStallCode ?? null,
    assignedStallName: overrides.assignedStallName ?? null,
    assignedStallPrice: overrides.assignedStallPrice ?? null,
    orderId: overrides.orderId ?? null,
    orderAmount: overrides.orderAmount ?? null,
    orderStatus: overrides.orderStatus ?? null,
    orderPaymentMethod: overrides.orderPaymentMethod ?? null,
    orderCreatedAt: overrides.orderCreatedAt ?? null,
    orderPaidAt: overrides.orderPaidAt ?? null
  };
}

describe("Vendor applications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders vendor applications from session identity with split notes and stall assignment result", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "stall_assigned",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "摊位需求明确，允许进入分配",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [
          {
            id: "review_2",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "复核通过",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "首轮资料不完整",
            createdAt: new Date("2026-05-02T08:30:00.000Z")
          }
        ],
        attachments: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: "stall_1",
        assignedStallCode: "A-01",
        assignedStallName: "主通道 1 号位",
        assignedStallPrice: 800,
        orderId: "order_1",
        orderAmount: 800,
        orderStatus: "pending",
        orderPaymentMethod: null,
        orderPaidAt: null
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(listVendorApplications).toHaveBeenCalledWith("vendor_1");
    expect(screen.getByRole("heading", { name: "我的报名" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "待处理事项" })).toBeInTheDocument();
    expect(screen.getByText("待补件")).toBeInTheDocument();
    expect(screen.getByText("待确认")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("状态：已分配摊位")).toBeInTheDocument();
    expect(screen.getByText("报名备注：主营手作咖啡")).toBeInTheDocument();
    expect(screen.getByText("审核备注：摊位需求明确，允许进入分配")).toBeInTheDocument();
    expect(screen.getByText("最近审核时间：2026-05-02")).toBeInTheDocument();
    expect(screen.getByText("审核历史")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 通过 · 复核通过")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 拒绝 · 首轮资料不完整")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看春日咖啡市集详情" })).toHaveAttribute(
      "href",
      "/markets/market_1?from=applications"
    );
    expect(screen.getByRole("link", { name: "license.pdf" })).toHaveAttribute(
      "href",
      "/uploads/license.pdf"
    );
    expect(
      screen.getByText("分配结果：主通道 1 号位（A-01）")
    ).toBeInTheDocument();
  });

  it("prompts for vendor login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以摊主身份登录后查看报名状态。")
    ).toBeInTheDocument();
    expect(listVendorApplications).not.toHaveBeenCalled();
  });

  it("prompts for vendor login when the session role is not vendor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "organizer_1",
      role: "organizer"
    });

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以摊主身份登录后查看报名状态。")
    ).toBeInTheDocument();
    expect(listVendorApplications).not.toHaveBeenCalled();
  });

  it("renders summary metrics and filters vendor applications by status from search params", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null,
        assignedStallPrice: null,
        orderId: null,
        orderAmount: null,
        orderStatus: null,
        orderPaymentMethod: null,
        orderPaidAt: null
      }),
      buildVendorApplication({
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null,
        assignedStallPrice: null,
        orderId: null,
        orderAmount: null,
        orderStatus: null,
        orderPaymentMethod: null,
        orderPaidAt: null
      }),
      buildVendorApplication({
        id: "app_3",
        marketId: "market_3",
        marketTitle: "秋日手作市集",
        marketCity: "南京",
        status: "stall_assigned",
        note: "主营原创首饰",
        applicationNote: "主营原创首饰",
        reviewNote: "已完成摊位分配",
        reviewedAt: new Date("2026-05-03T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T02:00:00.000Z"),
        assignedStallId: "stall_3",
        assignedStallCode: "B-03",
        assignedStallName: "内场 3 号位"
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({ status: "approved" })
    });

    render(page);

    expect(screen.getByText("全部报名：3")).toBeInTheDocument();
    expect(screen.getByText("待审核：1")).toBeInTheDocument();
    expect(screen.getByText("已通过：1")).toBeInTheDocument();
    expect(screen.getByText("已分配摊位：1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（3）" })).toHaveAttribute(
      "href",
      "/applications"
    );
    expect(screen.getByRole("link", { name: "待审核（1）" })).toHaveAttribute(
      "href",
      "/applications?status=submitted"
    );
    expect(screen.getByRole("link", { name: "已通过（1）" })).toHaveAttribute(
      "href",
      "/applications?status=approved"
    );
    expect(screen.getByRole("link", { name: "已分配摊位（1）" })).toHaveAttribute(
      "href",
      "/applications?status=stall_assigned"
    );
    expect(screen.getByRole("link", { name: "春日咖啡市集" })).toHaveAttribute(
      "href",
      "/applications?marketId=market_1&status=approved"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集" })).toHaveAttribute(
      "href",
      "/applications?marketId=market_2&status=approved"
    );
    expect(screen.getByRole("link", { name: "秋日手作市集" })).toHaveAttribute(
      "href",
      "/applications?marketId=market_3&status=approved"
    );
    expect(screen.getByText("夏夜面包市集 · 上海")).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集 · 杭州")).not.toBeInTheDocument();
    expect(screen.queryByText("秋日手作市集 · 南京")).not.toBeInTheDocument();
  });

  it("groups vendor applications by task group and shows next-step hints", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "submitted",
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }),
      buildVendorApplication({
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        status: "under_review",
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T18:00:00.000Z"),
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }),
      buildVendorApplication({
        id: "app_3",
        marketId: "market_3",
        marketTitle: "秋日手作市集",
        marketCity: "南京",
        status: "stall_assigned",
        createdAt: new Date("2026-05-01T02:00:00.000Z"),
        assignedStallId: "stall_3",
        assignedStallCode: "B-03",
        assignedStallName: "内场 3 号位"
      }),
      buildVendorApplication({
        id: "app_4",
        marketId: "market_4",
        marketTitle: "冬日烘焙市集",
        marketCity: "苏州",
        status: "under_review",
        latestReviewDecision: "waitlist",
        reviewedAt: new Date("2026-05-02T09:00:00.000Z"),
        createdAt: new Date("2026-05-01T03:00:00.000Z")
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByRole("heading", { name: "优先处理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "处理中" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "已完成" })).toBeInTheDocument();
    expect(screen.getByText(/等待主办方处理/)).toBeInTheDocument();
    expect(screen.getByText(/请尽快补充资料后继续审核/)).toBeInTheDocument();
    expect(screen.getByText(/已进入候补队列，建议保留档期/)).toBeInTheDocument();
    expect(screen.getByText(/查看分配结果与后续安排/)).toBeInTheDocument();
    expect(screen.getByText("当前处理：待补件")).toBeInTheDocument();
    expect(screen.getByText("当前处理：候补中")).toBeInTheDocument();
    expect(screen.getByText("建议动作：立即补件")).toBeInTheDocument();
    expect(screen.getByText("进度回执：资料补齐后会重新进入主办方审核队列。")).toBeInTheDocument();
    expect(screen.getByText("建议动作：保留档期")).toBeInTheDocument();
    expect(screen.getByText("进度回执：当前仍在候补观察名单中，如有空位将优先递补。")).toBeInTheDocument();
    expect(screen.getByText("时效提醒：补件将在 6 小时内截止，请优先处理。")).toBeInTheDocument();
    expect(screen.getByText("时效提醒：候补观察期内请保留档期，留意补位通知。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去补件" })).toHaveAttribute(
      "href",
      "/markets/market_2/apply?from=applications&action=supplement&applicationId=app_2"
    );
  });

  it("shows payment-focused action receipts after stall assignment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_9",
        marketId: "market_9",
        marketTitle: "深夜甜品市集",
        marketCity: "上海",
        status: "stall_assigned",
        createdAt: new Date("2026-05-01T02:00:00.000Z"),
        assignedStallId: "stall_9",
        assignedStallCode: "C-09",
        assignedStallName: "外场 9 号位",
        orderId: "order_9",
        orderAmount: 1200,
        orderStatus: "pending",
        orderPaymentMethod: null,
        orderCreatedAt: new Date("2026-05-02T18:00:00.000Z"),
        orderPaidAt: null
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("建议动作：完成支付")).toBeInTheDocument();
    expect(screen.getByText("进度回执：摊位已锁定，付款后将正式保留本次档期。")).toBeInTheDocument();
    expect(screen.getByText("时效提醒：支付将在 6 小时内截止，请尽快完成支付。")).toBeInTheDocument();
  });

  it("shows a more specific receipt after vendor confirms a waitlist offer", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_10",
        marketId: "market_10",
        marketTitle: "海风器物市集",
        marketCity: "青岛",
        status: "approved",
        latestReviewDecision: "approve",
        reviewNote: "摊主已确认候补补位",
        reviewedAt: new Date("2026-05-03T10:00:00.000Z"),
        reviews: [
          {
            id: "review_10",
            applicationId: "app_10",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "摊主已确认候补补位",
            createdAt: new Date("2026-05-03T10:00:00.000Z")
          }
        ],
        createdAt: new Date("2026-05-01T02:00:00.000Z")
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("当前处理：待分配")).toBeInTheDocument();
    expect(screen.getByText("建议动作：等待分配结果")).toBeInTheDocument();
    expect(
      screen.getByText("进度回执：你已确认候补补位，主办方正在安排摊位分配。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("时效提醒：主办方通常会在 24 小时内同步摊位分配结果，请留意最新通知。")
    ).toBeInTheDocument();
  });

  it("shows a retry-oriented receipt after payment timeout releases the stall", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_11",
        marketId: "market_11",
        marketTitle: "秋日器物市集",
        marketCity: "苏州",
        status: "rejected",
        reviewNote: "摊位支付超时，已释放档期",
        reviewedAt: new Date("2026-05-04T12:00:00.000Z"),
        reviews: [
          {
            id: "review_11",
            applicationId: "app_11",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "摊位支付超时，已释放档期",
            createdAt: new Date("2026-05-04T12:00:00.000Z")
          }
        ],
        createdAt: new Date("2026-05-01T02:00:00.000Z")
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("当前处理：本轮未通过")).toBeInTheDocument();
    expect(screen.getByText("建议动作：重新报名")).toBeInTheDocument();
    expect(
      screen.getByText("进度回执：由于支付超时，本次摊位档期已释放，可重新关注后续场次。")
    ).toBeInTheDocument();
  });

  it("filters vendor applications by marketId and preserves status context", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      }),
      buildVendorApplication({
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_1" })
    });

    render(page);

    expect(screen.getByText("当前市集：春日咖啡市集")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/applications?marketId=market_1"
    );
    expect(screen.getByRole("link", { name: "查看春日咖啡市集详情" })).toHaveAttribute(
      "href",
      "/markets/market_1?from=applications"
    );
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.queryByText("夏夜面包市集 · 上海")).not.toBeInTheDocument();
  });

  it("preserves status context in detail links when drilling into a market from applications", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_2", status: "approved" })
    });

    render(page);

    expect(screen.getByRole("link", { name: "查看夏夜面包市集详情" })).toHaveAttribute(
      "href",
      "/markets/market_2?from=applications&status=approved"
    );
  });

  it("renders a filter-specific empty state when no application matches the current selection", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      buildVendorApplication({
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      })
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_1", status: "approved" })
    });

    render(page);

    expect(screen.getByText("当前没有符合筛选条件的报名记录。")).toBeInTheDocument();
  });
});
