import { NextResponse } from "next/server";

import { getSessionRole } from "../../../lib/auth";
import {
  StallCreationError,
  buildStallPayload,
  createStall
} from "../../../server/stalls/service";

export async function POST(request: Request) {
  const role = await getSessionRole();

  if (role !== "organizer" && role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const payload = buildStallPayload(body);

  try {
    const stall = await createStall(payload);

    return NextResponse.json(stall, { status: 201 });
  } catch (error) {
    if (error instanceof StallCreationError) {
      switch (error.code) {
        case "MARKET_NOT_FOUND":
          return NextResponse.json({ message: "market not found" }, { status: 404 });
        case "FORBIDDEN":
          return NextResponse.json({ message: "forbidden" }, { status: 403 });
      }
    }

    throw error;
  }
}
