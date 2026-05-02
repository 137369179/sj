import { NextResponse } from "next/server";

import { getSessionRole } from "../../../../../lib/auth";
import {
  ApplicationReviewError,
  buildApplicationReviewPayload,
  reviewApplication
} from "../../../../../server/applications/service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const role = await getSessionRole();

  if (role !== "organizer" && role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  const { applicationId } = await params;
  const body = await request.json();
  const payload = buildApplicationReviewPayload(body);

  try {
    const result = await reviewApplication({
      applicationId,
      ...payload
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApplicationReviewError) {
      switch (error.code) {
        case "NOT_FOUND":
          return NextResponse.json(
            { message: "application not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ message: "forbidden" }, { status: 403 });
        case "INVALID_STATUS":
          return NextResponse.json(
            { message: "application cannot be reviewed" },
            { status: 409 }
          );
      }
    }

    throw error;
  }
}
