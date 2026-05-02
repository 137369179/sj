import { NextResponse } from "next/server";

import { getSessionRole } from "../../../../../lib/auth";
import {
  StallAssignmentError,
  assignStall,
  buildAssignStallPayload
} from "../../../../../server/stalls/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stallId: string }> }
) {
  const role = await getSessionRole();

  if (role !== "organizer" && role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { stallId } = await params;
  const body = await request.json();
  const payload = buildAssignStallPayload(body);

  try {
    const result = await assignStall({
      stallId,
      ...payload
    });

    return NextResponse.json(result);
  } catch (error) {
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
