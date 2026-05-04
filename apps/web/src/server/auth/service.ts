import { db } from "../../lib/db";
import type { UserRole } from "../../lib/roles";

const DEMO_LOGIN_ALIAS_PATTERN = /^(vendor|organizer|admin)_(\d+)$/;

export async function resolveLoginUser(userId: string, role: UserRole): Promise<{
  id: string;
  role: UserRole;
} | null> {
  const exactUser = await db.user.findFirst({
    where: {
      id: userId,
      role
    },
    select: {
      id: true,
      role: true
    }
  });

  if (exactUser) {
    return exactUser as { id: string; role: UserRole };
  }

  const aliasMatch = DEMO_LOGIN_ALIAS_PATTERN.exec(userId);

  if (!aliasMatch || aliasMatch[1] !== role) {
    return null;
  }

  const aliasIndex = Number(aliasMatch[2]);

  if (!Number.isInteger(aliasIndex) || aliasIndex < 1) {
    return null;
  }

  const aliasUsers = await db.user.findMany({
    where: {
      role
    },
    select: {
      id: true,
      role: true
    },
    orderBy: {
      createdAt: "asc"
    },
    skip: aliasIndex - 1,
    take: 1
  });

  return (aliasUsers[0] as { id: string; role: UserRole } | undefined) ?? null;
}
