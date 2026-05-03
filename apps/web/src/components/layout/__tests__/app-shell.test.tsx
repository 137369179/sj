import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "../app-shell";

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
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });
});
