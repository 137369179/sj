// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { POST } from "../../../app/api/auth/login/route";
import { auth } from "../../../lib/auth-config";
import { getSessionRole, getSessionUser, createSessionToken, verifySessionToken } from "../../../lib/auth";
import { requireRoleMembership } from "../../../lib/auth-guards";
import { db } from "../../../lib/db";
import { canAccessRoute } from "../../../lib/roles";
import { middleware } from "../../../middleware";

vi.mock("next/headers", () => ({
  cookies: vi.fn()
}));

vi.mock("../../../lib/db", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

vi.mock("../../../lib/auth-config", () => ({
  auth: {
    api: {
      signInEmail: vi.fn()
    }
  }
}));

describe("canAccessRoute", () => {
  it("allows organizer into organizer area", () => {
    expect(canAccessRoute("organizer", "/organizer/markets")).toBe(true);
  });

  it("blocks vendor from organizer area", () => {
    expect(canAccessRoute("vendor", "/organizer/markets")).toBe(false);
  });
});

describe("requireRoleMembership", () => {
  it("throws when the user does not have the requested role", () => {
    expect(() =>
      requireRoleMembership(
        {
          userId: "user_1",
          roles: ["vendor"],
          activeRole: "vendor",
          role: "vendor",
        },
        "organizer"
      )
    ).toThrow("forbidden");
  });
});

describe("getSessionRole", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
  });

  it("returns the session role from cookies", async () => {
    const token = await createSessionToken("admin_1", "admin");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === "mrp_session" ? { name, value: token } : undefined
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(getSessionRole()).resolves.toBe("admin");
  });

  it("returns null for an unsupported role", async () => {
    const token = await createSessionToken("guest_1", "guest" as any);
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ name: "mrp_session", value: token })
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(getSessionRole()).resolves.toBeNull();
  });
});

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
  });

  it("returns both userId and role from cookies", async () => {
    const token = await createSessionToken("vendor_1", "vendor");
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === "mrp_session" ? { name, value: token } : undefined
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(getSessionUser()).resolves.toEqual({
      userId: "vendor_1",
      role: "vendor",
      roles: ["vendor"],
      activeRole: "vendor"
    });
  });

  it("returns null when cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(getSessionUser()).resolves.toBeNull();
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the compatibility session cookie for a valid email login", async () => {
    vi.mocked(auth.api.signInEmail).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "better-auth.session_token=session-token; Path=/; HttpOnly; SameSite=Lax"
        }
      }) as never
    );
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "db_vendor_1",
      role: "vendor",
      roleMemberships: [{ role: "vendor" }]
    } as any);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: "vendor1@example.com", password: "StrongPassword!23" })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(auth.api.signInEmail).toHaveBeenCalled();
    
    const token = response.cookies.get("mrp_session")?.value;
    expect(token).toBeDefined();
    
    const payload = await verifySessionToken(token as string);
    expect(payload?.role).toBe("vendor");
    expect(payload?.userId).toBe("db_vendor_1");
  });

  it("rejects an invalid login payload", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: "", password: "" })
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "invalid login payload" });
  });

  it("returns the auth error response when Better Auth rejects the login", async () => {
    vi.mocked(auth.api.signInEmail).mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid email or password" }), {
        status: 401,
        headers: {
          "content-type": "application/json"
        }
      }) as never
    );

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: "unknown@example.com", password: "bad-password" })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Invalid email or password" });
  });

  it("returns service unavailable when login identity lookup fails", async () => {
    vi.mocked(auth.api.signInEmail).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }) as never
    );
    vi.mocked(db.user.findUnique).mockRejectedValue(new Error("database unavailable"));

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: "vendor1@example.com", password: "StrongPassword!23" })
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "service unavailable" });
  });
});

describe("middleware", () => {
  it("redirects anonymous visitors to login for organizer routes", async () => {
    const request = new NextRequest("http://localhost/organizer/markets");

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?returnTo=%2Forganizer%2Fmarkets"
    );
  });

  it("redirects a vendor away from organizer routes", async () => {
    const token = await createSessionToken("vendor_1", "vendor");
    const request = new NextRequest("http://localhost/organizer/markets", {
      headers: {
        cookie: `mrp_session=${token}`
      }
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  it("preserves the forwarded host when redirecting blocked navigation", async () => {
    const token = await createSessionToken("vendor_1", "vendor");
    const request = new NextRequest("http://localhost:3002/organizer/markets", {
      headers: {
        cookie: `mrp_session=${token}`,
        "x-forwarded-host": "127.0.0.1:3002",
        "x-forwarded-proto": "http"
      }
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:3002/");
  });
});
