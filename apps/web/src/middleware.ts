import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canAccessRoute, isUserRole } from "./lib/roles";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    const role = payload?.role;

    if (isUserRole(role) && !canAccessRoute(role, request.nextUrl.pathname)) {
      return NextResponse.redirect(getRedirectUrl(request, "/"));
    }
  }

  return NextResponse.next();
}

function getRedirectUrl(request: NextRequest, pathname: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return new URL(`${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}${pathname}`);
  }

  return new URL(pathname, request.url);
}

export const config = {
  matcher: ["/organizer/:path*", "/admin/:path*", "/markets/:path*"]
};
