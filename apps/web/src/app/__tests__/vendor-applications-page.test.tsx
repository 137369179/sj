import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listVendorApplications } from "../../server/applications/service";
import VendorApplicationsPage from "../(vendor)/applications/page";

vi.mock("../../server/applications/service", () => ({
  listVendorApplications: vi.fn()
}));

describe("Vendor applications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vendor applications with status, note, and stall assignment result", async () => {
    vi.mocked(listVendorApplications).mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "stall_assigned",
        note: "主营手作咖啡",
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: "stall_1",
        assignedStallCode: "A-01",
        assignedStallName: "主通道 1 号位"
      }
    ]);

    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({
        vendorId: "vendor_1"
      })
    });

    render(page);

    expect(screen.getByRole("heading", { name: "我的报名" })).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("状态：stall_assigned")).toBeInTheDocument();
    expect(screen.getByText("申请备注：主营手作咖啡")).toBeInTheDocument();
    expect(
      screen.getByText("分配结果：主通道 1 号位（A-01）")
    ).toBeInTheDocument();
  });

  it("prompts for vendorId when the page is opened without identity context", async () => {
    const page = await VendorApplicationsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByText("请通过 `?vendorId=` 指定当前摊主后查看报名状态。")
    ).toBeInTheDocument();
    expect(listVendorApplications).not.toHaveBeenCalled();
  });
});
