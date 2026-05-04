// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "./route";
import { auth } from "../../../../../lib/auth-config";
import { db } from "../../../../../lib/db";

vi.mock("../../../../../lib/auth-config", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      revokeSession: vi.fn(),
    },
  },
}));

vi.mock("../../../../../lib/db", () => ({
  db: {
    session: {
      findFirst: vi.fn(),
    },
  },
}));

describe("DELETE /api/auth/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes a single session owned by the current user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "current_session" },
      user: { id: "user_1" },
    } as never);
    vi.mocked(db.session.findFirst).mockResolvedValue({
      id: "session_2",
      token: "session_token_2",
    } as never);
    vi.mocked(auth.api.revokeSession).mockResolvedValue({ status: true } as never);

    const response = await DELETE(
      new Request("http://localhost/api/auth/sessions/session_2", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ sessionId: "session_2" }),
      },
    );

    expect(db.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: "session_2",
        userId: "user_1",
      },
      select: {
        id: true,
        token: true,
      },
    });
    expect(auth.api.revokeSession).toHaveBeenCalledWith({
      body: { token: "session_token_2" },
      headers: expect.any(Headers),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
