import { NextResponse } from "next/server";

import { auth } from "../../../../../lib/auth-config";

export async function POST(request: Request) {
  await auth.api.revokeOtherSessions({
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
