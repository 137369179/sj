import { describe, expect, it } from "vitest";

import { filterMarkets } from "../service";

describe("filterMarkets", () => {
  const markets = [
    { id: "1", city: "北京", title: "夏夜市集", startsAt: new Date("2026-06-01T10:00:00Z"), endsAt: new Date("2026-06-05T18:00:00Z") },
    { id: "2", city: "上海", title: "春日咖啡市集", startsAt: new Date("2026-05-18T10:00:00Z"), endsAt: new Date("2026-05-20T18:00:00Z") },
    { id: "3", city: "上海", title: "文创周末", startsAt: new Date("2026-07-10T10:00:00Z"), endsAt: new Date("2026-07-12T18:00:00Z") }
  ];

  it("filters by city", () => {
    const result = filterMarkets(markets, { city: "上海" });
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["2", "3"]);
  });

  it("filters by keyword", () => {
    const result = filterMarkets(markets, { keyword: "咖啡" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by city and keyword", () => {
    const result = filterMarkets(markets, { city: "上海", keyword: "周末" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters by dateFrom", () => {
    const result = filterMarkets(markets, { dateFrom: "2026-06-01" });
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["1", "3"]);
  });

  it("filters by dateTo", () => {
    const result = filterMarkets(markets, { dateTo: "2026-06-01" });
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("filters by date range", () => {
    const result = filterMarkets(markets, { dateFrom: "2026-06-01", dateTo: "2026-06-30" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all markets when no filters provided", () => {
    const result = filterMarkets(markets, {});
    expect(result).toHaveLength(3);
  });
});
