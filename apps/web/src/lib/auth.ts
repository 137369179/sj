import { cookies, headers } from "next/headers";

import { createSessionToken, SESSION_COOKIE_NAME, verifySessionToken } from "./auth-jwt";
import { isUserRole, type UserRole } from "./roles";

export const BETTER_AUTH_COOKIE_NAME = "better-auth.session_token";
export const AUTH_ENABLE_DEMO_LOGIN = process.env.AUTH_ENABLE_DEMO_LOGIN === "true";

export async function getSessionUser(): Promise<{
  userId: string;
  role: UserRole | null;
  roles?: UserRole[];
  activeRole?: UserRole | null;
  email?: string;
  name?: string;
} | null> {
  const cookieStore = await cookies();
  const betterAuthCookie =
    cookieStore.get(BETTER_AUTH_COOKIE_NAME)?.value ??
    cookieStore.get(`__Secure-${BETTER_AUTH_COOKIE_NAME}`)?.value;

  const isEdgeRuntime = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === "string";

  if (betterAuthCookie && !isEdgeRuntime) {
    try {
      const [{ auth: betterAuth }, { db }, { deriveSessionUser }] = await Promise.all([
        import("./auth-config"),
        import("./db"),
        import("../server/auth/session-service")
      ]);
      const session = await betterAuth.api.getSession({
        headers: await headers()
      });

      if (session) {
        const memberships = await db.userRoleMembership.findMany({
          where: {
            userId: session.user.id,
            status: "active"
          },
          select: {
            role: true,
            status: true
          }
        });

        return deriveSessionUser({
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            roleMemberships: memberships
          },
          activeRole:
            (session.session as { activeRole?: UserRole | null }).activeRole ??
            ((session.user as { role?: UserRole }).role ?? null)
        });
      }
    } catch (error) {
      // Fall back to the legacy demo JWT session while the migration is in progress.
    }
  }

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const payload = await verifySessionToken(sessionToken);
  
  if (!payload || !isUserRole(payload.role) || !payload.userId) {
    return null;
  }

  return {
    userId: payload.userId,
    role: payload.role,
    roles: [payload.role],
    activeRole: payload.role
  };
}

export async function getSessionRole(): Promise<UserRole | null> {
  const user = await getSessionUser();
  return user?.activeRole ?? user?.role ?? null;
}

export { createSessionToken, SESSION_COOKIE_NAME, verifySessionToken } from "./auth-jwt";
