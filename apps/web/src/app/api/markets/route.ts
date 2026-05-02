import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { buildMarketPayload } from "../../../server/markets/service";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "organizer" && sessionUser.role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const payload = buildMarketPayload(body);

  const market = await db.market.create({
    data: {
      organizerId: sessionUser.userId,
      title: payload.title,
      city: payload.city,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt),
      status: "draft"
    }
  });

  return NextResponse.json(market, { status: 201 });
}
