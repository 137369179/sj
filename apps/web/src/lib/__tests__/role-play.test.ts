import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getVendorActionLabel,
  getOrganizerFollowUpLabel,
  getOrganizerFollowUpNote,
  getOrganizerPaymentFollowUpLabel,
  getOrganizerPaymentFollowUpNote,
  getOrganizerPaymentFollowUpState,
  getOrganizerFollowUpState,
  getVendorReceiptNote,
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

    expect(
      getVendorTimingNote({
        status: "stall_assigned",
        orderStatus: "pending",
        orderCreatedAt: new Date("2026-05-02T18:00:00.000Z")
      })
    ).toBe("支付将在 6 小时内截止，请尽快完成支付。");
  });

  it("derives vendor actions and receipts for supplement, waitlist, and paid states", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    expect(
      getVendorActionLabel({
        status: "under_review",
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T18:00:00.000Z")
      })
    ).toBe("立即补件");
    expect(
      getVendorReceiptNote({
        status: "under_review",
        latestReviewDecision: "supplement",
        reviewedAt: new Date("2026-05-01T18:00:00.000Z")
      })
    ).toBe("资料补齐后会重新进入主办方审核队列。");

    expect(
      getVendorActionLabel({
        status: "under_review",
        latestReviewDecision: "waitlist",
        reviewedAt: new Date("2026-05-02T09:00:00.000Z")
      })
    ).toBe("保留档期");
    expect(
      getVendorReceiptNote({
        status: "under_review",
        latestReviewDecision: "waitlist",
        reviewedAt: new Date("2026-05-02T09:00:00.000Z")
      })
    ).toBe("当前仍在候补观察名单中，如有空位将优先递补。");

    expect(
      getVendorActionLabel({
        status: "stall_assigned",
        orderStatus: "pending"
      })
    ).toBe("完成支付");
    expect(
      getVendorReceiptNote({
        status: "stall_assigned",
        orderStatus: "pending"
      })
    ).toBe("摊位已锁定，付款后将正式保留本次档期。");

    expect(
      getVendorActionLabel({
        status: "approved",
        latestReviewDecision: "approve",
        reviewedAt: new Date("2026-05-03T10:00:00.000Z"),
        reviewNote: "摊主已确认候补补位"
      })
    ).toBe("等待分配结果");
    expect(
      getVendorReceiptNote({
        status: "approved",
        latestReviewDecision: "approve",
        reviewedAt: new Date("2026-05-03T10:00:00.000Z"),
        reviewNote: "摊主已确认候补补位"
      })
    ).toBe("你已确认候补补位，主办方正在安排摊位分配。");
    expect(
      getVendorTimingNote({
        status: "approved",
        latestReviewDecision: "approve",
        reviewedAt: new Date("2026-05-03T10:00:00.000Z"),
        reviewNote: "摊主已确认候补补位"
      })
    ).toBe("主办方通常会在 24 小时内同步摊位分配结果，请留意最新通知。");

    expect(
      getVendorActionLabel({
        status: "rejected",
        reviewNote: "摊位支付超时，已释放档期"
      })
    ).toBe("重新报名");
    expect(
      getVendorReceiptNote({
        status: "rejected",
        reviewNote: "摊位支付超时，已释放档期"
      })
    ).toBe("由于支付超时，本次摊位档期已释放，可重新关注后续场次。");
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

    expect(
      getOrganizerPaymentFollowUpState({
        orderStatus: "pending",
        orderCreatedAt: new Date("2026-05-02T22:00:00.000Z")
      })
    ).toBe("urgent");
    expect(
      getOrganizerPaymentFollowUpNote({
        orderStatus: "pending",
        orderCreatedAt: new Date("2026-05-02T22:00:00.000Z")
      })
    ).toBe("支付将在 10 小时后超时，建议立即催办摊主完成支付。");
    expect(getOrganizerPaymentFollowUpLabel("watching")).toBe("持续跟进");
  });
});
