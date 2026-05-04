import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      roleMemberships: {
        where: { status: "active" },
        select: { role: true },
        orderBy: { grantedAt: "asc" },
      },
    },
  });

  const activeRole = user?.roleMemberships[0]?.role ?? user?.role ?? null;

  if (!user || !activeRole) {
    return NextResponse.json({ message: "user not found" }, { status: 404 });
  }

  const token = await createSessionToken(user.id, activeRole);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
