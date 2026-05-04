import { db } from "../../lib/db";
import { buildOrderPaidNotification, createNotification } from "../notifications/service";

export class PaymentError extends Error {
  code: "NOT_FOUND" | "INVALID_STATUS" | "FORBIDDEN";
  constructor(code: "NOT_FOUND" | "INVALID_STATUS" | "FORBIDDEN") {
    super(code);
    this.code = code;
  }
}

export async function payOrder(orderId: string, vendorId: string, method: string = "wechat") {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      application: {
        select: {
          market: {
            select: {
              title: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new PaymentError("NOT_FOUND");
  }

  if (order.vendorId !== vendorId) {
    throw new PaymentError("FORBIDDEN");
  }

  if (order.status !== "pending") {
    throw new PaymentError("INVALID_STATUS");
  }

  const commissionAmount = order.amount * 0.05; // 5% platform fee
  const netAmount = order.amount - commissionAmount;

  const updatedOrder = await db.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        commissionAmount,
        netAmount,
        paymentMethod: method,
        paidAt: new Date()
      }
    });

    await tx.application.update({
      where: { id: order.applicationId },
      data: {
        status: "paid"
      }
    });

    return updatedOrder;
  });

  await createNotification(
    buildOrderPaidNotification({
      userId: vendorId,
      marketTitle: order.application.market.title,
      amount: order.amount
    })
  );

  return updatedOrder;
}

export async function getVendorOrderForApplication(applicationId: string, vendorId: string) {
  return db.order.findFirst({
    where: {
      applicationId,
      vendorId
    }
  });
}
