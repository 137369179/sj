import { describe, expect, it } from "vitest";

import { buildApplicationReviewNotification } from "../service";

describe("notification service", () => {
  it("builds an approval notification with the organizer note", () => {
    const notification = buildApplicationReviewNotification({
      userId: "vendor_1",
      marketTitle: "春日咖啡市集",
      decision: "approve",
      note: "已录取，摊位后续通知"
    });

    expect(notification).toEqual({
      userId: "vendor_1",
      title: "申请审核已通过",
      content: "你在春日咖啡市集的申请已审核通过。备注：已录取，摊位后续通知"
    });
  });

  it("builds a rejection notification without an empty note", () => {
    const notification = buildApplicationReviewNotification({
      userId: "vendor_1",
      marketTitle: "春日咖啡市集",
      decision: "reject"
    });

    expect(notification).toEqual({
      userId: "vendor_1",
      title: "申请未通过审核",
      content: "你在春日咖啡市集的申请未通过审核，请调整后重新报名。"
    });
  });
});
