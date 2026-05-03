import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { isUserRole } from "../../../../lib/roles";
import { resolveLoginUser } from "../../../../server/auth/service";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: string; userId?: string };
  const role = body.role;
  const userId = body.userId?.trim();

  if (!isUserRole(role) || !userId) {
    return NextResponse.json({ message: "invalid session payload" }, { status: 400 });
  }

  let loginUser;

  try {
    loginUser = await resolveLoginUser(userId, role);
  } catch (error) {
    return NextResponse.json({ message: "service unavailable" }, { status: 503 });
  }

  if (!loginUser) {
    return NextResponse.json({ message: "user not found" }, { status: 401 });
  }

  const sessionToken = await createSessionToken(loginUser.id, role);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return response;
}
