import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountCenter } from "../account-center";

const { addPasskeyMock, fetchMock, refreshMock } = vi.hoisted(() => ({
  addPasskeyMock: vi.fn(),
  fetchMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("../../../lib/auth-client", () => ({
  authClient: {
    passkey: {
      addPasskey: addPasskeyMock,
    },
  },
}));

describe("AccountCenter", () => {
  beforeEach(() => {
    addPasskeyMock.mockReset();
    fetchMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("switches the active role via the auth API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } satisfies Partial<Response>);

    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "vendor",
        }}
        passkeyCount={2}
        sessionCount={3}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前角色"), {
      target: { value: "organizer" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/roles/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "organizer" }),
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("当前角色已切换。");
  });

  it("renders enabled role overview with active context", () => {
    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "organizer",
        }}
        passkeyCount={0}
        sessionCount={0}
      />,
    );

    expect(screen.getByRole("heading", { name: "已开通角色" })).toBeInTheDocument();
    expect(screen.getByText("摊主")).toBeInTheDocument();
    expect(screen.getByText("主办方")).toBeInTheDocument();
    expect(screen.getByText("当前工作角色：主办方")).toBeInTheDocument();
    expect(screen.getByText("当前使用中")).toBeInTheDocument();
  });

  it("renders guidance for roles that are not yet enabled", () => {
    render(
      <AccountCenter
        user={{
          name: "Vendor",
          email: "vendor@example.com",
          roles: ["vendor"],
          activeRole: "vendor",
        }}
        passkeyCount={0}
        sessionCount={0}
      />,
    );

    expect(screen.getByRole("heading", { name: "可开通角色" })).toBeInTheDocument();
    expect(screen.getByText("主办方")).toBeInTheDocument();
    expect(screen.getByText("可发布市集、管理摊位与处理报名申请。")).toBeInTheDocument();
    expect(screen.getByText("当前账号暂未开通主办方能力。")).toBeInTheDocument();
  });

  it("renders security tips based on the current account posture", () => {
    render(
      <AccountCenter
        user={{
          name: "Vendor",
          email: "vendor@example.com",
          roles: ["vendor"],
          activeRole: "vendor",
        }}
        passkeyCount={0}
        sessionCount={3}
      />,
    );

    expect(screen.getByRole("heading", { name: "安全提示" })).toBeInTheDocument();
    expect(screen.getByText("建议尽快绑定至少 1 个 Passkey，减少密码泄露后的账号风险。")).toBeInTheDocument();
    expect(screen.getByText("当前账号存在多个设备会话，建议检查并撤销不再使用的设备。")).toBeInTheDocument();
  });

  it("deletes a passkey from the account center", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } satisfies Partial<Response>);

    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "organizer",
        }}
        passkeyCount={1}
        passkeys={[
          {
            id: "passkey_1",
            name: "MacBook Pro",
            createdAtLabel: "创建于 2026-05-03 09:00",
          },
        ]}
        sessionCount={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "删除 MacBook Pro" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/passkeys/passkey_1", {
        method: "DELETE",
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Passkey 已删除。");
  });

  it("renames a passkey from the account center", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } satisfies Partial<Response>);

    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "organizer",
        }}
        passkeyCount={1}
        passkeys={[
          {
            id: "passkey_1",
            name: "MacBook Pro",
            createdAtLabel: "创建于 2026-05-03 09:00",
          },
        ]}
        sessionCount={0}
      />,
    );

    fireEvent.change(screen.getByLabelText("Passkey 名称 MacBook Pro"), {
      target: { value: "Office Key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重命名 MacBook Pro" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/passkeys/passkey_1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Office Key" }),
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Passkey 名称已更新。");
  });

  it("revokes a single session from the account center", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } satisfies Partial<Response>);

    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "organizer",
        }}
        passkeyCount={0}
        sessionCount={2}
        sessions={[
          {
            id: "session_current",
            label: "当前设备",
            expiresAtLabel: "过期时间 2026-05-10 09:00",
            isCurrent: true,
          },
          {
            id: "session_2",
            label: "Chrome on macOS",
            expiresAtLabel: "过期时间 2026-05-10 09:00",
            isCurrent: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "撤销 Chrome on macOS" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/sessions/session_2", {
        method: "DELETE",
      });
    });

    expect(await screen.findByRole("status")).toHaveTextContent("设备会话已撤销。");
  });

  it("renders readable session activity hints", () => {
    render(
      <AccountCenter
        user={{
          name: "Organizer",
          email: "organizer@example.com",
          roles: ["vendor", "organizer"],
          activeRole: "organizer",
        }}
        passkeyCount={0}
        sessionCount={2}
        sessions={[
          {
            id: "session_current",
            label: "Chrome on macOS",
            createdAtLabel: "登录于 2026-05-03 08:30",
            expiresAtLabel: "过期时间 2026-05-10 09:00",
            ipAddressLabel: "IP 127.0.0.1",
            categoryLabel: "浏览器设备",
            isCurrent: true,
          },
          {
            id: "session_mobile",
            label: "Mobile Safari on iPhone",
            createdAtLabel: "登录于 2026-05-03 09:10",
            expiresAtLabel: "过期时间 2026-05-10 09:10",
            ipAddressLabel: "IP 10.0.0.8",
            categoryLabel: "移动设备",
            isCurrent: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("浏览器设备")).toBeInTheDocument();
    expect(screen.getByText("移动设备")).toBeInTheDocument();
    expect(screen.getByText("活跃中")).toBeInTheDocument();
  });
});
