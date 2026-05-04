// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      resetPassword: vi.fn(),
    },
  },
}));

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets the password using the token", async () => {
    vi.mocked(auth.api.resetPassword).mockResolvedValue({
      status: true,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "token_123", newPassword: "NewStrongPassword!23" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
