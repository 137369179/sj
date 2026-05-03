import { describe, expect, it } from "vitest";

import { deriveSessionUser } from "../session-service";

describe("deriveSessionUser", () => {
  it("returns roles and activeRole from a database session", async () => {
    const sessionUser = await deriveSessionUser({
      user: {
        id: "user_1",
        email: "vendor@example.com",
        name: "Vendor",
        roleMemberships: [{ role: "vendor", status: "active" }],
      },
      activeRole: "vendor",
    } as const);

    expect(sessionUser).toEqual({
      userId: "user_1",
      email: "vendor@example.com",
      name: "Vendor",
      roles: ["vendor"],
      activeRole: "vendor",
      role: "vendor",
    });
  });
});
