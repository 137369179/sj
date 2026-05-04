import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import {
  DashboardQueryError,
  getMarketDashboardSummary
} from "../../../../../server/dashboard/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || (sessionUser.role !== "organizer" && sessionUser.role !== "admin")) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { marketId } = await params;

  try {
    const summary = await getMarketDashboardSummary({
      organizerId: sessionUser.userId,
      marketId
    });

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof DashboardQueryError) {
      switch (error.code) {
        case "NOT_FOUND":
          return NextResponse.json({ message: "market not found" }, { status: 404 });
        case "FORBIDDEN":
          return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }
    }

    throw error;
  }
}
