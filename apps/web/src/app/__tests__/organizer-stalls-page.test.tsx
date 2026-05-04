import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarketOptions } from "../../server/markets/service";
import { listOrganizerApplications } from "../../server/applications/service";
import { expirePendingOrder } from "../../server/payments/service";
import { sendPaymentReminder } from "../../server/payments/service";
import { listOrganizerStalls } from "../../server/stalls/service";
import OrganizerStallsPage from "../(organizer)/organizer/stalls/page";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  listOrganizerApplications: vi.fn()
}));

vi.mock("../../server/markets/service", () => ({
  listOrganizerMarketOptions: vi.fn()
}));

vi.mock("../../server/payments/service", () => ({
  expirePendingOrder: vi.fn(),
  sendPaymentReminder: vi.fn(),
  PaymentError: class PaymentError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
}));

vi.mock("../../server/stalls/service", () => ({
  buildAssignStallPayload: vi.fn(),
  buildStallPayload: vi.fn(),
  assignStall: vi.fn(),
  createStall: vi.fn(),
  listOrganizerStalls: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

type MockOrganizerStall = Awaited<ReturnType<typeof listOrganizerStalls>>[number];

function buildOrganizerStall(overrides: Partial<MockOrganizerStall> & Pick<MockOrganizerStall, "id" | "marketId" | "marketTitle" | "code" | "name">): MockOrganizerStall {
  return {
    id: overrides.id,
    marketId: overrides.marketId,
    marketTitle: overrides.marketTitle,
    code: overrides.code,
    name: overrides.name,
    price: overrides.price ?? 0,
    isActive: overrides.isActive ?? true,
    assignedApplicationId: overrides.assignedApplicationId ?? null,
    assignedVendorId: overrides.assignedVendorId ?? null,
    assignedVendorName: overrides.assignedVendorName ?? null,
    assignedApplicationStatus: overrides.assignedApplicationStatus ?? null,
    assignedOrderId: overrides.assignedOrderId ?? null,
    assignedOrderStatus: overrides.assignedOrderStatus ?? null,
    assignedOrderCreatedAt: overrides.assignedOrderCreatedAt ?? null
  };
}

describe("OrganizerStallsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders stalls with assignable approved applications from session identity", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "approved",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "可安排在主通道周边",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(listOrganizerMarketOptions).toHaveBeenCalledWith("org_1");
    expect(listOrganizerStalls).toHaveBeenCalledWith("org_1");
    expect(listOrganizerApplications).toHaveBeenCalledWith("org_1");
    expect(screen.getByRole("heading", { name: "摊位管理" })).toBeInTheDocument();
    expect(screen.getByText("主通道 1 号位")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · A-01")).toBeInTheDocument();
    expect(screen.getByText("山野咖啡")).toBeInTheDocument();
    expect(screen.getByText("报名备注：主营手作咖啡")).toBeInTheDocument();
    expect(screen.getByText("审核备注：可安排在主通道周边")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建摊位" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分配摊位" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "选择市集" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "春日咖啡市集（杭州）" })
    ).toHaveValue("market_1");
  });

  it("renders stall summary metrics and filters stalls by status from search params", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
      }),
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-02",
        name: "主通道 2 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      }),
      buildOrganizerStall({
        id: "stall_3",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "B-01",
        name: "侧边区 1 号位",
        isActive: false,
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "approved",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "优先主通道",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({ status: "assigned" })
    });

    render(page);

    expect(screen.getByText("全部摊位：3")).toBeInTheDocument();
    expect(screen.getByText("待分配：1")).toBeInTheDocument();
    expect(screen.getByText("已分配：1")).toBeInTheDocument();
    expect(screen.getByText("已停用：1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（3）" })).toHaveAttribute(
      "href",
      "/organizer/stalls"
    );
    expect(screen.getByRole("link", { name: "待分配（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?status=unassigned"
    );
    expect(screen.getByRole("link", { name: "已分配（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?status=assigned"
    );
    expect(screen.getByRole("link", { name: "已停用（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?status=inactive"
    );
    expect(screen.getByText("主通道 2 号位")).toBeInTheDocument();
    expect(screen.queryByText("主通道 1 号位")).not.toBeInTheDocument();
    expect(screen.queryByText("侧边区 1 号位")).not.toBeInTheDocument();
  });

  it("filters stalls by marketId and preserves market context in status links", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
      }),
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      })
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
        reviewNote: "可安排面包区",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({ marketId: "market_2" })
    });

    render(page);

    expect(screen.getByText("当前市集：夏夜面包市集")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2"
    );
    expect(screen.getByRole("link", { name: "已分配（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&status=assigned"
    );
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=stalls"
    );
    expect(screen.getByRole("link", { name: "春日咖啡市集" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_1"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2"
    );
    expect(screen.getByRole("combobox", { name: "选择市集" })).toHaveValue("market_2");
    expect(screen.getByText("面包区 1 号位")).toBeInTheDocument();
    expect(screen.queryByText("主通道 1 号位")).not.toBeInTheDocument();
  });

  it("preserves status context when opening the dashboard from organizer stalls", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      })
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
        reviewNote: "可安排面包区",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({ marketId: "market_2", status: "assigned" })
    });

    render(page);

    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=stalls&status=assigned"
    );
  });

  it("shows overdue payment release action for assigned stalls", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));

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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作",
        assignedApplicationStatus: "stall_assigned",
        assignedOrderId: "order_2",
        assignedOrderStatus: "pending",
        assignedOrderCreatedAt: new Date("2026-05-03T06:00:00.000Z")
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        marketId: "market_2"
      })
    });

    render(page);

    expect(screen.getByText("支付状态：待支付")).toBeInTheDocument();
    expect(screen.getByText("支付已超时，建议立即释放档期并通知下一位候补。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "超时释放档期" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows payment reminder action for pending assigned stalls before timeout", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_3",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-03",
        name: "面包区 3 号位",
        assignedApplicationId: "app_3",
        assignedVendorId: "vendor_3",
        assignedVendorName: "青屿手作",
        assignedApplicationStatus: "stall_assigned",
        assignedOrderId: "order_3",
        assignedOrderStatus: "pending",
        assignedOrderCreatedAt: new Date("2026-05-02T22:00:00.000Z")
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        marketId: "market_2"
      })
    });

    render(page);

    expect(screen.getByText("支付状态：待支付")).toBeInTheDocument();
    expect(screen.getByText("支付跟进：立即催办")).toBeInTheDocument();
    expect(screen.getByText("支付将在 10 小时后超时，建议立即催办摊主完成支付。")).toBeInTheDocument();
    expect(screen.queryByText("支付将在 10 小时内到期，建议提前催办。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "催办支付" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows receipt after sending a payment reminder", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_3",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-03",
        name: "面包区 3 号位",
        assignedApplicationId: "app_3",
        assignedVendorId: "vendor_3",
        assignedVendorName: "青屿手作",
        assignedApplicationStatus: "stall_assigned",
        assignedOrderId: "order_3",
        assignedOrderStatus: "pending",
        assignedOrderCreatedAt: new Date("2026-05-03T02:00:00.000Z")
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        marketId: "market_2",
        paymentRemindedStallId: "stall_3"
      })
    });

    render(page);

    expect(screen.getByText("已发送支付提醒，摊主会收到催办通知。")).toBeInTheDocument();
    expect(sendPaymentReminder).not.toHaveBeenCalled();
  });

  it("shows release receipt after expiring an overdue payment order", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作",
        assignedApplicationStatus: "stall_assigned",
        assignedOrderId: "order_2",
        assignedOrderStatus: "pending",
        assignedOrderCreatedAt: new Date("2026-05-03T06:00:00.000Z")
      })
    ]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        marketId: "market_2",
        paymentReleasedStallId: "stall_2"
      })
    });

    render(page);

    expect(
      screen.getByText("已按支付超时释放档期，可继续分配给下一位摊主。")
    ).toBeInTheDocument();
    expect(expirePendingOrder).not.toHaveBeenCalled();
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      })
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
        reviewNote: "可安排面包区",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
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
      "/organizer/stalls?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=markets&marketStatus=published"
    );
  });

  it("renders an applications return link when opened from organizer applications", async () => {
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
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        code: "B-01",
        name: "面包区 1 号位",
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      })
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
        reviewNote: "可安排面包区",
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        marketId: "market_2",
        from: "applications",
        status: "approved"
      })
    });

    render(page);

    expect(screen.getByText("当前来自报名申请页。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&status=approved"
    );
    expect(screen.getByRole("link", { name: "全部（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=applications&sourceStatus=approved"
    );
    expect(screen.getByRole("link", { name: "已分配（1）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&status=assigned&from=applications&sourceStatus=approved"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集（当前）" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=applications&sourceStatus=approved"
    );
    expect(screen.getByRole("link", { name: "查看当前市集报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=applications&status=approved"
    );
    expect(screen.getByRole("link", { name: "查看当前市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=applications&status=approved"
    );
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后管理摊位。")
    ).toBeInTheDocument();
    expect(listOrganizerStalls).not.toHaveBeenCalled();
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });

  it("renders stall creation error when the action fails", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerStalls).mockResolvedValue([]);
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerApplications).mockResolvedValue([]);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        createError: "FORBIDDEN"
      })
    });

    render(page);

    expect(
      screen.getByText("创建失败：无权操作该市集。")
    ).toBeInTheDocument();
  });

  it("renders stall assignment error when the action fails", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarketOptions).mockResolvedValue([]);
    vi.mocked(listOrganizerStalls).mockResolvedValue([
      buildOrganizerStall({
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A01",
        name: "入口大摊",
      })
    ]);
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

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({
        assignError: "STALL_UNAVAILABLE",
        errorStallId: "stall_1"
      })
    });

    render(page);

    expect(
      screen.getByText("分配失败：该摊位已停用或已分配给其他申请。")
    ).toBeInTheDocument();
  });
});
