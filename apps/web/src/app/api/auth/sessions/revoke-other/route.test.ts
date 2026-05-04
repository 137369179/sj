// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../../lib/auth-config";

vi.mock("../../../../../lib/auth-config", () => ({
  auth: {
    api: {
      revokeOtherSessions: vi.fn(),
    },
  },
}));

describe("POST /api/auth/sessions/revoke-other", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes other active sessions", async () => {
    vi.mocked(auth.api.revokeOtherSessions).mockResolvedValue({
      status: true,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/sessions/revoke-other", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
