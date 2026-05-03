import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

describe("auth model contract", () => {
  it("exposes modern user identity fields", () => {
    expect(schema).toMatch(/email\s+String\s+@unique/);
    expect(schema).toMatch(/emailVerifiedAt\s+DateTime\?/);
    expect(schema).toMatch(/phone\s+String\?\s+@unique/);
  });

  it("defines role memberships and database sessions", () => {
    expect(schema).toContain("model UserRoleMembership");
    expect(schema).toContain("model Session");
    expect(schema).toMatch(/activeRole\s+UserRole\?/);
    expect(schema).toContain("model Passkey");
  });
});
