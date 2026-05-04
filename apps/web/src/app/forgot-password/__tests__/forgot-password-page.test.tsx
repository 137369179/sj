import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ForgotPasswordPage from "../page";

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

describe("ForgotPasswordPage", () => {
  it("renders the password reset request form", async () => {
    render(await ForgotPasswordPage());

    expect(screen.getByRole("heading", { name: "找回密码" })).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送重置链接" })).toBeInTheDocument();
  });
});
