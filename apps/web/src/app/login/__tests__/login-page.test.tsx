import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../lib/auth";
import LoginPage from "../page";

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn(),
  SESSION_COOKIE_NAME: "mrp_session",
  createSessionToken: vi.fn().mockResolvedValue("mock-jwt-token")
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

    expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(
      screen.getByText("使用已配置的演示账号登录，快速验证摊主、主办方和平台管理员流程。")
    ).toBeInTheDocument();
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

  it("renders a service unavailable message when login is temporarily unavailable", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "service_unavailable" })
    });
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent("登录服务暂时不可用，请稍后再试。");
  });
});
