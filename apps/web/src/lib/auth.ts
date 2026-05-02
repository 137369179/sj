import { cookies } from "next/headers";

import { isUserRole, type UserRole } from "./roles";

export const SESSION_ROLE_COOKIE_NAME = "mrp_session_role";

export async function getSessionRole(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get(SESSION_ROLE_COOKIE_NAME)?.value;

  return isUserRole(role) ? role : null;
}
