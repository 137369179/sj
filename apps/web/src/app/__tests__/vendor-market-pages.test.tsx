import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPublishedMarketById,
  listPublishedMarkets
} from "../../server/markets/service";
import { listAvailableStallsForMarket } from "../../server/stalls/service";
import MarketDetailPage from "../(vendor)/markets/[marketId]/page";
import VendorMarketsPage from "../(vendor)/markets/page";

vi.mock("../../server/markets/service", () => ({
  getPublishedMarketById: vi.fn(),
  listPublishedMarkets: vi.fn()
}));

vi.mock("../../server/stalls/service", () => ({
  listAvailableStallsForMarket: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
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
        coverUrl: "https://example.com/cover2.jpg",
        startsAt: new Date("2026-06-06T10:00:00.000Z"),
        endsAt: new Date("2026-06-06T18:00:00.000Z"),
        status: "published",
        organizerName: "Org 2",
        stallsCount: 5
      }
    ]);

    const page = await VendorMarketsPage({
      searchParams: Promise.resolve({
        city: "上海",
        keyword: "手作",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30"
      })
    });

    render(page);

    expect(listPublishedMarkets).toHaveBeenCalledWith({
      city: "上海",
      keyword: "手作",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30"
    });
    expect(screen.getByText("独立手作品牌周末")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "独立手作品牌周末 缩略图" })).toHaveAttribute("src", "https://example.com/cover2.jpg");
    expect(screen.getByText("主办方：Org 2 | 启用摊位：5 个")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "适合我的招募" })).toBeInTheDocument();
    expect(screen.getByText(/审核周期/)).toBeInTheDocument();
    expect(screen.getByText(/主办方信誉/)).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集")).not.toBeInTheDocument();
  });

  it("renders a graceful fallback when the market list cannot be loaded", async () => {
    vi.mocked(listPublishedMarkets).mockRejectedValue(new Error("database unavailable"));

    const page = await VendorMarketsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByRole("heading", { name: "发现市集" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("市集列表暂时不可用，请稍后再试。");
    expect(screen.queryByRole("link", { name: "查看详情" })).not.toBeInTheDocument();
  });

  it("renders base market information on the detail page", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      coverUrl: "https://example.com/cover.jpg",
      description: "这是一个咖啡市集",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      organizerName: "Org 1",
      stallsCount: 10
    });

    vi.mocked(listAvailableStallsForMarket).mockResolvedValue([
      { id: "stall_1", code: "A01", name: "主展位", price: 1000 },
      { id: "stall_2", code: "B01", name: "侧展位", price: 500 }
    ]);

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
    expect(screen.getByRole("img", { name: "春日咖啡市集 海报" })).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(screen.getByText("这是一个咖啡市集")).toBeInTheDocument();
    expect(screen.getByText("杭州 · 2026-05-18 至 2026-05-18")).toBeInTheDocument();
    expect(screen.getByText("主办方：Org 1 | 启用摊位：10 个")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "立即报名" })
    ).toHaveAttribute("href", "/markets/market_1/apply");
    expect(
      screen.getByRole("link", { name: "查看我的报名" })
    ).toHaveAttribute("href", "/applications");
    
    expect(screen.getByText("可用摊位一览")).toBeInTheDocument();
    const stallList = screen.getByRole("region", { name: "可用摊位一览" });
    const stallItems = within(stallList).getAllByRole("listitem");

    expect(stallItems).toHaveLength(2);
    expect(stallItems[0]).toHaveTextContent("A01 - 主展位");
    expect(stallItems[1]).toHaveTextContent("B01 - 侧展位");
  });

  it("renders an applications return link when opened from vendor applications", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue({
      id: "market_1",
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: new Date("2026-05-18T10:00:00.000Z"),
      endsAt: new Date("2026-05-18T18:00:00.000Z"),
      status: "published",
      organizerName: "Org 1",
      stallsCount: 10
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
