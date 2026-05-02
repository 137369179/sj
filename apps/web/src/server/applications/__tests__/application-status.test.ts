import { describe, expect, it } from "vitest";

import { canTransitionApplication } from "../status";

describe("canTransitionApplication", () => {
  it("allows submitted -> under_review", () => {
    expect(canTransitionApplication("submitted", "under_review")).toBe(true);
  });

  it("blocks rejected -> approved", () => {
    expect(canTransitionApplication("rejected", "approved")).toBe(false);
  });
});
