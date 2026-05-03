import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../lib/auth";
import { listAccountPasskeys, listAccountSessions } from "../../../server/auth/account-service";
import AccountPage from "../page";

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("../../../server/auth/account-service", () => ({
  listAccountSessions: vi.fn().mockResolvedValue([]),
  listAccountPasskeys: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

describe("AccountPage", () => {
  it("renders the account center for an authenticated user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "user_1",
      role: "organizer",
      activeRole: "organizer",
      roles: ["vendor", "organizer"],
      email: "organizer@example.com",
      name: "Organizer",
    });

    render(await AccountPage());

    expect(screen.getByRole("heading", { name: "账号中心" })).toBeInTheDocument();
    expect(screen.getByLabelText("当前角色")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "绑定 Passkey" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出其他设备" })).toBeInTheDocument();
    expect(screen.getByText("已绑定 Passkey")).toBeInTheDocument();
    expect(screen.getByText("设备会话")).toBeInTheDocument();
  });

  it("shows role upgrade guidance when some roles are still unavailable", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "user_1",
      role: "vendor",
      activeRole: "vendor",
      roles: ["vendor"],
      email: "vendor@example.com",
      name: "Vendor",
    });

    render(await AccountPage());

    expect(screen.getByRole("heading", { name: "可开通角色" })).toBeInTheDocument();
    expect(screen.getByText("当前账号暂未开通主办方能力。")).toBeInTheDocument();
  });

  it("renders passkey and session details from account services", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "user_1",
      role: "organizer",
      activeRole: "organizer",
      roles: ["vendor", "organizer"],
      email: "organizer@example.com",
      name: "Organizer",
    });
    vi.mocked(listAccountPasskeys).mockResolvedValue([
      {
        id: "passkey_1",
        name: "MacBook Pro",
        createdAtLabel: "创建于 2026-05-03 09:00",
      },
    ]);
    vi.mocked(listAccountSessions).mockResolvedValue([
      {
        id: "session_1",
        label: "Chrome on macOS",
        expiresAtLabel: "过期时间 2026-05-10 09:00",
        createdAtLabel: "登录于 2026-05-03 08:30",
        ipAddressLabel: "IP 127.0.0.1",
        categoryLabel: "浏览器设备",
        isCurrent: false,
      },
    ]);

    render(await AccountPage());

    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("创建于 2026-05-03 09:00")).toBeInTheDocument();
    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    expect(screen.getByText("过期时间 2026-05-10 09:00")).toBeInTheDocument();
    expect(screen.getByText("登录于 2026-05-03 08:30")).toBeInTheDocument();
    expect(screen.getByText("IP 127.0.0.1")).toBeInTheDocument();
    expect(screen.getByText("浏览器设备")).toBeInTheDocument();
  });
});
