import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canAccessRoute, isUserRole } from "./lib/roles";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/auth-jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const requiresProtectedSession =
    pathname.startsWith("/organizer") || pathname.startsWith("/admin");

  if (!sessionToken && requiresProtectedSession) {
    return NextResponse.redirect(
      getRedirectUrl(request, `/login?returnTo=${encodeURIComponent(pathname)}`)
    );
  }

  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    const role = payload?.role;

    if (isUserRole(role) && !canAccessRoute(role, pathname)) {
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
