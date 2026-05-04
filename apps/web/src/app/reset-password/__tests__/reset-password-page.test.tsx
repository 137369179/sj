import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResetPasswordPage from "../page";

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

describe("ResetPasswordPage", () => {
  it("renders the password reset form when a token is provided", async () => {
    render(
      await ResetPasswordPage({
        searchParams: Promise.resolve({ token: "token_123" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "重置密码" })).toBeInTheDocument();
    expect(screen.getByLabelText("新密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新密码" })).toBeInTheDocument();
  });
});
