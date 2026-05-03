import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { buildApplicationSupplementPayload } from "../../../../server/applications/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "vendor") {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  try {
    const { applicationId } = await params;
    const body = await request.json();
    const payload = buildApplicationSupplementPayload(body);

    const application = await db.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        reviews: {
          select: {
            id: true,
            applicationId: true,
            organizerId: true,
            decision: true,
            reviewNote: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ message: "application not found" }, { status: 404 });
    }

    if (application.vendorId !== sessionUser.userId) {
      return NextResponse.json({ message: "forbidden" }, { status: 403 });
    }

    const latestReviewDecision = application.reviews[0]?.decision ?? null;
    if (application.status !== "under_review" || latestReviewDecision !== "supplement") {
      return NextResponse.json({ message: "supplement unavailable" }, { status: 409 });
    }

    const updatedApplication = await db.application.update({
      where: {
        id: applicationId
      },
      data: {
        boothPreference: payload.boothPreference,
        applicationNote: payload.applicationNote,
        attachmentsJson: payload.attachments,
        status: "under_review"
      }
    });

    return NextResponse.json(updatedApplication, { status: 200 });
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
