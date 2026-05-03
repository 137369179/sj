import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import {
  ApplicationReviewError,
  confirmWaitlistOffer
} from "../../../../../server/applications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "vendor") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { notificationId } = await params;

  try {
    const result = await confirmWaitlistOffer({
      notificationId,
      userId: sessionUser.userId
    });

    return NextResponse.json({
      applicationId: result.application.id,
      status: result.application.status,
      message: "已确认候补补位，主办方将继续安排摊位。"
    });
  } catch (error) {
    if (error instanceof ApplicationReviewError) {
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ message: "not found" }, { status: 404 });
      }

      if (error.code === "FORBIDDEN") {
        return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }

      if (error.code === "INVALID_STATUS") {
        return NextResponse.json({ message: "invalid status" }, { status: 409 });
      }
    }

    throw error;
  }
}
