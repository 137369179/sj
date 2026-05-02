import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarketOptions } from "../../server/markets/service";
import { listOrganizerApplications } from "../../server/applications/service";
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

vi.mock("../../server/stalls/service", () => ({
  buildAssignStallPayload: vi.fn(),
  buildStallPayload: vi.fn(),
  assignStall: vi.fn(),
  createStall: vi.fn(),
  listOrganizerStalls: vi.fn()
}));

describe("Organizer stalls page", () => {
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
      {
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true,
        assignedApplicationId: null,
        assignedVendorId: null,
        assignedVendorName: null
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
        status: "approved",
        applicationNote: "主营手作咖啡",
        reviewNote: "可安排在主通道周边",
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
      {
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true,
        assignedApplicationId: null,
        assignedVendorId: null,
        assignedVendorName: null
      },
      {
        id: "stall_2",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-02",
        name: "主通道 2 号位",
        isActive: true,
        assignedApplicationId: "app_2",
        assignedVendorId: "vendor_2",
        assignedVendorName: "木野手作"
      },
      {
        id: "stall_3",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "B-01",
        name: "侧边区 1 号位",
        isActive: false,
        assignedApplicationId: null,
        assignedVendorId: null,
        assignedVendorName: null
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
        status: "approved",
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

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerStallsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后管理摊位。")
    ).toBeInTheDocument();
    expect(listOrganizerMarketOptions).not.toHaveBeenCalled();
    expect(listOrganizerStalls).not.toHaveBeenCalled();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });
});
