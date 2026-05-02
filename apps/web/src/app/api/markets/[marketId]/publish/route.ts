import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { canPublishMarket } from "../../../../../server/markets/service";

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
  const market = await db.market.findUnique({ where: { id: marketId } });

  if (!market) {
    return NextResponse.json({ message: "market not found" }, { status: 404 });
  }

  if (market.organizerId !== sessionUser.userId) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  if (!canPublishMarket(market.status)) {
    return NextResponse.json({ message: "cannot publish" }, { status: 400 });
  }

  const updated = await db.market.update({
    where: { id: marketId },
    data: { status: "published" }
  });

  return NextResponse.json(updated);
}
