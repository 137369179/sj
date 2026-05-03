import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { PATCH } from "./route";

vi.mock("../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

describe("PATCH /api/applications/[applicationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("updates a vendor application when supplement review is currently required", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_2",
      marketId: "market_1",
      vendorId: "vendor_1",
      note: "主营手作咖啡",
      boothPreference: "旧偏好",
      applicationNote: "旧备注",
      reviewNote: "请补充近三次摆摊照片",
      attachmentsJson: [],
      status: "under_review",
      reviewedAt: new Date("2026-05-01T00:00:00.000Z"),
      reviewedByUserId: "org_1",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_3",
          applicationId: "app_2",
          organizerId: "org_1",
          decision: "supplement",
          reviewNote: "请补充近三次摆摊照片",
          createdAt: new Date("2026-05-02T09:00:00.000Z")
        }
      ]
    } as never);
    const updateSpy = vi.spyOn(db.application, "update").mockResolvedValue({
      id: "app_2",
      marketId: "market_1",
      vendorId: "vendor_1",
      note: "主营手作咖啡",
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      reviewNote: "请补充近三次摆摊照片",
      attachmentsJson: [
        {
          url: "/uploads/license.pdf",
          originalName: "license.pdf"
        }
      ],
      status: "under_review",
      reviewedAt: new Date("2026-05-01T00:00:00.000Z"),
      reviewedByUserId: "org_1",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as never);

    const request = new Request("http://localhost/api/applications/app_2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
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

    const response = await PATCH(request, {
      params: Promise.resolve({ applicationId: "app_2" })
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: "app_2"
      },
      data: {
        boothPreference: "靠近主通道",
        applicationNote: "主营手作咖啡",
        attachmentsJson: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        status: "under_review"
      }
    });
    expect(response.status).toBe(200);
  });

  it("rejects supplement updates when the latest review is not supplement", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_2",
      marketId: "market_1",
      vendorId: "vendor_1",
      note: "主营手作咖啡",
      boothPreference: "旧偏好",
      applicationNote: "旧备注",
      reviewNote: "当前先列入候补名单",
      attachmentsJson: [],
      status: "under_review",
      reviewedAt: new Date("2026-05-01T00:00:00.000Z"),
      reviewedByUserId: "org_1",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_4",
          applicationId: "app_2",
          organizerId: "org_1",
          decision: "waitlist",
          reviewNote: "当前先列入候补名单",
          createdAt: new Date("2026-05-02T09:00:00.000Z")
        }
      ]
    } as never);

    const request = new Request("http://localhost/api/applications/app_2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        boothPreference: "靠近主通道",
        applicationNote: "主营手作咖啡",
        attachments: []
      })
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ applicationId: "app_2" })
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "supplement unavailable"
    });
  });
});
