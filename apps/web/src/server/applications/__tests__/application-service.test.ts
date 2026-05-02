import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  ApplicationReviewError,
  buildApplicationPayload,
  buildApplicationReviewPayload,
  listOrganizerApplications,
  makeApplicationKey,
  reviewApplication
} from "../service";

describe("application service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a valid application payload", () => {
    const payload = buildApplicationPayload({
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
    });

    expect(payload.marketId).toBe("m1");
    expect(payload.vendorId).toBe("v1");
    expect(payload.boothPreference).toBe("靠近主通道");
    expect(payload.attachments).toEqual([
      {
        url: "/uploads/license.pdf",
        originalName: "license.pdf"
      }
    ]);
  });

  it("creates a deterministic idempotency key", () => {
    expect(makeApplicationKey("m1", "v1")).toBe("m1:v1");
  });

  it("builds a valid application review payload", () => {
    const payload = buildApplicationReviewPayload({
      organizerId: "org_1",
      decision: "approve",
      note: "  已录取，摊位后续通知  "
    });

    expect(payload).toEqual({
      organizerId: "org_1",
      decision: "approve",
      note: "已录取，摊位后续通知"
    });
  });

  it("lists organizer applications with market and vendor info", async () => {
    const findManySpy = vi.spyOn(db.application, "findMany").mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        vendorId: "vendor_1",
        status: "submitted",
        note: "主营手作咖啡",
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        market: {
          id: "market_1",
          title: "春日咖啡市集",
          city: "杭州"
        },
        vendor: {
          id: "vendor_1",
          name: "山野咖啡"
        }
      }
    ] as Awaited<ReturnType<typeof db.application.findMany>>);

    const applications = await listOrganizerApplications("org_1");

    expect(findManySpy).toHaveBeenCalledWith({
      where: {
        market: {
          organizerId: "org_1"
        }
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            city: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    expect(applications).toEqual([
      {
        id: "app_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        vendorId: "vendor_1",
        vendorName: "山野咖啡",
        status: "submitted",
        note: "主营手作咖啡",
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);
  });

  it("reviews an application and creates a notification", async () => {
    const findUniqueSpy = vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "submitted",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      market: {
        id: "market_1",
        organizerId: "org_1",
        title: "春日咖啡市集",
        city: "杭州"
      },
      vendor: {
        id: "vendor_1",
        name: "山野咖啡"
      }
    } as Awaited<ReturnType<typeof db.application.findUnique>>);
    const updateSpy = vi.spyOn(db.application, "update").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "approved",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.update>>);
    const notificationSpy = vi.spyOn(db.notification, "create").mockResolvedValue({
      id: "notice_1",
      userId: "vendor_1",
      title: "申请审核已通过",
      content: "你在春日咖啡市集的申请已审核通过。备注：已录取，摊位后续通知",
      readAt: null,
      createdAt: new Date("2026-05-01T01:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.create>>);

    const result = await reviewApplication({
      applicationId: "app_1",
      organizerId: "org_1",
      decision: "approve",
      note: "已录取，摊位后续通知"
    });

    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: {
        id: "app_1"
      },
      include: {
        market: {
          select: {
            id: true,
            organizerId: true,
            title: true,
            city: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: "app_1"
      },
      data: {
        status: "approved"
      }
    });
    expect(notificationSpy).toHaveBeenCalledWith({
      data: {
        userId: "vendor_1",
        title: "申请审核已通过",
        content: "你在春日咖啡市集的申请已审核通过。备注：已录取，摊位后续通知"
      }
    });
    expect(result.application.status).toBe("approved");
    expect(result.notification.userId).toBe("vendor_1");
  });

  it("rejects reviews for applications outside the organizer scope", async () => {
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "submitted",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      market: {
        id: "market_1",
        organizerId: "org_2",
        title: "春日咖啡市集",
        city: "杭州"
      },
      vendor: {
        id: "vendor_1",
        name: "山野咖啡"
      }
    } as Awaited<ReturnType<typeof db.application.findUnique>>);

    await expect(
      reviewApplication({
        applicationId: "app_1",
        organizerId: "org_1",
        decision: "reject",
        note: "资质与本场主题不匹配"
      })
    ).rejects.toMatchObject<ApplicationReviewError>({
      code: "FORBIDDEN"
    });
  });
});
