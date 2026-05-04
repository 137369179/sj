import { NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";
import type { UserRole } from "../../../../lib/roles";

const DEMO_LOGIN_USERS: Record<
  string,
  {
    password: string;
    userId: string;
    role: UserRole;
  }
> = {
  "vendor@example.com": {
    password: "password123",
    userId: "vendor_1",
    role: "vendor",
  },
  "organizer@example.com": {
    password: "password123",
    userId: "organizer_1",
    role: "organizer",
  },
  "admin@example.com": {
    password: "password123",
    userId: "admin_1",
    role: "admin",
  },
};

function isDemoLoginEnabled() {
  return process.env.AUTH_ENABLE_DEMO_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

function resolveDemoLogin(email: string, password: string) {
  if (!isDemoLoginEnabled()) {
    return null;
  }

  const candidate = DEMO_LOGIN_USERS[email];

  if (!candidate || candidate.password !== password) {
    return null;
  }

  return candidate;
}

async function createDemoLoginResponse(email: string, password: string) {
  const demoLogin = resolveDemoLogin(email, password);

  if (!demoLogin) {
    return null;
  }

  const sessionToken = await createSessionToken(demoLogin.userId, demoLogin.role);
  const response = NextResponse.json({ ok: true, mode: "demo" });

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  logger.info("Auth login succeeded", {
    email,
    userId: demoLogin.userId,
    activeRole: demoLogin.role,
    mode: "demo",
  });

  return response;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ message: "invalid login payload" }, { status: 400 });
  }

  const demoResponse = await createDemoLoginResponse(email, password);

  if (demoResponse) {
    return demoResponse;
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

      logger.info("Auth login succeeded", {
        email,
        userId: loginUser.id,
        activeRole,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ message: "service unavailable" }, { status: 503 });
  }
}
