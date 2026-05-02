import { NextResponse } from "next/server";

import { db } from "../../../lib/db";
import { buildApplicationPayload } from "../../../server/applications/service";

export async function POST(request: Request) {
  const body = await request.json();
  const payload = buildApplicationPayload(body);

  const existing = await db.application.findFirst({
    where: {
      marketId: payload.marketId,
      vendorId: payload.vendorId
    }
  });

  if (existing) {
    return NextResponse.json({ message: "duplicate application" }, { status: 409 });
  }

  const application = await db.application.create({
    data: {
      marketId: payload.marketId,
      vendorId: payload.vendorId,
      note: payload.note,
      status: "submitted"
    }
  });

  return NextResponse.json(
    {
      ...application,
      boothPreference: payload.boothPreference,
      attachments: payload.attachments
    },
    { status: 201 }
  );
}
