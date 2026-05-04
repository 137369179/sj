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
    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
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

  it("falls back to demo login when role lookup is unavailable and demo login is enabled", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    vi.mocked(auth.api.signInEmail).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as never,
    );
    vi.mocked(db.user.findUnique).mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "vendor@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, mode: "demo" });
    expect(response.headers.get("set-cookie")).toContain("mrp_session=");
    expect(logger.info).toHaveBeenCalledWith("Auth login succeeded", {
      email: "vendor@example.com",
      userId: "vendor_1",
      activeRole: "vendor",
      mode: "demo",
    });
  });

  it("falls back to demo login when Better Auth is unavailable and demo login is enabled", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    vi.mocked(auth.api.signInEmail).mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "organizer@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, mode: "demo" });
    expect(response.headers.get("set-cookie")).toContain("mrp_session=");
    expect(logger.info).toHaveBeenCalledWith("Auth login succeeded", {
      email: "organizer@example.com",
      userId: "organizer_1",
      activeRole: "organizer",
      mode: "demo",
    });
  });

  it("skips Better Auth and role lookup for demo users when demo login is enabled", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "organizer@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, mode: "demo" });
    expect(vi.mocked(auth.api.signInEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(db.user.findUnique)).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("mrp_session=");
  });
});
