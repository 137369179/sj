import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSessionUser } from "../../../../../lib/auth";
import {
  ApplicationReviewError,
  buildApplicationReviewPayload,
  reviewApplication
} from "../../../../../server/applications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "organizer" && sessionUser.role !== "admin") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  try {
    const { applicationId } = await params;
    const body = await request.json();
    const payload = buildApplicationReviewPayload({
      ...body,
      organizerId: sessionUser.userId
    });
    const result = await reviewApplication({
      applicationId,
      ...payload
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

export const PUT = POST;
