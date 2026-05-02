import { NextResponse } from "next/server";

import { SESSION_ROLE_COOKIE_NAME } from "../../../../lib/auth";
import { isUserRole } from "../../../../lib/roles";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: string };
  const role = body.role;

  if (!isUserRole(role)) {
    return NextResponse.json({ message: "invalid role" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_ROLE_COOKIE_NAME, role, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });

  return response;
}
