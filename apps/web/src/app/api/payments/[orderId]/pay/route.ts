import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { PaymentError, payOrder } from "../../../../../server/payments/service";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "vendor") {
    logger.warn("Unauthorized payment attempt", { role: sessionUser?.role });
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    await payOrder(orderId, sessionUser.userId);
    logger.info("Order paid successfully", { orderId, vendorId: sessionUser.userId });
    return NextResponse.redirect(new URL("/applications", request.url), 303);
  } catch (error) {
    if (error instanceof PaymentError) {
      logger.warn("Payment domain error", { orderId, code: error.code });
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ message: "order not found" }, { status: 404 });
      }
      if (error.code === "FORBIDDEN") {
        return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }
      if (error.code === "INVALID_STATUS") {
        return NextResponse.json({ message: "invalid status" }, { status: 400 });
      }
    }
    logger.error(error instanceof Error ? error : new Error("Unknown error during payment"), {
      orderId,
      vendorId: sessionUser.userId
    });
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}