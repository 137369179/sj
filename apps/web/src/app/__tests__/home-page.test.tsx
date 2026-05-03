import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "../page";

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      data-prefetch={prefetch === undefined ? undefined : String(prefetch)}
      {...props}
    >
      {children}
    </a>
  )
}));

// Mock AppShell to avoid testing async components deeply in the page test
vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("HomePage", () => {
  it("renders the landing page headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "查看招募活动" })
        .every((link) => link.getAttribute("href") === "/markets")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "进入主办方端" })
        .every((link) => link.getAttribute("href") === "/organizer/markets")
    ).toBe(true);
    expect(
      screen.getAllByRole("link", { name: "查看招募活动" })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: "进入主办方端" })
    ).toHaveLength(2);
    expect(
      screen
        .getAllByRole("link", { name: "进入主办方端" })
        .every((link) => link.getAttribute("data-prefetch") === "false")
    ).toBe(true);
    expect(screen.getByRole("link", { name: "去主办方端" })).toHaveAttribute(
      "data-prefetch",
      "false"
    );
    expect(screen.getByText("我是摊主")).toBeInTheDocument();
    expect(screen.getByText("我是主办方")).toBeInTheDocument();
  });

  it("renders value cards and process steps", () => {
    render(<HomePage />);

    expect(screen.getByText("活动发布更集中")).toBeInTheDocument();
    expect(screen.getByText("报名流程更清晰")).toBeInTheDocument();
    expect(screen.getByText("协同管理更省心")).toBeInTheDocument();
    expect(screen.getByText("发布活动")).toBeInTheDocument();
    expect(screen.getByText("摊主报名")).toBeInTheDocument();
    expect(screen.getByText("审核沟通")).toBeInTheDocument();
    expect(screen.getByText("现场执行")).toBeInTheDocument();
  });

  it("renders one main region and five explicit named landing sections", () => {
    const { container } = render(<HomePage />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(container.querySelectorAll('section[role="region"]')).toHaveLength(5);
    expect(
      screen.getByRole("region", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "为什么使用这套平台" })
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "核心流程" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "选择你的使用路径" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "现在开始建立更清晰的市集协作流程" })
    ).toBeInTheDocument();
  });
});
