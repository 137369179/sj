import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

  try {
    const market = await createOrganizerMarket({
      organizerId: sessionUser.userId,
      title: body.title,
      city: body.city,
      startsAt: body.startsAt,
      endsAt: body.endsAt
    });

    return NextResponse.json(market, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "validation failed",
          fieldErrors: error.flatten().fieldErrors
        },
        { status: 422 }
      );
    }

    throw error;
  }
}
