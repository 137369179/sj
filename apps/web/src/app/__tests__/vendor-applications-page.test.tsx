import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listVendorApplications } from "../../server/applications/service";
import VendorApplicationsPage from "../(vendor)/applications/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  listVendorApplications: vi.fn()
}));

describe("Vendor applications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vendor applications from session identity with split notes and stall assignment result", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "stall_assigned",
        applicationNote: "主营手作咖啡",
        reviewNote: "摊位需求明确，允许进入分配",
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
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: "stall_1",
        assignedStallCode: "A-01",
        assignedStallName: "主通道 1 号位"
      }
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(listVendorApplications).toHaveBeenCalledWith("vendor_1");
    expect(screen.getByRole("heading", { name: "我的报名" })).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("状态：已分配摊位")).toBeInTheDocument();
    expect(screen.getByText("报名备注：主营手作咖啡")).toBeInTheDocument();
    expect(screen.getByText("审核备注：摊位需求明确，允许进入分配")).toBeInTheDocument();
    expect(screen.getByText("最近审核时间：2026-05-02")).toBeInTheDocument();
    expect(screen.getByText("审核历史")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 通过 · 复核通过")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 拒绝 · 首轮资料不完整")).toBeInTheDocument();
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
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "submitted",
        applicationNote: "主营手作咖啡",
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      },
      {
        id: "app_2",
        marketId: "market_2",
        marketTitle: "夏夜面包市集",
        marketCity: "上海",
        status: "approved",
        applicationNote: "主营木作器物",
        reviewNote: "初审通过",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T01:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null
      },
      {
        id: "app_3",
        marketId: "market_3",
        marketTitle: "秋日手作市集",
        marketCity: "南京",
        status: "stall_assigned",
        applicationNote: "主营原创首饰",
        reviewNote: "已完成摊位分配",
        reviewedAt: new Date("2026-05-03T08:30:00.000Z"),
        reviews: [],
        attachments: [],
        createdAt: new Date("2026-05-01T02:00:00.000Z"),
        assignedStallId: "stall_3",
        assignedStallCode: "B-03",
        assignedStallName: "内场 3 号位"
      }
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
    expect(screen.getByText("夏夜面包市集 · 上海")).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集 · 杭州")).not.toBeInTheDocument();
    expect(screen.queryByText("秋日手作市集 · 南京")).not.toBeInTheDocument();
  });
});
