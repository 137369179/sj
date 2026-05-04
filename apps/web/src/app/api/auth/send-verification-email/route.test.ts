// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { auth } from "../../../../lib/auth-config";

vi.mock("../../../../lib/auth-config", () => ({
  auth: {
    api: {
      sendVerificationEmail: vi.fn(),
    },
  },
}));

describe("POST /api/auth/send-verification-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resends a verification email", async () => {
    vi.mocked(auth.api.sendVerificationEmail).mockResolvedValue({
      status: true,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/send-verification-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
