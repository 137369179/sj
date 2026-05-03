// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

vi.mock("../../../../lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    userRoleMembership: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an audit log for a successful registration", async () => {
    vi.mocked(auth.api.signUpEmail).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "user_1" } as never);
    vi.mocked(db.userRoleMembership.upsert).mockResolvedValue({ id: "membership_1" } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Vendor",
          email: "vendor@example.com",
          password: "password123",
          role: "vendor",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(logger.info).toHaveBeenCalledWith("Auth registration succeeded", {
      email: "vendor@example.com",
      role: "vendor",
      userId: "user_1",
    });
  });
});
