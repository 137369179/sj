import { NextResponse } from "next/server";

import { getSessionRole } from "../../../../../lib/auth";
import {
  DashboardQueryError,
  getMarketDashboardSummary
} from "../../../../../server/dashboard/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const role = await getSessionRole();

  if (role !== "organizer" && role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { marketId } = await params;
  const { searchParams } = new URL(request.url);
  const organizerId = searchParams.get("organizerId");

  if (!organizerId) {
    return NextResponse.json({ message: "organizerId is required" }, { status: 400 });
  }

  try {
    const summary = await getMarketDashboardSummary({
      organizerId,
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
