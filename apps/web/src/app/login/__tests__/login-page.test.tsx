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

vi.mock("../../../lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
      passkey: vi.fn()
    }
  }
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn()
    })
  };
});

describe("LoginPage", () => {
  it("renders the login form", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({})
    });
    render(page);

    expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByText("使用邮箱密码登录，或直接使用 Passkey 完成无密码登录。")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "密码登录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用 Passkey 登录" })).toBeInTheDocument();
  });

  it("renders an error message when error query parameter is present", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "invalid_input" })
    });
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent("登录信息无效，请检查邮箱和密码后重试。");
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
