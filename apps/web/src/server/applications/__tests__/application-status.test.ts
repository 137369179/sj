import { describe, expect, it } from "vitest";

import { canTransitionApplication } from "../status";

describe("Application status transitions", () => {
  it("should allow valid transitions", () => {
    expect(canTransitionApplication("submitted", "under_review")).toBe(true);
    expect(canTransitionApplication("approved", "stall_assigned")).toBe(true);
    expect(canTransitionApplication("stall_assigned", "paid")).toBe(true);
  });

  it("should disallow invalid transitions", () => {
    expect(canTransitionApplication("rejected", "approved")).toBe(false);
    expect(canTransitionApplication("stall_assigned", "submitted")).toBe(false);
    expect(canTransitionApplication("paid", "stall_assigned")).toBe(false);
  });
});
