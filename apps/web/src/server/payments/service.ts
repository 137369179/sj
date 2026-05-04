import { db } from "../../lib/db";
import {
  buildOrderExpiredNotification,
  buildOrderPaidNotification,
  createNotification
} from "../notifications/service";

export class PaymentError extends Error {
  code: "NOT_FOUND" | "INVALID_STATUS" | "FORBIDDEN";
  constructor(code: "NOT_FOUND" | "INVALID_STATUS" | "FORBIDDEN") {
    super(code);
    this.code = code;
  }
}

export type ExpirePendingOrderInput = {
  orderId: string;
  organizerId: string;
};

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

export async function expirePendingOrder(input: ExpirePendingOrderInput) {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: {
      application: {
        select: {
          id: true,
          status: true,
          vendorId: true,
          market: {
            select: {
              title: true,
              organizerId: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new PaymentError("NOT_FOUND");
  }

  if (order.application.market.organizerId !== input.organizerId) {
    throw new PaymentError("FORBIDDEN");
  }

  if (order.status !== "pending" || order.application.status !== "stall_assigned") {
    throw new PaymentError("INVALID_STATUS");
  }

  const deadline = new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000);

  if (deadline.getTime() > Date.now()) {
    throw new PaymentError("INVALID_STATUS");
  }

  const reviewTimestamp = new Date();
  const result = await db.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: "cancelled"
      }
    });

    await tx.stall.updateMany({
      where: {
        assignedApplicationId: order.application.id
      },
      data: {
        assignedApplicationId: null
      }
    });

    const updatedApplication = await tx.application.update({
      where: { id: order.application.id },
      data: {
        status: "rejected",
        reviewNote: "摊位支付超时，已释放档期",
        reviewedAt: reviewTimestamp,
        reviewedByUserId: input.organizerId
      }
    });

    await tx.applicationReview.create({
      data: {
        applicationId: order.application.id,
        organizerId: input.organizerId,
        decision: "reject",
        reviewNote: "摊位支付超时，已释放档期"
      }
    });

    return {
      order: updatedOrder,
      application: updatedApplication
    };
  });

  await createNotification(
    buildOrderExpiredNotification({
      userId: order.vendorId,
      marketTitle: order.application.market.title
    })
  );

  return result;
}

export async function getVendorOrderForApplication(applicationId: string, vendorId: string) {
  return db.order.findFirst({
    where: {
      applicationId,
      vendorId
    }
  });
}
