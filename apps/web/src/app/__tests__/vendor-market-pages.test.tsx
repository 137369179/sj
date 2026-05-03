import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPublishedMarketById,
  listPublishedMarkets
} from "../../server/markets/service";
import MarketDetailPage from "../(vendor)/markets/[marketId]/page";
import VendorMarketsPage from "../(vendor)/markets/page";

vi.mock("../../server/markets/service", () => ({
  listPublishedMarkets: vi.fn(),
  getPublishedMarketById: vi.fn()
}));

describe("Vendor market pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filtered markets from search params", async () => {
    vi.mocked(listPublishedMarkets).mockResolvedValue([
      {
        id: "market_2",
        title: "独立手作品牌周末",
        city: "上海",
        startsAt: new Date("2026-06-06T10:00:00.000Z"),
        endsAt: new Date("2026-06-06T18:00:00.000Z"),
        status: "published"
      }
    ]);

    const page = await VendorMarketsPage({
      searchParams: Promise.resolve({
        city: "上海",
        keyword: "手作"
      })
    });

    render(page);

    expect(listPublishedMarkets).toHaveBeenCalledWith({
      city: "上海",
      keyword: "手作"
    });
    expect(screen.getByText("独立手作品牌周末")).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集")).not.toBeInTheDocument();
  });

  it("renders base market information on the detail page", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published"
    });

    const page = await MarketDetailPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(
      screen.getByRole("heading", { name: "春日咖啡市集" })
    ).toBeInTheDocument();
    expect(screen.getByText("杭州 · 2026-05-18 至 2026-05-18")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "立即报名" })
    ).toHaveAttribute("href", "/markets/market_1/apply");
    expect(
      screen.getByRole("link", { name: "查看我的报名" })
    ).toHaveAttribute("href", "/applications");
  });

  it("renders an applications return link when opened from vendor applications", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published"
    });

    const page = await MarketDetailPage({
      params: Promise.resolve({
        marketId: "market_1"
      }),
      searchParams: Promise.resolve({
        from: "applications",
        status: "approved"
      })
    });

    render(page);

    expect(
      screen.getByText("当前来自我的报名页，可直接返回当前市集的报名记录。")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "立即报名" })
    ).toHaveAttribute("href", "/markets/market_1/apply?from=applications&status=approved");
    expect(
      screen.getByRole("link", { name: "返回我的报名" })
    ).toHaveAttribute("href", "/applications?marketId=market_1&status=approved");
    expect(
      screen.getByRole("link", { name: "查看我的报名" })
    ).toHaveAttribute("href", "/applications?marketId=market_1&status=approved");
  });

  it("renders an unavailable message when the market is not published", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue(null);

    const page = await MarketDetailPage({
      params: Promise.resolve({
        marketId: "missing_market"
      }),
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByRole("heading", { name: "市集详情" })).toBeInTheDocument();
    expect(screen.getByText("当前市集暂不可查看或未公开招募。")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "立即报名" })).not.toBeInTheDocument();
  });
});
