import type { UserRole } from "../../lib/roles";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  roles: UserRole[];
  activeRole: UserRole | null;
  role: UserRole | null;
};

type MembershipStatus = "active" | "suspended";

export function deriveSessionUser(session: {
  user: {
    id: string;
    email: string;
    name: string;
    roleMemberships: Array<{ role: UserRole; status: MembershipStatus }>;
  };
  activeRole: UserRole | null;
}): SessionUser {
  const roles = session.user.roleMemberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.role);

  const activeRole = session.activeRole ?? roles[0] ?? null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles,
    activeRole,
    role: activeRole,
  };
}
