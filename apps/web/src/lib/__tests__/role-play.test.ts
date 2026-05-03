import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOrganizerFollowUpLabel,
  getOrganizerFollowUpNote,
  getOrganizerFollowUpState,
  getVendorTimingNote,
  ORGANIZER_DASHBOARD_PRIORITIES,
  ROLE_GUIDANCE,
  ROLE_LABELS,
  VENDOR_APPLICATION_TASK_GROUPS,
} from "../role-play";

describe("role-play metadata", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defines readable labels and guidance for vendor and organizer roles", () => {
    expect(ROLE_LABELS.vendor).toBe("摊主");
    expect(ROLE_LABELS.organizer).toBe("主办方");
    expect(ROLE_GUIDANCE.organizer).toContain("发布市集");
  });

  it("defines vendor task groups and organizer priorities", () => {
    expect(VENDOR_APPLICATION_TASK_GROUPS[0].id).toBe("pending-action");
    expect(ORGANIZER_DASHBOARD_PRIORITIES).toContain("待审核申请");
  });

  it("derives timing notes for supplement and waitlist actions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    expect(
      getVendorTimingNote({
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T18:00:00.000Z")
      })
    ).toBe("补件将在 6 小时内截止，请优先处理。");

    expect(
      getVendorTimingNote({
        latestReviewDecision: "waitlist",
        reviewedAt: new Date("2026-05-02T09:00:00.000Z")
      })
    ).toBe("候补观察期内请保留档期，留意补位通知。");
  });

  it("derives organizer follow-up priority and timing notes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    expect(
      getOrganizerFollowUpState({
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T06:00:00.000Z")
      })
    ).toBe("urgent");
    expect(
      getOrganizerFollowUpNote({
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T06:00:00.000Z")
      })
    ).toBe("补件已超时，建议立即催办摊主，仍无回应则改判。");
    expect(getOrganizerFollowUpLabel("urgent")).toBe("立即催办");

    expect(
      getOrganizerFollowUpNote({
        latestReviewDecision: "waitlist",
        reviewedAt: new Date("2026-04-30T06:00:00.000Z")
      })
    ).toBe("候补观察已到期，建议立即确认补位或释放名额。");
    expect(getOrganizerFollowUpLabel("watching")).toBe("持续跟进");
  });
});
