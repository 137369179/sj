import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { POST } from "./route";

vi.mock("../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

describe("POST /api/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("uses vendor userId from session instead of request body when checking duplicates", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_session_1",
      role: "vendor"
    });
    const findFirstSpy = vi.spyOn(db.application, "findFirst").mockResolvedValue({
      id: "app_existing",
      marketId: "m1",
      vendorId: "vendor_session_1",
      status: "submitted",
      applicationNote: "主营手作咖啡",
      boothPreference: "靠近主通道",
      attachmentsJson: [],
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.findFirst>>);

    const request = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        marketId: "m1",
        vendorId: "vendor_body_1",
        boothPreference: "靠近主通道",
        applicationNote: "主营手作咖啡",
        attachments: []
      })
    });

    const response = await POST(request);

    expect(findFirstSpy).toHaveBeenCalledWith({
      where: {
        marketId: "m1",
        vendorId: "vendor_session_1"
      }
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: "duplicate application" });
  });

  it("creates an application with session vendorId and P0 fields", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_session_1",
      role: "vendor"
    });
    vi.spyOn(db.application, "findFirst").mockResolvedValue(null);
    const createSpy = vi.spyOn(db.application, "create").mockResolvedValue({
      id: "app_1",
      marketId: "m1",
      vendorId: "vendor_session_1",
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      attachmentsJson: [
        {
          url: "/uploads/license.pdf",
          originalName: "license.pdf"
        }
      ],
      status: "submitted",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.create>>);

    const request = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        marketId: "m1",
        vendorId: "vendor_body_1",
        boothPreference: "靠近主通道",
        applicationNote: "主营手作咖啡",
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
        vendorId: "vendor_session_1",
        boothPreference: "靠近主通道",
        applicationNote: "主营手作咖啡",
        attachmentsJson: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        status: "submitted"
      }
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "app_1",
      marketId: "m1",
      vendorId: "vendor_session_1",
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      attachmentsJson: [
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
