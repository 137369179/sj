import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { buildApplicationPayload } from "../../../server/applications/service";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "vendor") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const payload = buildApplicationPayload(body);

    const market = await db.market.findUnique({
      where: {
        id: payload.marketId
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!market) {
      return NextResponse.json({ message: "market not found" }, { status: 404 });
    }

    if (market.status !== "published") {
      return NextResponse.json({ message: "market unavailable" }, { status: 409 });
    }

    const existing = await db.application.findFirst({
      where: {
        marketId: payload.marketId,
        vendorId: sessionUser.userId
      }
    });

    if (existing) {
      return NextResponse.json({ message: "duplicate application" }, { status: 409 });
    }

    const application = await db.application.create({
      data: {
        marketId: payload.marketId,
        vendorId: sessionUser.userId,
        boothPreference: payload.boothPreference,
        applicationNote: payload.applicationNote,
        attachmentsJson: payload.attachments,
        status: "submitted"
      }
    });

    return NextResponse.json(application, { status: 201 });
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
