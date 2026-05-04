import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  ApplicationReviewError,
  buildApplicationPayload,
  buildApplicationReviewPayload,
  declineWaitlistOffer,
  expireWaitlistOffer,
  confirmWaitlistOffer,
  listOrganizerApplications,
  listVendorApplications,
  makeApplicationKey,
  sendApplicationFollowUp,
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

  it("accepts supplement as a structured review action", () => {
    const payload = buildApplicationReviewPayload({
      organizerId: "org_1",
      decision: "supplement",
      reviewNote: "请补充近三次摆摊照片"
    });

    expect(payload).toEqual({
      organizerId: "org_1",
      decision: "supplement",
      reviewNote: "请补充近三次摆摊照片"
    });
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
        latestReviewDecision: null,
        followUpState: "idle",
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

  it("maps supplement and waitlist reviews into organizer follow-up states", async () => {
    vi.spyOn(db.application, "findMany").mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        vendorId: "vendor_1",
        status: "under_review",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "请补充近三次摆摊照片",
        attachmentsJson: [],
        reviewedAt: new Date("2026-05-01T06:00:00.000Z"),
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        reviews: [
          {
            id: "review_3",
            applicationId: "app_2",
            organizerId: "org_1",
            decision: "supplement",
            reviewNote: "请补充近三次摆摊照片",
            createdAt: new Date("2026-05-01T06:00:00.000Z")
          }
        ],
        market: {
          id: "market_2",
          organizerId: "org_1",
          title: "夏夜面包市集",
          city: "上海"
        },
        vendor: {
          id: "vendor_1",
          name: "山野咖啡"
        }
      },
      {
        id: "app_3",
        marketId: "market_3",
        vendorId: "vendor_2",
        status: "under_review",
        note: "主营烘焙",
        applicationNote: "主营烘焙",
        reviewNote: "先列入候补观察",
        attachmentsJson: [],
        reviewedAt: new Date("2026-05-01T00:00:00.000Z"),
        createdAt: new Date("2026-05-01T01:00:00.000Z"),
        reviews: [
          {
            id: "review_4",
            applicationId: "app_3",
            organizerId: "org_1",
            decision: "waitlist",
            reviewNote: "先列入候补观察",
            createdAt: new Date("2026-05-01T00:00:00.000Z")
          }
        ],
        market: {
          id: "market_3",
          organizerId: "org_1",
          title: "秋日手作市集",
          city: "南京"
        },
        vendor: {
          id: "vendor_2",
          name: "木野手作"
        }
      }
    ] as unknown as Awaited<ReturnType<typeof db.application.findMany>>);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    const applications = await listOrganizerApplications("org_1");

    const supplementApplication = applications.find((application) => application.id === "app_2");
    const waitlistApplication = applications.find((application) => application.id === "app_3");

    expect(waitlistApplication?.latestReviewDecision).toBe("waitlist");
    expect(waitlistApplication?.followUpState).toBe("urgent");
    expect(supplementApplication?.latestReviewDecision).toBe("supplement");
    expect(supplementApplication?.followUpState).toBe("urgent");

    vi.useRealTimers();
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
        },
        order: null
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
        },
        assignedStall: {
          select: {
            id: true,
            code: true,
            name: true,
            price: true
          }
        },
        order: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            paidAt: true
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
        taskGroup: "done",
        latestReviewDecision: "approve",
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
        assignedStallName: "主通道 1 号位",
        assignedStallPrice: null,
        orderId: null,
        orderAmount: null,
        orderStatus: null,
        orderPaymentMethod: null,
        orderCreatedAt: null,
        orderPaidAt: null
      }
    ]);
  });

  it("maps supplement reviews back to pending vendor actions", async () => {
    vi.spyOn(db.application, "findMany").mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_2",
        vendorId: "vendor_1",
        status: "under_review",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "请补充近三次摆摊照片",
        reviewedAt: new Date("2026-05-02T08:30:00.000Z"),
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
        ],
        market: {
          id: "market_2",
          title: "夏夜面包市集",
          city: "上海"
        },
        assignedStall: null,
        order: null
      }
    ] as unknown as Awaited<ReturnType<typeof db.application.findMany>>);

    const [application] = await listVendorApplications("vendor_1");

    expect(application.taskGroup).toBe("pending-action");
    expect(application.latestReviewDecision).toBe("supplement");
  });

  it("returns an empty vendor application list when demo login is enabled and the database is unavailable", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    vi.spyOn(db.application, "findMany").mockRejectedValue(new Error("database unavailable"));

    await expect(listVendorApplications("vendor_1")).resolves.toEqual([]);

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
  });

  it("returns an empty organizer application list when demo login is enabled and the database is unavailable", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    vi.spyOn(db.application, "findMany").mockRejectedValue(new Error("database unavailable"));

    await expect(listOrganizerApplications("organizer_1")).resolves.toEqual([]);

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
  });

  it("skips database access for demo vendor application requests", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    const findManySpy = vi.spyOn(db.application, "findMany");

    await expect(listVendorApplications("vendor_1")).resolves.toEqual([]);
    expect(findManySpy).not.toHaveBeenCalled();

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
  });

  it("skips database access for demo organizer application requests", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    const findManySpy = vi.spyOn(db.application, "findMany");

    await expect(listOrganizerApplications("organizer_1")).resolves.toEqual([]);
    expect(findManySpy).not.toHaveBeenCalled();

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
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

  it("moves an application into under_review when organizer requests supplement", async () => {
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_2",
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
      id: "app_2",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "under_review",
      note: "主营手作咖啡",
      reviewNote: "请补充近三次摆摊照片",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      reviewedByUserId: "org_1",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.update>>);
    const reviewCreateSpy = vi
      .spyOn(db.applicationReview, "create")
      .mockResolvedValue({
        id: "review_2",
        applicationId: "app_2",
        organizerId: "org_1",
        decision: "supplement",
        reviewNote: "请补充近三次摆摊照片",
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      } as never);
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      if (typeof callback !== "function") {
        throw new Error("expected interactive transaction");
      }

      return callback(db);
    });
    const notificationSpy = vi.spyOn(db.notification, "create").mockResolvedValue({
      id: "notice_2",
      userId: "vendor_1",
      title: "申请需要补充资料",
      content: "你在春日咖啡市集的申请需要补充资料后继续审核。备注：请补充近三次摆摊照片",
      readAt: null,
      createdAt: new Date("2026-05-01T01:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.create>>);

    const result = await reviewApplication({
      applicationId: "app_2",
      organizerId: "org_1",
      decision: "supplement",
      reviewNote: "请补充近三次摆摊照片"
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: {
        id: "app_2"
      },
      data: {
        status: "under_review",
        reviewNote: "请补充近三次摆摊照片",
        reviewedAt: expect.any(Date),
        reviewedByUserId: "org_1"
      }
    });
    expect(reviewCreateSpy).toHaveBeenCalledWith({
      data: {
        applicationId: "app_2",
        organizerId: "org_1",
        decision: "supplement",
        reviewNote: "请补充近三次摆摊照片"
      }
    });
    expect(notificationSpy).toHaveBeenCalledWith({
      data: {
        userId: "vendor_1",
        title: "申请需要补充资料",
        content: "你在春日咖啡市集的申请需要补充资料后继续审核。备注：请补充近三次摆摊照片"
      }
    });
    expect(result.application.status).toBe("under_review");
    expect(result.review.decision).toBe("supplement");
  });

  it("sends a supplement reminder notification for organizer follow-up", async () => {
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_2",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "under_review",
      note: "主营手作咖啡",
      applicationNote: "主营手作咖啡",
      reviewNote: "请补充近三次摆摊照片",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_2",
          applicationId: "app_2",
          organizerId: "org_1",
          decision: "supplement",
          reviewNote: "请补充近三次摆摊照片",
          createdAt: new Date("2026-05-01T01:00:00.000Z")
        }
      ],
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
    const notificationSpy = vi.spyOn(db.notification, "create").mockResolvedValue({
      id: "notice_follow_1",
      userId: "vendor_1",
      title: "补件进度提醒",
      content:
        "主办方提醒你尽快完成春日咖啡市集的补件要求，以免错过本轮审核。备注：请补充近三次摆摊照片",
      readAt: null,
      createdAt: new Date("2026-05-03T10:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.create>>);

    const result = await sendApplicationFollowUp({
      applicationId: "app_2",
      organizerId: "org_1",
      action: "supplement_reminder"
    });

    expect(notificationSpy).toHaveBeenCalledWith({
      data: {
        userId: "vendor_1",
        title: "补件进度提醒",
        content:
          "主办方提醒你尽快完成春日咖啡市集的补件要求，以免错过本轮审核。备注：请补充近三次摆摊照片"
      }
    });
    expect(result.action).toBe("supplement_reminder");
  });

  it("rejects follow-up notifications when the application is not in a compatible state", async () => {
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_3",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "approved",
      note: "主营手作咖啡",
      applicationNote: "主营手作咖啡",
      reviewNote: "已通过",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_3",
          applicationId: "app_3",
          organizerId: "org_1",
          decision: "approve",
          reviewNote: "已通过",
          createdAt: new Date("2026-05-01T01:00:00.000Z")
        }
      ],
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

    await expect(
      sendApplicationFollowUp({
        applicationId: "app_3",
        organizerId: "org_1",
        action: "waitlist_confirmation"
      })
    ).rejects.toMatchObject({
      code: "INVALID_STATUS"
    });
  });

  it("confirms a waitlist offer from vendor notification and reopens the application as approved", async () => {
    vi.spyOn(db.notification, "findUnique").mockResolvedValue({
      id: "n_waitlist_1",
      userId: "vendor_1",
      title: "候补补位通知",
      content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。",
      readAt: null,
      createdAt: new Date("2026-05-03T10:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.findUnique>>);
    vi.spyOn(db.application, "findFirst").mockResolvedValue({
      id: "app_9",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "under_review",
      note: "主营手作咖啡",
      applicationNote: "主营手作咖啡",
      reviewNote: "先列入候补观察",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_waitlist_1",
          applicationId: "app_9",
          organizerId: "org_1",
          decision: "waitlist",
          reviewNote: "先列入候补观察",
          createdAt: new Date("2026-05-01T01:00:00.000Z")
        }
      ],
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
    } as unknown as Awaited<ReturnType<typeof db.application.findFirst>>);
    const applicationUpdateSpy = vi.fn().mockResolvedValue({
      id: "app_9",
      status: "approved"
    });
    const reviewCreateSpy = vi.fn().mockResolvedValue({
      id: "review_approve_1",
      applicationId: "app_9",
      organizerId: "org_1",
      decision: "approve",
      reviewNote: "摊主已确认候补补位",
      createdAt: new Date("2026-05-03T12:00:00.000Z")
    });
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) =>
      callback({
        application: { update: applicationUpdateSpy },
        applicationReview: { create: reviewCreateSpy },
        notification: { update: vi.fn() }
      } as never)
    );
    const notificationUpdateSpy = vi.spyOn(db.notification, "update").mockResolvedValue({
      id: "n_waitlist_1",
      userId: "vendor_1",
      title: "候补补位通知",
      content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。",
      readAt: new Date("2026-05-03T12:00:00.000Z"),
      createdAt: new Date("2026-05-03T10:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.update>>);

    const result = await confirmWaitlistOffer({
      notificationId: "n_waitlist_1",
      userId: "vendor_1"
    });

    expect(applicationUpdateSpy).toHaveBeenCalledWith({
      where: { id: "app_9" },
      data: {
        status: "approved",
        reviewNote: "摊主已确认候补补位",
        reviewedAt: expect.any(Date),
        reviewedByUserId: "org_1"
      }
    });
    expect(reviewCreateSpy).toHaveBeenCalledWith({
      data: {
        applicationId: "app_9",
        organizerId: "org_1",
        decision: "approve",
        reviewNote: "摊主已确认候补补位"
      }
    });
    expect(notificationUpdateSpy).toHaveBeenCalledWith({
      where: { id: "n_waitlist_1" },
      data: { readAt: expect.any(Date) }
    });
    expect(result.application.status).toBe("approved");
    expect(result.review.reviewNote).toBe("摊主已确认候补补位");
  });

  it("declines a waitlist offer from vendor notification and closes the application as rejected", async () => {
    vi.spyOn(db.notification, "findUnique").mockResolvedValue({
      id: "n_waitlist_2",
      userId: "vendor_1",
      title: "候补补位通知",
      content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。",
      readAt: null,
      createdAt: new Date("2026-05-03T10:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.findUnique>>);
    vi.spyOn(db.application, "findFirst").mockResolvedValue({
      id: "app_10",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "under_review",
      note: "主营手作咖啡",
      applicationNote: "主营手作咖啡",
      reviewNote: "先列入候补观察",
      reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_waitlist_2",
          applicationId: "app_10",
          organizerId: "org_1",
          decision: "waitlist",
          reviewNote: "先列入候补观察",
          createdAt: new Date("2026-05-01T01:00:00.000Z")
        }
      ],
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
    } as unknown as Awaited<ReturnType<typeof db.application.findFirst>>);
    const applicationUpdateSpy = vi.fn().mockResolvedValue({
      id: "app_10",
      status: "rejected"
    });
    const reviewCreateSpy = vi.fn().mockResolvedValue({
      id: "review_reject_1",
      applicationId: "app_10",
      organizerId: "org_1",
      decision: "reject",
      reviewNote: "摊主已放弃候补补位",
      createdAt: new Date("2026-05-03T12:00:00.000Z")
    });
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) =>
      callback({
        application: { update: applicationUpdateSpy },
        applicationReview: { create: reviewCreateSpy },
        notification: { update: vi.fn() }
      } as never)
    );
    const notificationUpdateSpy = vi.spyOn(db.notification, "update").mockResolvedValue({
      id: "n_waitlist_2",
      userId: "vendor_1",
      title: "候补补位通知",
      content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。",
      readAt: new Date("2026-05-03T12:00:00.000Z"),
      createdAt: new Date("2026-05-03T10:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.update>>);

    const result = await declineWaitlistOffer({
      notificationId: "n_waitlist_2",
      userId: "vendor_1"
    });

    expect(applicationUpdateSpy).toHaveBeenCalledWith({
      where: { id: "app_10" },
      data: {
        status: "rejected",
        reviewNote: "摊主已放弃候补补位",
        reviewedAt: expect.any(Date),
        reviewedByUserId: "org_1"
      }
    });
    expect(reviewCreateSpy).toHaveBeenCalledWith({
      data: {
        applicationId: "app_10",
        organizerId: "org_1",
        decision: "reject",
        reviewNote: "摊主已放弃候补补位"
      }
    });
    expect(notificationUpdateSpy).toHaveBeenCalledWith({
      where: { id: "n_waitlist_2" },
      data: { readAt: expect.any(Date) }
    });
    expect(result.application.status).toBe("rejected");
    expect(result.review.reviewNote).toBe("摊主已放弃候补补位");
  });

  it("expires a waitlist offer when organizer releases an overdue slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_11",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "under_review",
      note: "主营手作咖啡",
      applicationNote: "主营手作咖啡",
      reviewNote: "先列入候补观察",
      reviewedAt: new Date("2026-04-30T10:00:00.000Z"),
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      reviews: [
        {
          id: "review_waitlist_3",
          applicationId: "app_11",
          organizerId: "org_1",
          decision: "waitlist",
          reviewNote: "先列入候补观察",
          createdAt: new Date("2026-04-30T10:00:00.000Z")
        }
      ],
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
    const applicationUpdateSpy = vi.fn().mockResolvedValue({
      id: "app_11",
      status: "rejected"
    });
    const reviewCreateSpy = vi.fn().mockResolvedValue({
      id: "review_reject_2",
      applicationId: "app_11",
      organizerId: "org_1",
      decision: "reject",
      reviewNote: "候补补位超时未确认，已释放名额",
      createdAt: new Date("2026-05-03T12:00:00.000Z")
    });
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) =>
      callback({
        application: { update: applicationUpdateSpy },
        applicationReview: { create: reviewCreateSpy }
      } as never)
    );

    const result = await expireWaitlistOffer({
      applicationId: "app_11",
      organizerId: "org_1"
    });

    expect(applicationUpdateSpy).toHaveBeenCalledWith({
      where: { id: "app_11" },
      data: {
        status: "rejected",
        reviewNote: "候补补位超时未确认，已释放名额",
        reviewedAt: expect.any(Date),
        reviewedByUserId: "org_1"
      }
    });
    expect(reviewCreateSpy).toHaveBeenCalledWith({
      data: {
        applicationId: "app_11",
        organizerId: "org_1",
        decision: "reject",
        reviewNote: "候补补位超时未确认，已释放名额"
      }
    });
    expect(result.application.status).toBe("rejected");
    vi.useRealTimers();
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
