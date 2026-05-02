import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("Organizer applications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        applicationNote: "主营手作咖啡",
        reviewNote: "资料已齐全，等待终审",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [
          {
            id: "review_2",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "复核通过",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
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
    expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒绝" })).toBeInTheDocument();
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

    expect(screen.getByText("全部申请：3")).toBeInTheDocument();
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

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后查看申请。")
    ).toBeInTheDocument();
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });
});
