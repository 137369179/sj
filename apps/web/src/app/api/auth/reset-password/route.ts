import { NextResponse } from "next/server";

import { auth } from "../../../../lib/auth-config";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; newPassword?: string };
  const token = body.token?.trim();
  const newPassword = body.newPassword;

  if (!token || !newPassword) {
    return NextResponse.json({ message: "重置参数无效。" }, { status: 400 });
  }

  await auth.api.resetPassword({
    body: {
      token,
      newPassword,
    },
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
