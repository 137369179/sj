import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerApplications } from "../../server/applications/service";
import OrganizerApplicationsPage from "../(organizer)/organizer/applications/page";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
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
        attachments: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage();

    render(page);

    expect(listOrganizerApplications).toHaveBeenCalledWith("org_1");
    expect(screen.getByRole("heading", { name: "报名申请" })).toBeInTheDocument();
    expect(screen.getByText("山野咖啡")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByText("状态：待审核")).toBeInTheDocument();
    expect(screen.getByText("报名备注：主营手作咖啡")).toBeInTheDocument();
    expect(screen.getByText("审核备注：资料已齐全，等待终审")).toBeInTheDocument();
    expect(screen.getByText("最近审核时间：2026-05-02")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "license.pdf" })).toHaveAttribute(
      "href",
      "/uploads/license.pdf"
    );
    expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒绝" })).toBeInTheDocument();
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerApplicationsPage();

    render(page);

    expect(
      screen.getByText("请先以主办方身份登录后查看申请。")
    ).toBeInTheDocument();
    expect(listOrganizerApplications).not.toHaveBeenCalled();
  });
});
