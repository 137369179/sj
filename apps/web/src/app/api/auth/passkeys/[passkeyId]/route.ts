import { NextResponse } from "next/server";

import { auth } from "../../../../../lib/auth-config";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ passkeyId: string }> },
) {
  const { passkeyId } = await params;

  await auth.api.deletePasskey({
    body: { id: passkeyId },
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
