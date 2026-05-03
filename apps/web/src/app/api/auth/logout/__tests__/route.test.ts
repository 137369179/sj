import { describe, expect, it } from "vitest";
import { POST } from "../route";

describe("POST /api/auth/logout", () => {
  it("deletes the session cookies and returns success", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toContain("mrp_session=;");
  });
});