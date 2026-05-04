import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSessionUser } from "../../../../../lib/auth";
import {
  StallAssignmentError,
  assignStall,
  buildAssignStallPayload
} from "../../../../../server/stalls/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stallId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || (sessionUser.role !== "organizer" && sessionUser.role !== "admin")) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  try {
    const { stallId } = await params;
    const body = await request.json();
    const payload = buildAssignStallPayload(body);
    const result = await assignStall({
      stallId,
      ...payload,
      organizerId: sessionUser.userId
    });

    return NextResponse.json(result);
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

    if (error instanceof StallAssignmentError) {
      switch (error.code) {
        case "NOT_FOUND":
          return NextResponse.json({ message: "stall not found" }, { status: 404 });
        case "FORBIDDEN":
          return NextResponse.json({ message: "forbidden" }, { status: 403 });
        case "STALL_UNAVAILABLE":
          return NextResponse.json({ message: "stall unavailable" }, { status: 409 });
        case "INVALID_APPLICATION":
          return NextResponse.json({ message: "application invalid" }, { status: 409 });
        case "INVALID_APPLICATION_STATUS":
          return NextResponse.json(
            { message: "application cannot receive a stall" },
            { status: 409 }
          );
      }
    }

    throw error;
  }
}
