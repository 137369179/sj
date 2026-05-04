import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarketOptions } from "../../server/markets/service";
import { listOrganizerApplications } from "../../server/applications/service";
import OrganizerApplicationsPage from "../(organizer)/organizer/applications/page";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/markets/service", () => ({
  listOrganizerMarketOptions: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  buildApplicationReviewPayload: vi.fn(),
  listOrganizerApplications: vi.fn(),
  reviewApplication: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("Organizer applications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders organizer applications from session identity with split notes", async () => {
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
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "资料已齐全，等待终审",
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
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(listOrganizerMarketOptions).toHaveBeenCalledWith("org_1");
    expect(listOrganizerApplications).toHaveBeenCalledWith("org_1");
    expect(screen.getByRole("heading", { name: "报名申请" })).toBeInTheDocument();
    expect(screen.getByText("优先处理申请")).toBeInTheDocument();
    expect(screen.getByText("山野咖啡")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("状态：待审核")).toBeInTheDocument();
    expect(screen.getByText("报名备注：主营手作咖啡")).toBeInTheDocument();
    expect(screen.getByText("审核备注：资料已齐全，等待终审")).toBeInTheDocument();
    expect(screen.getByText("最近审核时间：2026-05-02")).toBeInTheDocument();
    expect(screen.getByText("审核历史")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 通过 · 复核通过")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 拒绝 · 首轮资料不完整")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "license.pdf" })).toHaveAttribute(
      "href",
      "/uploads/license.pdf"
    );
    const reviewForm = screen.getByRole("form", { name: "山野咖啡 审核表单" });
    expect(within(reviewForm).getByRole("button", { name: "候补" })).toBeInTheDocument();
    expect(within(reviewForm).getByRole("button", { name: "补件" })).toBeInTheDocument();
    expect(within(reviewForm).getByRole("button", { name: "通过" })).toBeInTheDocument();
    expect(within(reviewForm).getByRole("button", { name: "拒绝" })).toBeInTheDocument();
  });

  it("renders summary metrics and filters applications by status from search params", async () => {
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
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      },
      {
        id: "app_2",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      },
      {
        id: "app_3",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_3",
        vendorName: "雨巷面包",
        status: "rejected",
        note: "主营面包甜点",
        applicationNote: "主营面包甜点",
        reviewNote: "与本场主题不符",
        reviewedAt: new Date("2026-05-02T09:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T02:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({ status: "submitted" })
    });

    render(page);

    expect(screen.getByText("全部报名申请：3")).toBeInTheDocument();
    expect(screen.getByText("待审核：1")).toBeInTheDocument();
    expect(screen.getByText("已通过：1")).toBeInTheDocument();
    expect(screen.getByText("已拒绝：1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（3）" })).toHaveAttribute(
      "href",
      "/organizer/applications"
    );
    expect(screen.getByRole("link", { name: "待审核（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?status=submitted"
    );
    expect(screen.getByText("山野咖啡")).toBeInTheDocument();
    expect(screen.queryByText("木野手作")).not.toBeInTheDocument();
    expect(screen.queryByText("雨巷面包")).not.toBeInTheDocument();
  });

  it("filters applications by marketId and preserves the market context in filter links", async () => {
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
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      },
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_2" })
    });

    render(page);

    expect(screen.getByText("当前市集：夏夜面包市集")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2"
    );
    expect(screen.getByRole("link", { name: "已通过（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&status=approved"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=applications"
    );
    expect(screen.getByRole("link", { name: "春日咖啡市集" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_1"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2"
    );
    expect(screen.getByText("木野手作")).toBeInTheDocument();
    expect(screen.queryByText("山野咖啡")).not.toBeInTheDocument();
  });

  it("preserves status context when opening the dashboard from organizer applications", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海"
      }
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_2", status: "approved" })
    });

    render(page);

    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=applications&status=approved"
    );
  });

  it("renders a filter-specific empty state when no applications match the current selection", async () => {
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
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({ marketId: "market_1", status: "approved" })
    });

    render(page);

    expect(screen.getByText("当前没有符合筛选条件的报名申请。")).toBeInTheDocument();
  });

  it("renders a default empty state when there is no application yet", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("当前还没有报名申请。")).toBeInTheDocument();
  });

  it("surfaces organizer follow-up rules for supplement and waitlist applications", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "under_review",
        latestReviewDecision: "supplement",
        followUpState: "urgent",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "请补充近三次摆摊照片",
        reviewedAt: new Date("2026-05-01T06:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      },
      {
        id: "app_3",
        marketId: "market_3",
        marketTitle: "秋日手作市集",
        marketCity: "南京",
        vendorId: "vendor_3",
        vendorName: "雨巷面包",
        status: "under_review",
        latestReviewDecision: "waitlist",
        followUpState: "urgent",
        note: "主营面包甜点",
        applicationNote: "主营面包甜点",
        reviewNote: "先列入候补观察",
        reviewedAt: new Date("2026-04-30T00:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T02:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof listOrganizerApplications>>);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getAllByText("跟进优先级：立即催办")).toHaveLength(2);
    expect(
      screen.getByText("规则提醒：补件已超时，建议立即催办摊主，仍无回应则改判。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("规则提醒：候补观察已到期，建议立即确认补位或释放名额。")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "催办补件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通知补位" })).toBeInTheDocument();
  });

  it("renders follow-up receipts when organizer has sent reminders", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "under_review",
        latestReviewDecision: "supplement",
        followUpState: "urgent",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "请补充近三次摆摊照片",
        reviewedAt: new Date("2026-05-01T06:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      },
      {
        id: "app_3",
        marketId: "market_3",
        marketTitle: "秋日手作市集",
        marketCity: "南京",
        vendorId: "vendor_3",
        vendorName: "雨巷面包",
        status: "under_review",
        latestReviewDecision: "waitlist",
        followUpState: "urgent",
        note: "主营面包甜点",
        applicationNote: "主营面包甜点",
        reviewNote: "先列入候补观察",
        reviewedAt: new Date("2026-04-30T00:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T02:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof listOrganizerApplications>>);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        followUpSent: "supplement_reminder",
        followUpApplicationId: "app_2",
        followUpSentWaitlist: "waitlist_confirmation",
        followUpWaitlistApplicationId: "app_3"
      } as any)
    });

    render(page);

    expect(screen.getByText("已发送补件催办，摊主会收到提醒。")).toBeInTheDocument();
    expect(screen.getByText("已发送补位通知，请等待摊主确认。")).toBeInTheDocument();
  });

  it("surfaces vendor waitlist confirmation results in organizer view", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_9",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "approved",
        latestReviewDecision: "approve",
        followUpState: "idle",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "摊主已确认候补补位",
        reviewedAt: new Date("2026-05-03T12:00:00.000Z"),
        reviews: [
          {
            id: "review_approve_1",
            applicationId: "app_9",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "摊主已确认候补补位",
            createdAt: new Date("2026-05-03T12:00:00.000Z")
          }
        ],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof listOrganizerApplications>>);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("状态：已通过")).toBeInTheDocument();
    expect(screen.getByText("审核备注：摊主已确认候补补位")).toBeInTheDocument();
    expect(screen.getByText("2026-05-03 · 通过 · 摊主已确认候补补位")).toBeInTheDocument();
  });

  it("surfaces vendor waitlist decline results in organizer view", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_10",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "rejected",
        latestReviewDecision: "reject",
        followUpState: "idle",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "摊主已放弃候补补位",
        reviewedAt: new Date("2026-05-03T12:00:00.000Z"),
        reviews: [
          {
            id: "review_reject_1",
            applicationId: "app_10",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "摊主已放弃候补补位",
            createdAt: new Date("2026-05-03T12:00:00.000Z")
          }
        ],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof listOrganizerApplications>>);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("状态：已拒绝")).toBeInTheDocument();
    expect(screen.getByText("审核备注：摊主已放弃候补补位")).toBeInTheDocument();
    expect(screen.getByText("2026-05-03 · 拒绝 · 摊主已放弃候补补位")).toBeInTheDocument();
  });

  it("shows overdue waitlist handling actions and timeout result receipts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_11",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "under_review",
        latestReviewDecision: "waitlist",
        followUpState: "urgent",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "先列入候补观察",
        reviewedAt: new Date("2026-04-30T10:00:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ] as Awaited<ReturnType<typeof listOrganizerApplications>>);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        timeoutReleasedApplicationId: "app_11"
      } as any)
    });

    render(page);

    expect(screen.getByRole("button", { name: "超时释放名额" })).toBeInTheDocument();
    expect(screen.getByText("已按超时释放名额，可继续联系下一位候补。")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders a markets return link when opened from organizer markets", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海"
      }
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        marketId: "market_2",
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
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=markets&marketStatus=published"
    );
  });

  it("renders a stalls return link when opened from organizer stalls", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海"
      }
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        vendorId: "vendor_2",
        vendorName: "木野手作",
        status: "approved",
        note: "主营木作器物",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        marketId: "market_2",
        from: "stalls",
        status: "assigned"
      })
    });

    render(page);

    expect(screen.getByText("当前来自摊位管理页。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&status=assigned"
    );
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=stalls&sourceStatus=assigned"
    );
    expect(screen.getByRole("link", { name: "已通过（1）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&status=approved&from=stalls&sourceStatus=assigned"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=stalls&sourceStatus=assigned"
    );
    expect(screen.getByRole("link", { name: "查看当前市集摊位" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=stalls&status=assigned"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=stalls&status=assigned"
    );
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后查看报名申请。")
    ).toBeInTheDocument();
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });

  it("renders review error when the action fails", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "手工咖啡渣再造",
        status: "approved",
        note: "备注内容",
        applicationNote: "报名备注",
        reviewNote: null,
        attachments: [],
        reviewedAt: new Date("2026-05-02T10:00:00.000Z"),
        reviews: [],
        createdAt: new Date("2026-05-01T10:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        reviewError: "INVALID_STATUS",
        errorApplicationId: "app_1"
      })
    });

    render(page);

    expect(
      screen.getByText("审核失败：当前申请状态不允许该操作。")
    ).toBeInTheDocument();
  });
});
