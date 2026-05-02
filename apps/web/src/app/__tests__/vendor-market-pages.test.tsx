import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarketDetailPage from "../(vendor)/markets/[marketId]/page";
import VendorMarketsPage from "../(vendor)/markets/page";

describe("Vendor market pages", () => {
  it("renders filtered markets from search params", async () => {
    const page = await VendorMarketsPage({
      searchParams: Promise.resolve({
        city: "上海",
        keyword: "手作"
      })
    });

    render(page);

    expect(screen.getByText("独立手作品牌周末")).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集")).not.toBeInTheDocument();
  });

  it("renders base market information on the detail page", async () => {
    const page = await MarketDetailPage({
      params: Promise.resolve({
        marketId: "spring-coffee"
      }),
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByRole("heading", { name: "春日咖啡市集" })
    ).toBeInTheDocument();
    expect(screen.getByText("杭州")).toBeInTheDocument();
    expect(screen.getByText("2026-05-18")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "立即报名" })
    ).toHaveAttribute("href", "/markets/spring-coffee/apply");
    expect(
      screen.getByRole("link", { name: "查看我的报名" })
    ).toHaveAttribute("href", "/applications");
  });

  it("renders an applications return link when opened from vendor applications", async () => {
    const page = await MarketDetailPage({
      params: Promise.resolve({
        marketId: "spring-coffee"
      }),
      searchParams: Promise.resolve({
        from: "applications",
        status: "approved"
      })
    });

    render(page);

    expect(screen.getByText("当前来自我的报名页。")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "立即报名" })
    ).toHaveAttribute("href", "/markets/spring-coffee/apply?from=applications&status=approved");
    expect(
      screen.getByRole("link", { name: "返回我的报名" })
    ).toHaveAttribute("href", "/applications?marketId=spring-coffee&status=approved");
  });
});
