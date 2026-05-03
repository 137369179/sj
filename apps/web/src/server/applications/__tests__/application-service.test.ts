import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  ApplicationReviewError,
  buildApplicationPayload,
  buildApplicationReviewPayload,
  listOrganizerApplications,
  listVendorApplications,
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
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      attachments: [
        {
          url: "/uploads/license.pdf",
          originalName: "license.pdf"
        }
      ]
    });

    expect(payload.marketId).toBe("m1");
    expect(payload.boothPreference).toBe("靠近主通道");
    expect(payload.applicationNote).toBe("主营手作咖啡");
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
      reviewNote: "  已录取，摊位后续通知  "
    });

    expect(payload).toEqual({
      organizerId: "org_1",
      decision: "approve",
      reviewNote: "已录取，摊位后续通知"
    });
  });

  it("accepts reviewNote instead of legacy note", () => {
    const payload = buildApplicationReviewPayload({
      organizerId: "org_1",
      decision: "approve",
      reviewNote: "资质完整，允许进入分配"
    });

    expect(payload.reviewNote).toBe("资质完整，允许进入分配");
  });

  it("lists organizer applications with market, vendor, and split note semantics", async () => {
    const findManySpy = vi.spyOn(db.application, "findMany").mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        vendorId: "vendor_1",
        status: "submitted",
        note: "主营手作咖啡",
        applicationNote: null,
        reviewNote: null,
        reviewedAt: null,
        reviews: [],
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
    ] as unknown as Awaited<ReturnType<typeof db.application.findMany>>);

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
        },
        reviews: {
          select: {
            id: true,
            applicationId: true,
            organizerId: true,
            decision: true,
            reviewNote: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
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
        applicationNote: "主营手作咖啡",
        attachments: [],
        reviewedAt: null,
        reviews: [],
        reviewNote: null,
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      }
    ]);
  });

  it("lists vendor applications with split notes and assigned stall result", async () => {
    const findManySpy = vi.spyOn(db.application, "findMany").mockResolvedValue([
      {
        id: "app_1",
        marketId: "market_1",
        vendorId: "vendor_1",
        status: "stall_assigned",
        note: "主营手作咖啡",
        applicationNote: null,
        reviewNote: null,
        attachmentsJson: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        reviews: [
          {
            id: "review_2",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "复核通过",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "首轮资料不完整",
            createdAt: new Date("2026-05-02T08:30:00.000Z")
          }
        ],
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        market: {
          id: "market_1",
          title: "春日咖啡市集",
          city: "杭州"
        },
        assignedStall: {
          id: "stall_1",
          code: "A-01",
          name: "主通道 1 号位"
        }
      }
    ] as unknown as Awaited<ReturnType<typeof db.application.findMany>>);

    const applications = await listVendorApplications("vendor_1");

    expect(findManySpy).toHaveBeenCalledWith({
      where: {
        vendorId: "vendor_1"
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            city: true
          }
        },
        assignedStall: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        reviews: {
          select: {
            id: true,
            applicationId: true,
            organizerId: true,
            decision: true,
            reviewNote: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
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
        status: "stall_assigned",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        attachments: [
          {
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }
        ],
        reviews: [
          {
            id: "review_2",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "复核通过",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "首轮资料不完整",
            createdAt: new Date("2026-05-02T08:30:00.000Z")
          }
        ],
        reviewNote: null,
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: "stall_1",
        assignedStallCode: "A-01",
        assignedStallName: "主通道 1 号位"
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
    } as unknown as Awaited<ReturnType<typeof db.application.findUnique>>);
    const updateSpy = vi.spyOn(db.application, "update").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "approved",
      note: "主营手作咖啡",
      reviewNote: "已录取，摊位后续通知",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      reviewedByUserId: "org_1",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.update>>);
    const reviewCreateSpy = vi
      .spyOn(db.applicationReview, "create")
      .mockResolvedValue({
        id: "review_1",
        applicationId: "app_1",
        organizerId: "org_1",
        decision: "approve",
        reviewNote: "已录取，摊位后续通知",
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      } as never);
    const transactionSpy = vi
      .spyOn(db, "$transaction")
      .mockImplementation(async (callback) => {
        if (typeof callback !== "function") {
          throw new Error("expected interactive transaction");
        }

        return callback(db);
      });
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
      reviewNote: "已录取，摊位后续通知"
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
        },
        reviews: {
          select: {
            id: true,
            applicationId: true,
            organizerId: true,
            decision: true,
            reviewNote: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });
    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: "app_1"
      },
      data: {
        status: "approved",
        reviewNote: "已录取，摊位后续通知",
        reviewedAt: expect.any(Date),
        reviewedByUserId: "org_1"
      }
    });
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(reviewCreateSpy).toHaveBeenCalledWith({
      data: {
        applicationId: "app_1",
        organizerId: "org_1",
        decision: "approve",
        reviewNote: "已录取，摊位后续通知"
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
    expect(result.review.id).toBe("review_1");
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
    } as unknown as Awaited<ReturnType<typeof db.application.findUnique>>);

    await expect(
      reviewApplication({
        applicationId: "app_1",
        organizerId: "org_1",
        decision: "reject",
        reviewNote: "资质与本场主题不匹配"
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
