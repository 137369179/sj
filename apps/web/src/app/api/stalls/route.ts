import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

  try {
    const body = await request.json();
    const payload = buildStallPayload(body);
    const stall = await createStall(payload);

    return NextResponse.json(stall, { status: 201 });
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
