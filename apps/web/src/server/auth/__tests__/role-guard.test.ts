// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { POST } from "../../../app/api/auth/login/route";
import { getSessionRole, getSessionUser, createSessionToken, verifySessionToken } from "../../../lib/auth";
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
      findMany: vi.fn()
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
      role: "vendor"
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

  it("sets the session cookie for a valid payload", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: "db_vendor_1",
        role: "vendor"
      }
    ] as any);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ role: "vendor", userId: "vendor_1" })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    
    const token = response.cookies.get("mrp_session")?.value;
    expect(token).toBeDefined();
    
    const payload = await verifySessionToken(token as string);
    expect(payload?.role).toBe("vendor");
    expect(payload?.userId).toBe("db_vendor_1");
  });

  it("rejects an invalid session payload", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ role: "guest", userId: "" })
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "invalid session payload" });
  });

  it("rejects a login request when the user does not exist", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ role: "vendor", userId: "nonexistent_vendor" })
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "user not found" });
  });

  it("returns service unavailable when login identity lookup fails", async () => {
    vi.mocked(db.user.findFirst).mockRejectedValue(new Error("database unavailable"));

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ role: "vendor", userId: "vendor_1" })
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "service unavailable" });
  });
});

describe("middleware", () => {
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
