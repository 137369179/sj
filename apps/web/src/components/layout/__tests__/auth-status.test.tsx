import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStatus } from "../auth-status";

const { fetchMock, pushMock, refreshMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

describe("AuthStatus", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows an account center entry for authenticated users", () => {
    render(
      <AuthStatus
        sessionUser={{
          userId: "user_1",
          role: "organizer",
          activeRole: "organizer",
          name: "Organizer",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "账号中心" }));

    expect(pushMock).toHaveBeenCalledWith("/account");
  });

  it("logs out the current user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
    } satisfies Partial<Response>);

    render(
      <AuthStatus
        sessionUser={{
          userId: "user_1",
          role: "vendor",
          activeRole: "vendor",
          name: "Vendor",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
