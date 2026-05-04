import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  expirePendingOrder,
  getVendorOrderForApplication,
  PaymentError,
  payOrder,
  runAutomaticPaymentReminders,
  runAutomaticPaymentReleases,
  sendPaymentReminder
} from "../service";

describe("payments service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("payOrder", () => {
    it("pays a pending order and updates application status", async () => {
      vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_1",
        vendorId: "vendor_1",
        applicationId: "app_1",
        status: "pending",
        amount: 100,
        application: {
          market: {
            title: "春日咖啡市集"
          }
        }
      } as any);

      const transactionMock = {
        order: { update: vi.fn().mockResolvedValue({ id: "order_1", status: "paid" }) },
        application: { update: vi.fn().mockResolvedValue({ id: "app_1", status: "paid" }) }
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (cb) => {
        return cb(transactionMock as any);
      });
      const notificationCreateSpy = vi
        .spyOn(db.notification, "create")
        .mockResolvedValue({ id: "notification_1" } as any);

      const result = await payOrder("order_1", "vendor_1");

      expect(transactionMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order_1" },
          data: expect.objectContaining({
            status: "paid",
            paymentMethod: "wechat",
            commissionAmount: 5,
            netAmount: 95
          })
        })
      );
      expect(transactionMock.application.update).toHaveBeenCalledWith({
        where: { id: "app_1" },
        data: { status: "paid" }
      });
      expect(notificationCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: "vendor_1",
          title: "支付已完成",
          content: "你在春日咖啡市集的摊位费用已支付完成，金额为¥100，本次报名已锁定。"
        }
      });
      expect(result.status).toBe("paid");
    });

    it("rejects payment for an invalid order", async () => {
      vi.spyOn(db.order, "findUnique").mockResolvedValue(null);
      await expect(payOrder("order_1", "vendor_1")).rejects.toThrowError(new PaymentError("NOT_FOUND"));
    });

    it("rejects payment from wrong vendor", async () => {
      vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_1",
        vendorId: "vendor_2",
        status: "pending"
      } as any);
      await expect(payOrder("order_1", "vendor_1")).rejects.toThrowError(new PaymentError("FORBIDDEN"));
    });

    it("rejects payment for an already paid order", async () => {
      vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_1",
        vendorId: "vendor_1",
        status: "paid"
      } as any);
      await expect(payOrder("order_1", "vendor_1")).rejects.toThrowError(new PaymentError("INVALID_STATUS"));
    });
  });

  describe("expirePendingOrder", () => {
    it("cancels an overdue pending order and releases the assigned stall", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));

      vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_2",
        vendorId: "vendor_2",
        applicationId: "app_2",
        amount: 600,
        status: "pending",
        createdAt: new Date("2026-05-03T06:00:00.000Z"),
        application: {
          id: "app_2",
          status: "stall_assigned",
          vendorId: "vendor_2",
          market: {
            title: "夏夜面包市集",
            organizerId: "org_1"
          }
        }
      } as any);

      const transactionMock = {
        order: { update: vi.fn().mockResolvedValue({ id: "order_2", status: "cancelled" }) },
        stall: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        application: { update: vi.fn().mockResolvedValue({ id: "app_2", status: "rejected" }) },
        applicationReview: { create: vi.fn().mockResolvedValue({ id: "review_2" }) }
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (cb) => {
        return cb(transactionMock as any);
      });
      const notificationCreateSpy = vi
        .spyOn(db.notification, "create")
        .mockResolvedValue({ id: "notification_2" } as any);

      const result = await expirePendingOrder({
        orderId: "order_2",
        organizerId: "org_1"
      });

      expect(transactionMock.order.update).toHaveBeenCalledWith({
        where: { id: "order_2" },
        data: {
          status: "cancelled"
        }
      });
      expect(transactionMock.stall.updateMany).toHaveBeenCalledWith({
        where: {
          assignedApplicationId: "app_2"
        },
        data: {
          assignedApplicationId: null
        }
      });
      expect(transactionMock.application.update).toHaveBeenCalledWith({
        where: { id: "app_2" },
        data: {
          status: "rejected",
          reviewNote: "摊位支付超时，已释放档期",
          reviewedAt: expect.any(Date),
          reviewedByUserId: "org_1"
        }
      });
      expect(transactionMock.applicationReview.create).toHaveBeenCalledWith({
        data: {
          applicationId: "app_2",
          organizerId: "org_1",
          decision: "reject",
          reviewNote: "摊位支付超时，已释放档期"
        }
      });
      expect(notificationCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: "vendor_2",
          title: "支付超时，档期已释放",
          content:
            "你在夏夜面包市集的待支付订单已超时，主办方已释放本次摊位档期，可重新关注后续机会。"
        }
      });
      expect(result.order.status).toBe("cancelled");
      expect(result.application.status).toBe("rejected");

      vi.useRealTimers();
    });
  });

  describe("sendPaymentReminder", () => {
    it("sends a reminder for a pending assigned order", async () => {
      vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_3",
        vendorId: "vendor_3",
        amount: 900,
        status: "pending",
        application: {
          id: "app_3",
          status: "stall_assigned",
          market: {
            title: "秋日器物市集",
            organizerId: "org_1"
          }
        }
      } as any);

      const notificationCreateSpy = vi
        .spyOn(db.notification, "create")
        .mockResolvedValue({ id: "notification_3" } as any);

      const result = await sendPaymentReminder({
        orderId: "order_3",
        organizerId: "org_1"
      });

      expect(notificationCreateSpy).toHaveBeenCalledWith({
        data: {
          userId: "vendor_3",
          title: "支付进度提醒",
          content: "主办方提醒你尽快完成秋日器物市集的摊位费用支付，当前待支付金额为¥900。"
        }
      });
      expect(result.orderId).toBe("order_3");
      expect(result.notification.id).toBe("notification_3");
    });
  });

  describe("runAutomaticPaymentReminders", () => {
    it("automatically reminds urgent pending orders that have not been reminded after order creation", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

      vi.spyOn(db.market, "findUnique").mockResolvedValue({
        id: "market_1",
        title: "春日咖啡市集",
        organizerId: "org_1"
      } as any);
      vi.spyOn(db.order, "findMany").mockResolvedValue([
        {
          id: "order_urgent_1",
          vendorId: "vendor_1",
          amount: 200,
          status: "pending",
          createdAt: new Date("2026-05-02T22:00:00.000Z")
        },
        {
          id: "order_watching_1",
          vendorId: "vendor_2",
          amount: 180,
          status: "pending",
          createdAt: new Date("2026-05-03T03:00:00.000Z")
        },
        {
          id: "order_urgent_2",
          vendorId: "vendor_3",
          amount: 220,
          status: "pending",
          createdAt: new Date("2026-05-02T23:00:00.000Z")
        }
      ] as any);
      vi.spyOn(db.notification, "findMany").mockResolvedValue([
        {
          id: "notification_existing",
          userId: "vendor_3",
          title: "支付进度提醒",
          content: "主办方提醒你尽快完成春日咖啡市集的摊位费用支付，当前待支付金额为¥220。",
          createdAt: new Date("2026-05-03T09:00:00.000Z")
        }
      ] as any);
      const notificationCreateSpy = vi
        .spyOn(db.notification, "create")
        .mockResolvedValue({ id: "notification_new" } as any);

      const result = await runAutomaticPaymentReminders({
        marketId: "market_1",
        organizerId: "org_1"
      });

      expect(notificationCreateSpy).toHaveBeenCalledTimes(2);
      expect(notificationCreateSpy).toHaveBeenNthCalledWith(1, {
        data: {
          userId: "vendor_1",
          title: "支付进度提醒",
          content: "主办方提醒你尽快完成春日咖啡市集的摊位费用支付，当前待支付金额为¥200。"
        }
      });
      expect(notificationCreateSpy).toHaveBeenNthCalledWith(2, {
        data: {
          userId: "org_1",
          title: "支付自动催办已执行",
          content: "春日咖啡市集已自动催办 1 笔支付临期订单。"
        }
      });
      expect(result).toEqual({
        marketId: "market_1",
        remindedCount: 1,
        orderIds: ["order_urgent_1"]
      });

      vi.useRealTimers();
    });
  });

  describe("runAutomaticPaymentReleases", () => {
    it("automatically releases overdue pending orders for the target market", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));

      vi.spyOn(db.market, "findUnique").mockResolvedValue({
        id: "market_1",
        title: "春日咖啡市集",
        organizerId: "org_1"
      } as any);
      vi.spyOn(db.order, "findMany").mockResolvedValue([
        {
          id: "order_overdue_1",
          createdAt: new Date("2026-05-03T06:00:00.000Z")
        },
        {
          id: "order_recent_1",
          createdAt: new Date("2026-05-04T02:00:00.000Z")
        },
        {
          id: "order_overdue_2",
          createdAt: new Date("2026-05-03T02:00:00.000Z")
        }
      ] as any);

      const expireSpy = vi.spyOn(db.order, "findUnique").mockResolvedValue({
        id: "order_overdue_1",
        vendorId: "vendor_2",
        applicationId: "app_2",
        amount: 600,
        status: "pending",
        createdAt: new Date("2026-05-03T06:00:00.000Z"),
        application: {
          id: "app_2",
          status: "stall_assigned",
          vendorId: "vendor_2",
          market: {
            title: "春日咖啡市集",
            organizerId: "org_1"
          }
        }
      } as any);
      const transactionMock = {
        order: { update: vi.fn().mockResolvedValue({ id: "order_overdue_1", status: "cancelled" }) },
        stall: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        application: { update: vi.fn().mockResolvedValue({ id: "app_2", status: "rejected" }) },
        applicationReview: { create: vi.fn().mockResolvedValue({ id: "review_2" }) }
      };
      vi.spyOn(db, "$transaction").mockImplementation(async (cb) => cb(transactionMock as any));
      const notificationCreateSpy = vi
        .spyOn(db.notification, "create")
        .mockResolvedValue({ id: "notification_release" } as any);

      const secondOrderSpy = expireSpy.mockResolvedValueOnce({
        id: "order_overdue_1",
        vendorId: "vendor_2",
        applicationId: "app_2",
        amount: 600,
        status: "pending",
        createdAt: new Date("2026-05-03T06:00:00.000Z"),
        application: {
          id: "app_2",
          status: "stall_assigned",
          vendorId: "vendor_2",
          market: {
            title: "春日咖啡市集",
            organizerId: "org_1"
          }
        }
      } as any);
      secondOrderSpy.mockResolvedValueOnce({
        id: "order_overdue_2",
        vendorId: "vendor_3",
        applicationId: "app_3",
        amount: 500,
        status: "pending",
        createdAt: new Date("2026-05-03T02:00:00.000Z"),
        application: {
          id: "app_3",
          status: "stall_assigned",
          vendorId: "vendor_3",
          market: {
            title: "春日咖啡市集",
            organizerId: "org_1"
          }
        }
      } as any);

      const result = await runAutomaticPaymentReleases({
        marketId: "market_1",
        organizerId: "org_1"
      });

      expect(result).toEqual({
        marketId: "market_1",
        releasedCount: 2,
        orderIds: ["order_overdue_1", "order_overdue_2"]
      });
      expect(notificationCreateSpy).toHaveBeenLastCalledWith({
        data: {
          userId: "org_1",
          title: "支付自动释放已执行",
          content: "春日咖啡市集已自动释放 2 笔支付超时订单。"
        }
      });

      vi.useRealTimers();
    });
  });
});
