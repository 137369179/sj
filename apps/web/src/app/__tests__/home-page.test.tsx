import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../page";

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
});
