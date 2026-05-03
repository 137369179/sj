// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "./route";
import { auth } from "../../../../../../lib/auth-config";

vi.mock("../../../../../../lib/auth-config", () => ({
  auth: {
    api: {
      deletePasskey: vi.fn(),
    },
  },
}));

describe("DELETE /api/auth/passkeys/[passkeyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the selected passkey for the current user", async () => {
    vi.mocked(auth.api.deletePasskey).mockResolvedValue({ status: true } as never);

    const response = await DELETE(
      new Request("http://localhost/api/auth/passkeys/passkey_1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ passkeyId: "passkey_1" }),
      },
    );

    expect(auth.api.deletePasskey).toHaveBeenCalledWith({
      body: { id: "passkey_1" },
      headers: expect.any(Headers),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
