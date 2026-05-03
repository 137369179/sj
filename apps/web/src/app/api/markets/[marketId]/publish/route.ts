import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import {
  MarketPublishError,
  publishOrganizerMarket
} from "../../../../../server/markets/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "organizer" && sessionUser.role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { marketId } = await params;

  try {
    const updated = await publishOrganizerMarket({
      marketId,
      organizerId: sessionUser.userId
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof MarketPublishError) {
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ message: "market not found" }, { status: 404 });
      }

      if (error.code === "FORBIDDEN") {
        return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }

      if (error.code === "INVALID_STATUS") {
        return NextResponse.json({ message: "cannot publish" }, { status: 400 });
      }

      if (error.code === "UNVERIFIED_ORGANIZER") {
        return NextResponse.json({ message: "unverified organizer" }, { status: 403 });
      }
    }

    throw error;
  }
}
