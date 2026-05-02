import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { listOrganizerApplications } from "../../server/applications/service";
import OrganizerApplicationsPage from "../(organizer)/organizer/applications/page";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  buildApplicationReviewPayload: vi.fn(),
  listOrganizerApplications: vi.fn(),
  reviewApplication: vi.fn()
}));

describe("Organizer applications page", () => {
  it("renders organizer applications from the service", async () => {
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
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);

    const page = await OrganizerApplicationsPage({
      searchParams: Promise.resolve({
        organizerId: "org_1"
      })
    });

    render(page);

    expect(screen.getByRole("heading", { name: "报名申请" })).toBeInTheDocument();
    expect(screen.getByText("山野咖啡")).toBeInTheDocument();
    expect(screen.getByText("春日咖啡市集 · 杭州")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通过" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拒绝" })).toBeInTheDocument();
  });
});
