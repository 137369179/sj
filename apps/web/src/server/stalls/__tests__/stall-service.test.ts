import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  StallAssignmentError,
  StallCreationError,
  assignStall,
  buildAssignStallPayload,
  buildStallPayload,
  canAssignStall,
  createStall,
  listOrganizerStalls
} from "../service";

describe("stall service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a valid stall payload with active default", () => {
    const payload = buildStallPayload({
      organizerId: "org_1",
      marketId: "market_1",
      code: " A-01 ",
      name: " 主通道 1 号位 "
    });

    expect(payload).toEqual({
      organizerId: "org_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true
    });
  });

  it("builds a valid stall assignment payload", () => {
    const payload = buildAssignStallPayload({
      organizerId: "org_1",
      applicationId: "app_1"
    });

    expect(payload).toEqual({
      organizerId: "org_1",
      applicationId: "app_1"
    });
  });

  it("allows assignment when stall is active and unassigned", () => {
    expect(
      canAssignStall({
        isActive: true,
        assignedApplicationId: null
      })
    ).toBe(true);
  });

  it("blocks assignment when stall is already taken", () => {
    expect(
      canAssignStall({
        isActive: true,
        assignedApplicationId: "app_1"
      })
    ).toBe(false);
  });

  it("lists organizer stalls with assigned vendor info", async () => {
    const findManySpy = vi.spyOn(db.stall, "findMany").mockResolvedValue([
      {
        id: "stall_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true,
        assignedApplicationId: "app_1",
        market: {
          id: "market_1",
          organizerId: "org_1",
          title: "春日咖啡市集"
        },
        assignedApplication: {
          id: "app_1",
          vendor: {
            id: "vendor_1",
            name: "山野咖啡"
          }
        }
      }
    ] as unknown as Awaited<ReturnType<typeof db.stall.findMany>>);

    const stalls = await listOrganizerStalls("org_1");

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
            title: true
          }
        },
        assignedApplication: {
          select: {
            id: true,
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        {
          marketId: "asc"
        },
        {
          code: "asc"
        }
      ]
    });
    expect(stalls).toEqual([
      {
        id: "stall_1",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true,
        assignedApplicationId: "app_1",
        assignedVendorId: "vendor_1",
        assignedVendorName: "山野咖啡"
      }
    ]);
  });

  it("creates a stall inside the organizer scope", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_1",
      title: "春日咖啡市集"
    } as Awaited<ReturnType<typeof db.market.findUnique>>);
    const createSpy = vi.spyOn(db.stall, "create").mockResolvedValue({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true,
      assignedApplicationId: null
    } as Awaited<ReturnType<typeof db.stall.create>>);

    const stall = await createStall({
      organizerId: "org_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true
      }
    });
    expect(stall.id).toBe("stall_1");
  });

  it("assigns a stall to an approved application and creates a notification", async () => {
    vi.spyOn(db.stall, "findUnique").mockResolvedValue({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true,
      assignedApplicationId: null,
      market: {
        id: "market_1",
        organizerId: "org_1",
        title: "春日咖啡市集"
      }
    } as Awaited<ReturnType<typeof db.stall.findUnique>>);
    vi.spyOn(db.application, "findUnique").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "approved",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      vendor: {
        id: "vendor_1",
        name: "山野咖啡"
      },
      market: {
        id: "market_1",
        organizerId: "org_1",
        title: "春日咖啡市集",
        city: "杭州"
      }
    } as unknown as Awaited<ReturnType<typeof db.application.findUnique>>);
    const stallUpdateSpy = vi.spyOn(db.stall, "update").mockResolvedValue({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true,
      assignedApplicationId: "app_1"
    } as Awaited<ReturnType<typeof db.stall.update>>);
    const applicationUpdateSpy = vi.spyOn(db.application, "update").mockResolvedValue({
      id: "app_1",
      marketId: "market_1",
      vendorId: "vendor_1",
      status: "stall_assigned",
      note: "主营手作咖啡",
      createdAt: new Date("2026-05-01T00:00:00.000Z")
    } as Awaited<ReturnType<typeof db.application.update>>);
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
      title: "摊位分配已确认",
      content: "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。",
      readAt: null,
      createdAt: new Date("2026-05-01T01:00:00.000Z")
    } as Awaited<ReturnType<typeof db.notification.create>>);

    const result = await assignStall({
      organizerId: "org_1",
      stallId: "stall_1",
      applicationId: "app_1"
    });

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(stallUpdateSpy).toHaveBeenCalledWith({
      where: {
        id: "stall_1"
      },
      data: {
        assignedApplicationId: "app_1"
      }
    });
    expect(applicationUpdateSpy).toHaveBeenCalledWith({
      where: {
        id: "app_1"
      },
      data: {
        status: "stall_assigned"
      }
    });
    expect(notificationSpy).toHaveBeenCalledWith({
      data: {
        userId: "vendor_1",
        title: "摊位分配已确认",
        content:
          "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。"
      }
    });
    expect(result.application.status).toBe("stall_assigned");
    expect(result.stall.assignedApplicationId).toBe("app_1");
  });

  it("rejects assignment when the stall is unavailable", async () => {
    vi.spyOn(db.stall, "findUnique").mockResolvedValue({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      isActive: true,
      assignedApplicationId: "app_2",
      market: {
        id: "market_1",
        organizerId: "org_1",
        title: "春日咖啡市集"
      }
    } as Awaited<ReturnType<typeof db.stall.findUnique>>);

    await expect(
      assignStall({
        organizerId: "org_1",
        stallId: "stall_1",
        applicationId: "app_1"
      })
    ).rejects.toMatchObject({
      code: "STALL_UNAVAILABLE"
    });
  });

  it("rejects creation when the market is outside organizer scope", async () => {
    vi.spyOn(db.market, "findUnique").mockResolvedValue({
      id: "market_1",
      organizerId: "org_2",
      title: "春日咖啡市集"
    } as Awaited<ReturnType<typeof db.market.findUnique>>);

    await expect(
      createStall({
        organizerId: "org_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
