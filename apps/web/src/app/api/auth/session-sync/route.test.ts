// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";
import { verifySessionToken } from "../../../../lib/auth";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../../../lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /api/auth/session-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the compatibility session cookie from a Better Auth session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: "user_1",
      },
      session: {},
    } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "organizer",
      roleMemberships: [{ role: "organizer" }],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/session-sync", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const token = response.cookies.get("mrp_session")?.value;
    expect(token).toBeDefined();
    await expect(verifySessionToken(token as string)).resolves.toMatchObject({
      userId: "user_1",
      role: "organizer",
    });
  });

  it("returns 401 when there is no Better Auth session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);

    const response = await POST(
      new Request("http://localhost/api/auth/session-sync", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "unauthenticated" });
  });
});
