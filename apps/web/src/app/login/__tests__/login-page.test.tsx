import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../lib/auth";
import LoginPage from "../page";

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn(),
  SESSION_ROLE_COOKIE_NAME: "mrp_session_role",
  SESSION_USER_ID_COOKIE_NAME: "mrp_session_user_id"
}));

// Mock AppShell to avoid testing async components deeply in the page test
vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("LoginPage", () => {
  it("renders the login form", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({})
    });
    render(page);

    expect(screen.getByRole("heading", { name: "登录 (Stub)" })).toBeInTheDocument();
    expect(screen.getByLabelText("角色")).toBeInTheDocument();
    expect(screen.getByLabelText("用户 ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("renders an error message when error query parameter is present", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "invalid_input" })
    });
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent("输入无效，请提供正确的角色和用户 ID。");
  });
});