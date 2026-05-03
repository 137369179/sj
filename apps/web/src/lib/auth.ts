import { cookies } from "next/headers";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

import { isUserRole, type UserRole } from "./roles";

export const SESSION_COOKIE_NAME = "mrp_session";
const JWT_SECRET_KEY = process.env.JWT_SECRET || "default-dev-secret-key-change-me-in-prod";
const encodedKey = new TextEncoder().encode(JWT_SECRET_KEY);

export async function createSessionToken(userId: string, role: UserRole): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as { userId: string; role: UserRole };
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
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
    role: payload.role
  };
}

export async function getSessionRole(): Promise<UserRole | null> {
  const user = await getSessionUser();
  return user?.role ?? null;
}
