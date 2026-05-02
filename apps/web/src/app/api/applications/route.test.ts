import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import { POST } from "./route";

describe("POST /api/applications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects duplicate applications", async () => {
    vi.spyOn(db.application, "findFirst").mockResolvedValue({
      id: "app_existing",
      marketId: "m1",
      vendorId: "v1",
      status: "submitted",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.findFirst>>);

    const request = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        marketId: "m1",
        vendorId: "v1",
        boothPreference: "靠近主通道",
        note: "主营手作咖啡",
        attachments: []
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: "duplicate application" });
  });

  it("creates an application from a JSON body", async () => {
    vi.spyOn(db.application, "findFirst").mockResolvedValue(null);
    const createSpy = vi.spyOn(db.application, "create").mockResolvedValue({
      id: "app_1",
      marketId: "m1",
      vendorId: "v1",
      status: "submitted",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.create>>);

    const request = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        marketId: "m1",
        vendorId: "v1",
        boothPreference: "靠近主通道",
        note: "主营手作咖啡",
        attachments: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ]
      })
    });

    const response = await POST(request);

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        marketId: "m1",
        vendorId: "v1",
        note: "主营手作咖啡",
        status: "submitted"
      }
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "app_1",
      marketId: "m1",
      vendorId: "v1",
      boothPreference: "靠近主通道",
      note: "主营手作咖啡",
      attachments: [
        {
          url: "/uploads/license.pdf",
          originalName: "license.pdf"
        }
      ],
      status: "submitted",
      createdAt: "2026-05-01T00:00:00.000Z"
    });
  });
});
