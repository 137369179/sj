// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../../lib/auth-config";
import { db } from "../../../../../lib/db";
import { logger } from "../../../../../lib/logger";

vi.mock("../../../../../lib/auth-config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../../../../lib/db", () => ({
  db: {
    session: {
      update: vi.fn(),
    },
    userRoleMembership: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/auth/roles/active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the active role for the current session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "session_1" },
      user: { id: "user_1" },
    } as never);
    vi.mocked(db.userRoleMembership.findFirst).mockResolvedValue({
      id: "membership_1",
    } as never);
    vi.mocked(db.session.update).mockResolvedValue({ id: "session_1" } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/roles/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "organizer" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(logger.info).toHaveBeenCalledWith("Auth active role switched", {
      userId: "user_1",
      role: "organizer",
      sessionId: "session_1",
    });
  });
});
