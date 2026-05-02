import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canAccessRoute, isUserRole } from "./lib/roles";

export function middleware(request: NextRequest) {
  const role = request.cookies.get("mrp_session_role")?.value;

  if (isUserRole(role) && !canAccessRoute(role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/organizer/:path*", "/admin/:path*", "/markets/:path*"]
};
