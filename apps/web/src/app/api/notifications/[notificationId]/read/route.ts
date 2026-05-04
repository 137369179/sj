import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import { markNotificationAsRead } from "../../../../../server/notifications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { notificationId } = await params;

  try {
    const notification = await markNotificationAsRead({
      notificationId,
      userId: sessionUser.userId
    });

    return NextResponse.json({
      id: notification.id,
      isRead: true
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOTIFICATION_NOT_FOUND") {
        return NextResponse.json({ message: "not found" }, { status: 404 });
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }
    }

    throw error;
  }
}