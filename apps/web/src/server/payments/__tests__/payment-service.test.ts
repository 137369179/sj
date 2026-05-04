import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import { getVendorOrderForApplication, PaymentError, payOrder } from "../service";

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
});
