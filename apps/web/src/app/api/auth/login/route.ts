import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { isUserRole } from "../../../../lib/roles";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: string; userId?: string };
  const role = body.role;
  const userId = body.userId?.trim();

  if (!isUserRole(role) || !userId) {
    return NextResponse.json({ message: "invalid session payload" }, { status: 400 });
  }

  const sessionToken = await createSessionToken(userId, role);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return response;
}
