// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      requestPasswordReset: vi.fn(),
    },
  },
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests a password reset email", async () => {
    vi.mocked(auth.api.requestPasswordReset).mockResolvedValue({
      status: true,
      message: "ok",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
