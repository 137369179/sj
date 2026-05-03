import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminOrganizersPage from "../(admin)/admin/organizers/page";
import { getSessionUser } from "../../lib/auth";
import { listOrganizers } from "../../server/admin/service";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/admin/service", () => ({
  listOrganizers: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("AdminOrganizersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders organizer list for admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    vi.mocked(listOrganizers).mockResolvedValue([
      {
        id: "org_1",
        name: "Coffee Culture Org",
        phone: "13800000001",
        isVerified: true,
        createdAt: new Date("2026-05-01T10:00:00Z"),
        marketCount: 5
      }
    ]);

    const page = await AdminOrganizersPage();
    render(page);

    expect(screen.getByRole("heading", { name: "平台运营与审核后台 - 主办方管理" })).toBeInTheDocument();
    expect(screen.getByText("入驻主办方列表")).toBeInTheDocument();
    expect(screen.getByText(/Coffee Culture Org/)).toBeInTheDocument();
    expect(screen.getByText("已认证")).toBeInTheDocument();
    expect(screen.getByText("联系电话：13800000001")).toBeInTheDocument();
    expect(screen.getByText("已发布市集数：5 个")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "通过资质审核" })).not.toBeInTheDocument();
  });

  it("renders unverified organizer with verify button", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    vi.mocked(listOrganizers).mockResolvedValue([
      {
        id: "org_1",
        name: "Coffee Culture Org",
        phone: "13800000001",
        isVerified: false,
        createdAt: new Date("2026-05-01T10:00:00Z"),
        marketCount: 5
      }
    ]);

    const page = await AdminOrganizersPage();
    render(page);

    expect(screen.getByText("未认证")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通过资质审核" })).toBeInTheDocument();
  });

  it("renders empty state", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    vi.mocked(listOrganizers).mockResolvedValue([]);

    const page = await AdminOrganizersPage();
    render(page);

    expect(screen.getByText("暂无入驻的主办方。")).toBeInTheDocument();
  });
});