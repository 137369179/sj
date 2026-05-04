import { NextResponse } from "next/server";

import { auth } from "../../../../../lib/auth-config";
import { db } from "../../../../../lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

  const { sessionId } = await params;
  const targetSession = await db.session.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      token: true,
    },
  });

  if (!targetSession) {
    return NextResponse.json({ message: "not_found" }, { status: 404 });
  }

  await auth.api.revokeSession({
    body: {
      token: targetSession.token,
    },
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
