import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import {
  ApplicationReviewError,
  declineWaitlistOffer
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
    const result = await declineWaitlistOffer({
      notificationId,
      userId: sessionUser.userId
    });

    return NextResponse.json({
      applicationId: result.application.id,
      status: result.application.status,
      message: "已放弃本次候补补位，主办方会继续处理候补名单。"
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
