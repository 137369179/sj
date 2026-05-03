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
});
