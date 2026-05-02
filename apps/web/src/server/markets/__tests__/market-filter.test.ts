import { describe, expect, it } from "vitest";

import { filterMarkets } from "../service";

describe("filterMarkets", () => {
  it("filters markets by city", () => {
    const result = filterMarkets(
      [
        { id: "1", city: "杭州", title: "春日咖啡市集" },
        { id: "2", city: "上海", title: "手作品牌周末" }
      ],
      { city: "杭州" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters markets by keyword", () => {
    const result = filterMarkets(
      [
        { id: "1", city: "杭州", title: "春日咖啡市集" },
        { id: "2", city: "杭州", title: "独立手作品牌周末" }
      ],
      { keyword: "咖啡" }
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});
