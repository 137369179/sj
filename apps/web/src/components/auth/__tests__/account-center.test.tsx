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
});
