import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { createOrganizerMarket } from "../../../server/markets/service";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "organizer" && sessionUser.role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const market = await createOrganizerMarket({
    organizerId: sessionUser.userId,
    title: body.title,
    city: body.city,
    startsAt: body.startsAt,
    endsAt: body.endsAt
  });

  return NextResponse.json(market, { status: 201 });
}
