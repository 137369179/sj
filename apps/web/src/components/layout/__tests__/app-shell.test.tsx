import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../app-shell";
import { getSessionUser } from "../../../lib/auth";

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      data-prefetch={prefetch === undefined ? undefined : String(prefetch)}
      {...props}
    >
      {children}
    </a>
  )
}));

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn().mockResolvedValue(null)
}));

// Provide router mock for AuthStatus
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

describe("AppShell", () => {
  it("renders the product name and role navigation", async () => {
    render(
      await AppShell({
        children: <main>Page Content</main>
      })
    );

    const brandLink = screen.getByRole("link", { name: "市集招募平台" });
    const roleNavigation = screen.getByRole("navigation", { name: "角色导航" });

    expect(brandLink).toBeInTheDocument();
    expect(roleNavigation).toBeInTheDocument();
    expect(brandLink).toHaveClass("brand");
    expect(roleNavigation).toHaveClass("shell-nav");
    expect(brandLink.closest(".app-shell")).not.toBeNull();
    expect(brandLink.closest(".shell-header")).not.toBeNull();
    expect(screen.getByRole("link", { name: "摊主端" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "主办方端" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "摊主端" })).toHaveAttribute("href", "/markets");
    expect(screen.getByRole("link", { name: "主办方端" })).toHaveAttribute("href", "/organizer/markets");
    expect(screen.getByRole("link", { name: "主办方端" })).toHaveAttribute(
      "data-prefetch",
      "false"
    );
    expect(screen.getByText("Page Content")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "主办方管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "市集巡检" })).not.toBeInTheDocument();
  });

  it("disables organizer prefetch for vendor role", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });

    render(
      await AppShell({
        children: <main>Page Content</main>
      })
    );

    expect(screen.getByRole("link", { name: "我的报名" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "主办方端" })).toHaveAttribute(
      "data-prefetch",
      "false"
    );
  });

  it("renders admin navigation for admin role", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "admin_1",
      role: "admin"
    });

    render(
      await AppShell({
        children: <main>Page Content</main>
      })
    );

    expect(screen.getByRole("link", { name: "主办方管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "市集巡检" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "主办方端" }).getAttribute("data-prefetch")).toBeNull();
    expect(screen.queryByRole("link", { name: "我的报名" })).not.toBeInTheDocument();
  });
});
