import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
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

    const page = await OrganizerStallsPage();

    render(page);

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
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerStallsPage();

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后管理摊位。")
    ).toBeInTheDocument();
    expect(listOrganizerStalls).not.toHaveBeenCalled();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });
});
