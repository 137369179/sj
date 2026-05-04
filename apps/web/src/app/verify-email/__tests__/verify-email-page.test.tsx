import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import VerifyEmailPage from "../page";

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

describe("VerifyEmailPage", () => {
  it("renders the verification status and email hint", async () => {
    render(
      await VerifyEmailPage({
        searchParams: Promise.resolve({ email: "user@example.com" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "验证邮箱" })).toBeInTheDocument();
    expect(screen.getByText("我们已经向 user@example.com 发送了验证邮件。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新发送验证邮件" })).toBeInTheDocument();
  });
});
