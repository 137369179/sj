import { NextResponse } from "next/server";

import {
  SESSION_ROLE_COOKIE_NAME,
  SESSION_USER_ID_COOKIE_NAME
} from "../../../../lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  response.cookies.delete(SESSION_ROLE_COOKIE_NAME);
  response.cookies.delete(SESSION_USER_ID_COOKIE_NAME);

  return response;
}