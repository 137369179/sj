import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "../login-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  })
}));

vi.mock("../../../lib/auth-client", () => ({
  authClient: {
    signIn: {
      passkey: vi.fn()
    }
  }
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a friendly message when password login is temporarily unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: "service unavailable"
        })
      })
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "vendor@example.com" }
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "password123" }
    });
    fireEvent.click(screen.getByRole("button", { name: "密码登录" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("登录服务暂时不可用，请稍后再试。");
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
