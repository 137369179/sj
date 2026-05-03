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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ passkeyId: string }> },
) {
  const { passkeyId } = await params;
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ message: "Passkey 名称不能为空。" }, { status: 400 });
  }

  await auth.api.updatePasskey({
    body: {
      id: passkeyId,
      name,
    },
    headers: request.headers,
  });

  return NextResponse.json({ ok: true });
}
