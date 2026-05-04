import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  buildApplicationFollowUpNotification,
  buildApplicationReviewNotification,
  buildAutomaticPaymentOperationNotification,
  buildOrderExpiredNotification,
  buildOrderPaymentReminderNotification,
  buildOrderPaidNotification,
  buildStallAssignmentNotification,
  createNotification,
  listVendorNotifications,
  markNotificationAsRead
} from "../service";

vi.mock("../../../lib/db", () => ({
  db: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildApplicationReviewNotification", () => {
    it("builds an approval notification", () => {
      const result = buildApplicationReviewNotification({
        userId: "vendor_1",
        marketTitle: "夏日冰饮市集",
        decision: "approve"
      });

      expect(result).toEqual({
        userId: "vendor_1",
        title: "申请审核已通过",
        content: "你在夏日冰饮市集的申请已审核通过。"
      });
    });

    it("builds a rejection notification with note", () => {
      const result = buildApplicationReviewNotification({
        userId: "vendor_2",
        marketTitle: "春日咖啡市集",
        decision: "reject",
        note: "主推品类与市集调性不符"
      });

      expect(result).toEqual({
        userId: "vendor_2",
        title: "申请未通过审核",
        content:
          "你在春日咖啡市集的申请未通过审核，请调整后重新报名。备注：主推品类与市集调性不符"
      });
    });

    it("builds a supplement notification with note", () => {
      const result = buildApplicationReviewNotification({
        userId: "vendor_2",
        marketTitle: "春日咖啡市集",
        decision: "supplement",
        note: "请补充近三次摆摊照片"
      });

      expect(result).toEqual({
        userId: "vendor_2",
        title: "申请需要补充资料",
        content:
          "你在春日咖啡市集的申请需要补充资料后继续审核。备注：请补充近三次摆摊照片"
      });
    });

    it("builds follow-up notifications for supplement reminders and waitlist confirmations", () => {
      expect(
        buildApplicationFollowUpNotification({
          userId: "vendor_2",
          marketTitle: "春日咖啡市集",
          action: "supplement_reminder",
          note: "请补充近三次摆摊照片"
        })
      ).toEqual({
        userId: "vendor_2",
        title: "补件进度提醒",
        content:
          "主办方提醒你尽快完成春日咖啡市集的补件要求，以免错过本轮审核。备注：请补充近三次摆摊照片"
      });

      expect(
        buildApplicationFollowUpNotification({
          userId: "vendor_2",
          marketTitle: "春日咖啡市集",
          action: "waitlist_confirmation"
        })
      ).toEqual({
        userId: "vendor_2",
        title: "候补补位通知",
        content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。"
      });
    });
  });

  describe("buildStallAssignmentNotification", () => {
    it("builds a stall assignment notification", () => {
      const result = buildStallAssignmentNotification({
        userId: "vendor_1",
        marketTitle: "夏日冰饮市集",
        stallCode: "A01",
        stallName: "主入口特展"
      });

      expect(result).toEqual({
        userId: "vendor_1",
        title: "摊位分配已确认",
        content: "你在夏日冰饮市集的申请已完成摊位分配，摊位为主入口特展（A01）。"
      });
    });
  });

  describe("buildOrderPaidNotification", () => {
    it("builds an order paid notification", () => {
      const result = buildOrderPaidNotification({
        userId: "vendor_1",
        marketTitle: "夏日冰饮市集",
        amount: 800
      });

      expect(result).toEqual({
        userId: "vendor_1",
        title: "支付已完成",
        content: "你在夏日冰饮市集的摊位费用已支付完成，金额为¥800，本次报名已锁定。"
      });
    });
  });

  describe("buildOrderExpiredNotification", () => {
    it("builds an order expired notification", () => {
      const result = buildOrderExpiredNotification({
        userId: "vendor_1",
        marketTitle: "夏日冰饮市集"
      });

      expect(result).toEqual({
        userId: "vendor_1",
        title: "支付超时，档期已释放",
        content: "你在夏日冰饮市集的待支付订单已超时，主办方已释放本次摊位档期，可重新关注后续机会。"
      });
    });
  });

  describe("buildOrderPaymentReminderNotification", () => {
    it("builds an order payment reminder notification", () => {
      const result = buildOrderPaymentReminderNotification({
        userId: "vendor_1",
        marketTitle: "夏日冰饮市集",
        amount: 800
      });

      expect(result).toEqual({
        userId: "vendor_1",
        title: "支付进度提醒",
        content: "主办方提醒你尽快完成夏日冰饮市集的摊位费用支付，当前待支付金额为¥800。"
      });
    });
  });

  describe("buildAutomaticPaymentOperationNotification", () => {
    it("builds organizer automation notifications for reminders and releases", () => {
      expect(
        buildAutomaticPaymentOperationNotification({
          userId: "org_1",
          marketTitle: "夏日冰饮市集",
          action: "auto_reminder",
          count: 2
        })
      ).toEqual({
        userId: "org_1",
        title: "支付自动催办已执行",
        content: "夏日冰饮市集已自动催办 2 笔支付临期订单。"
      });

      expect(
        buildAutomaticPaymentOperationNotification({
          userId: "org_1",
          marketTitle: "夏日冰饮市集",
          action: "auto_release",
          count: 1
        })
      ).toEqual({
        userId: "org_1",
        title: "支付自动释放已执行",
        content: "夏日冰饮市集已自动释放 1 笔支付超时订单。"
      });
    });
  });

  describe("createNotification", () => {
    it("saves the notification to the database", async () => {
      const mockCreated = { id: "n_1" };
      vi.mocked(db.notification.create).mockResolvedValue(mockCreated as any);

      const result = await createNotification({
        userId: "vendor_1",
        title: "测试通知",
        content: "这是一条测试内容"
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "vendor_1",
          title: "测试通知",
          content: "这是一条测试内容"
        }
      });
      expect(result).toBe(mockCreated);
    });
  });

  describe("listVendorNotifications", () => {
    it("lists notifications for a vendor and maps read status", async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue([
        {
          id: "n_1",
          title: "测试通知 1",
          content: "内容 1",
          userId: "vendor_1",
          readAt: new Date(),
          createdAt: new Date("2026-05-01T10:00:00Z")
        },
        {
          id: "n_2",
          title: "测试通知 2",
          content: "内容 2",
          userId: "vendor_1",
          readAt: null,
          createdAt: new Date("2026-05-02T10:00:00Z")
        }
      ]);

      const results = await listVendorNotifications("vendor_1");

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "vendor_1" },
        orderBy: { createdAt: "desc" }
      });
      expect(results).toEqual([
        {
          id: "n_1",
          title: "测试通知 1",
          content: "内容 1",
          isRead: true,
          createdAt: new Date("2026-05-01T10:00:00Z")
        },
        {
          id: "n_2",
          title: "测试通知 2",
          content: "内容 2",
          isRead: false,
          createdAt: new Date("2026-05-02T10:00:00Z")
        }
      ]);
    });
  });

  describe("markNotificationAsRead", () => {
    it("marks an unread notification as read", async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: "n_1",
        userId: "vendor_1",
        readAt: null
      } as any);

      await markNotificationAsRead({ notificationId: "n_1", userId: "vendor_1" });

      expect(db.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "n_1" },
          data: expect.objectContaining({ readAt: expect.any(Date) })
        })
      );
    });

    it("throws NOTIFICATION_NOT_FOUND if notification does not exist", async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue(null);

      await expect(
        markNotificationAsRead({ notificationId: "n_1", userId: "vendor_1" })
      ).rejects.toThrow("NOTIFICATION_NOT_FOUND");
    });

    it("throws FORBIDDEN if the notification belongs to another user", async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: "n_1",
        userId: "vendor_2",
        readAt: null
      } as any);

      await expect(
        markNotificationAsRead({ notificationId: "n_1", userId: "vendor_1" })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("skips updating if already read", async () => {
      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: "n_1",
        userId: "vendor_1",
        readAt: new Date()
      } as any);

      await markNotificationAsRead({ notificationId: "n_1", userId: "vendor_1" });

      expect(db.notification.update).not.toHaveBeenCalled();
    });
  });
});
