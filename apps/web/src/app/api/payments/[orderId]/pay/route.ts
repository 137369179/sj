import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import { PaymentError, payOrder } from "../../../../../server/payments/service";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "vendor") {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    await payOrder(orderId, sessionUser.userId);
    // Since it's a form action, we could redirect back, but let's just redirect
    return NextResponse.redirect(new URL("/applications", request.url), 303);
  } catch (error) {
    if (error instanceof PaymentError) {
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
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}