import { NextResponse } from "next/server";

import { db } from "../../../lib/db";
import { buildMarketPayload } from "../../../server/markets/service";

export async function POST(request: Request) {
  const body = await request.json();

  if (typeof body.organizerId !== "string" || body.organizerId.trim().length === 0) {
    return NextResponse.json(
      { message: "organizerId is required" },
      { status: 400 }
    );
  }

  const payload = buildMarketPayload(body);

  const market = await db.market.create({
    data: {
      organizerId: body.organizerId.trim(),
      title: payload.title,
      city: payload.city,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt),
      status: "draft"
    }
  });

  return NextResponse.json(market, { status: 201 });
}
