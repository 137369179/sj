import { describe, expect, it } from "vitest";

import { getApplicationStatusLabel } from "../application-status";

describe("getApplicationStatusLabel", () => {
  it("maps application statuses to Chinese labels", () => {
    expect(getApplicationStatusLabel("submitted")).toBe("待审核");
    expect(getApplicationStatusLabel("under_review")).toBe("审核中");
    expect(getApplicationStatusLabel("approved")).toBe("已通过");
    expect(getApplicationStatusLabel("rejected")).toBe("已拒绝");
    expect(getApplicationStatusLabel("stall_assigned")).toBe("已分配摊位");
  });
});
