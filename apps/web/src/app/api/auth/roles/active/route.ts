import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../../lib/auth";
import { auth } from "../../../../../lib/auth-config";
import { db } from "../../../../../lib/db";
import { logger } from "../../../../../lib/logger";
import { isUserRole } from "../../../../../lib/roles";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: string };
  const role = body.role;

  if (!isUserRole(role)) {
    return NextResponse.json({ message: "角色无效。" }, { status: 400 });
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

  const membership = await db.userRoleMembership.findFirst({
    where: {
      userId: session.user.id,
      role,
      status: "active",
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }

  await db.session.update({
    where: { id: session.session.id },
    data: { activeRole: role },
  });

  const token = await createSessionToken(session.user.id, role);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  logger.info("Auth active role switched", {
    userId: session.user.id,
    role,
    sessionId: session.session.id,
  });
  return response;
}
