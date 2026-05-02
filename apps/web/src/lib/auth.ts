import { cookies } from "next/headers";

import { isUserRole, type UserRole } from "./roles";

export const SESSION_ROLE_COOKIE_NAME = "mrp_session_role";
export const SESSION_USER_ID_COOKIE_NAME = "mrp_session_user_id";

export async function getSessionUser(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get(SESSION_ROLE_COOKIE_NAME)?.value;
  const userId = cookieStore.get(SESSION_USER_ID_COOKIE_NAME)?.value?.trim();

  if (!isUserRole(role) || !userId) {
    return null;
  }

  return {
    userId,
    role
  };
}

export async function getSessionRole(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get(SESSION_ROLE_COOKIE_NAME)?.value;

  return isUserRole(role) ? role : null;
}
