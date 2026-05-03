import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminMarketsPage from "../(admin)/admin/markets/page";
import { getSessionUser } from "../../lib/auth";
import { listAdminMarkets } from "../../server/admin/market-service";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/admin/market-service", () => ({
  listAdminMarkets: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("AdminMarketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders market list for admin", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    vi.mocked(listAdminMarkets).mockResolvedValue([
      {
        id: "market_1",
        title: "咖啡市集",
        city: "杭州",
        status: "published",
        isPlatformApproved: false,
        coverUrl: "https://example.com/admin-market-cover.jpg",
        organizer: { name: "Org 1" },
        _count: { stalls: 5, applications: 2 }
      } as any
    ]);

    const page = await AdminMarketsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "平台运营与审核后台 - 市集大盘巡检" })).toBeInTheDocument();
    expect(screen.getByText("咖啡市集")).toBeInTheDocument();
    expect(screen.getByText("平台巡检中")).toBeInTheDocument();
    expect(screen.getByText("主办方：Org 1")).toBeInTheDocument();
    expect(screen.getByText("摊位：5 个 | 报名：2 份")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "咖啡市集 海报" })).toHaveAttribute(
      "src",
      "https://example.com/admin-market-cover.jpg"
    );
    expect(screen.getByRole("button", { name: "通过上架审核" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "强制下架/退回草稿" })).toBeInTheDocument();
  });

  it("renders approved market without approve button", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    vi.mocked(listAdminMarkets).mockResolvedValue([
      {
        id: "market_1",
        title: "咖啡市集",
        city: "杭州",
        status: "published",
        isPlatformApproved: true,
        organizer: { name: "Org 1" },
        _count: { stalls: 5, applications: 2 }
      } as any
    ]);

    const page = await AdminMarketsPage();
    render(page);

    expect(screen.getByText("已上架")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "通过上架审核" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "强制下架/退回草稿" })).toBeInTheDocument();
  });
});
