import { describe, expect, it } from "vitest";

import { buildMarketPayload, canPublishMarket } from "../service";

describe("market service", () => {
  it("normalizes a market payload", () => {
    const result = buildMarketPayload({
      title: "春日咖啡市集",
      city: "杭州",
      startsAt: "2026-05-01T10:00:00.000Z",
      endsAt: "2026-05-02T18:00:00.000Z"
    });

    expect(result.title).toBe("春日咖啡市集");
    expect(result.city).toBe("杭州");
  });

  it("allows publish only for draft market", () => {
    expect(canPublishMarket("draft")).toBe(true);
    expect(canPublishMarket("published")).toBe(false);
  });
});
