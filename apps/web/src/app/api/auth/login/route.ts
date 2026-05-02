import { NextResponse } from "next/server";

import {
  SESSION_ROLE_COOKIE_NAME,
  SESSION_USER_ID_COOKIE_NAME
} from "../../../../lib/auth";
import { isUserRole } from "../../../../lib/roles";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: string; userId?: string };
  const role = body.role;
  const userId = body.userId?.trim();

  if (!isUserRole(role) || !userId) {
    return NextResponse.json({ message: "invalid session payload" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_ROLE_COOKIE_NAME, role, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
  response.cookies.set(SESSION_USER_ID_COOKIE_NAME, userId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });

  return response;
}
