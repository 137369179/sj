import type { UserRole } from "./roles";

type GuardSessionUser = {
  roles: UserRole[];
  activeRole: UserRole | null;
  role?: UserRole | null;
};

export function requireRoleMembership(
  sessionUser: GuardSessionUser | null,
  role: UserRole,
) {
  if (!sessionUser) {
    throw new Error("unauthenticated");
  }

  if (!sessionUser.roles.includes(role)) {
    throw new Error("forbidden");
  }

  return sessionUser;
}
