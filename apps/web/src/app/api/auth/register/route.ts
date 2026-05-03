import { NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";

import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const role = body.role;

  if (!name || !email || !password || (role !== "vendor" && role !== "organizer")) {
    return NextResponse.json({ message: "注册信息无效，请检查后重试。" }, { status: 400 });
  }

  try {
    const response = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        role,
        callbackURL: `${new URL(request.url).origin}/verify-email`,
      } as never,
      headers: request.headers,
      asResponse: true,
    });

    if (response.ok) {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (user) {
        await db.userRoleMembership.upsert({
          where: {
            userId_role: {
              userId: user.id,
              role,
            },
          },
          update: {
            status: "active",
          },
          create: {
            userId: user.id,
            role,
            status: "active",
          },
        });

        logger.info("Auth registration succeeded", {
          email,
          role,
          userId: user.id,
        });
      }
    }

    return response;
  } catch (error) {
    if (isAPIError(error)) {
        return NextResponse.json(
          { message: error.message },
          { status: typeof error.status === "number" ? error.status : 400 }
        );
    }

    return NextResponse.json({ message: "注册服务暂时不可用，请稍后再试。" }, { status: 503 });
  }
}
