// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";
import { db } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      signInEmail: vi.fn(),
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

vi.mock("../../../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an audit log for a successful login", async () => {
    vi.mocked(auth.api.signInEmail).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as never,
    );
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "vendor",
      roleMemberships: [{ role: "vendor" }],
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "vendor@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(logger.info).toHaveBeenCalledWith("Auth login succeeded", {
      email: "vendor@example.com",
      userId: "user_1",
      activeRole: "vendor",
    });
  });
});
