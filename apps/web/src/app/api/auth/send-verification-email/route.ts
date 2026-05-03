import { NextResponse } from "next/server";

import { auth } from "../../../../lib/auth-config";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "邮箱不能为空。" }, { status: 400 });
  }

  await auth.api.sendVerificationEmail({
    body: {
      email,
      callbackURL: `${new URL(request.url).origin}/verify-email`,
    },
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
