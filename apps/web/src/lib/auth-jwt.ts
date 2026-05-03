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

export async function verifySessionToken(token: string): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);

    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      !isUserRole(payload.role)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
