import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ message: "invalid login payload" }, { status: 400 });
  }

  try {
    const authResponse = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: request.headers,
      asResponse: true,
    });

    const response = new NextResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers,
    });

    if (!authResponse.ok) {
      return response;
    }

    let loginUser;

    try {
      loginUser = await db.user.findUnique({
        where: { email },
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
    } catch (error) {
      return NextResponse.json({ message: "service unavailable" }, { status: 503 });
    }

    const activeRole = loginUser?.roleMemberships[0]?.role ?? loginUser?.role ?? null;

    if (loginUser && activeRole) {
      const sessionToken = await createSessionToken(loginUser.id, activeRole);
      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ message: "service unavailable" }, { status: 503 });
  }
}
