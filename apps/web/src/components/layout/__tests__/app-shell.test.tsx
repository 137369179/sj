import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "../app-shell";

describe("AppShell", () => {
  it("renders the product name and role navigation", () => {
    render(
      <AppShell>
        <main>content</main>
      </AppShell>
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
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
