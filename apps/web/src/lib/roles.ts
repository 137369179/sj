export type UserRole = "vendor" | "organizer" | "admin";

const routeRules: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/organizer", roles: ["organizer", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/markets", roles: ["vendor", "organizer", "admin"] }
];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "vendor" || value === "organizer" || value === "admin";
}

export function canAccessRoute(role: UserRole, pathname: string) {
  const matchedRule = routeRules.find((rule) => pathname.startsWith(rule.prefix));

  if (!matchedRule) {
    return true;
  }

  return matchedRule.roles.includes(role);
}
