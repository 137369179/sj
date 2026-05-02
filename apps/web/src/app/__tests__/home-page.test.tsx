import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../page";

describe("HomePage", () => {
  it("renders the landing page headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "让市集招募、报名与管理更高效" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看招募活动" })).toHaveAttribute(
      "href",
      "/markets"
    );
    expect(
      screen.getByRole("link", { name: "进入主办方端" })
    ).toHaveAttribute("href", "/organizer/markets");
    expect(screen.getByText("我是摊主")).toBeInTheDocument();
    expect(screen.getByText("我是主办方")).toBeInTheDocument();
  });
});
