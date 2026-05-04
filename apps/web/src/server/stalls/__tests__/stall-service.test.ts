import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../lib/db";
import {
  assignStall,
  createStall,
  listAvailableStallsForMarket,
  listOrganizerStalls,
  StallAssignmentError,
  StallCreationError,
  buildStallPayload,
  buildAssignStallPayload,
  canAssignStall
} from "../service";

describe("stall service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAvailableStallsForMarket", () => {
    it("returns active stalls without assigned application", async () => {
      vi.spyOn(db.stall, "findMany").mockResolvedValue([
        { id: "stall_1", code: "A01", name: "摊位 A01" },
        { id: "stall_2", code: "A02", name: "摊位 A02" }
      ] as any);

      const result = await listAvailableStallsForMarket("market_1");

      expect(db.stall.findMany).toHaveBeenCalledWith({
        where: {
          marketId: "market_1",
          isActive: true,
          assignedApplicationId: null
        },
        select: {
          id: true,
          code: true,
          name: true,
          price: true
        },
        orderBy: {
          code: "asc"
        }
      });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("A01");
    });

    it("skips database access for demo market stalls when demo mode is enabled", async () => {
      process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
      process.env.NODE_ENV = "development";

      const findManySpy = vi.spyOn(db.stall, "findMany");

      await expect(listAvailableStallsForMarket("spring-coffee")).resolves.toEqual([]);
      expect(findManySpy).not.toHaveBeenCalled();

      delete process.env.AUTH_ENABLE_DEMO_LOGIN;
      delete process.env.NODE_ENV;
    });
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
      price: 0,
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
        price: 100,
        isActive: true,
        assignedApplicationId: "app_1",
        market: {
          id: "market_1",
          organizerId: "org_1",
          title: "春日咖啡市集"
        },
        assignedApplication: {
          id: "app_1",
          status: "stall_assigned",
          order: {
            id: "order_1",
            status: "pending",
            createdAt: new Date("2026-05-03T06:00:00.000Z")
          },
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
            status: true,
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true
              }
            },
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
        price: 100,
        isActive: true,
        assignedApplicationId: "app_1",
        assignedVendorId: "vendor_1",
        assignedVendorName: "山野咖啡",
        assignedApplicationStatus: "stall_assigned",
        assignedOrderId: "order_1",
        assignedOrderStatus: "pending",
        assignedOrderCreatedAt: new Date("2026-05-03T06:00:00.000Z")
      }
    ]);
  });

  it("returns an empty organizer stall list when demo login is enabled and the database is unavailable", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    vi.spyOn(db.stall, "findMany").mockRejectedValue(new Error("database unavailable"));

    await expect(listOrganizerStalls("org_1")).resolves.toEqual([]);

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
  });

  it("skips database access for demo organizer stall requests", async () => {
    process.env.AUTH_ENABLE_DEMO_LOGIN = "true";
    process.env.NODE_ENV = "development";

    const findManySpy = vi.spyOn(db.stall, "findMany");

    await expect(listOrganizerStalls("organizer_1")).resolves.toEqual([]);
    expect(findManySpy).not.toHaveBeenCalled();

    delete process.env.AUTH_ENABLE_DEMO_LOGIN;
    delete process.env.NODE_ENV;
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
      isActive: true,
      price: 100
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        isActive: true,
        price: 100
      }
    });
    expect(stall.id).toBe("stall_1");
  });

  it("assigns a stall to an approved application, creates a notification, and creates an order if price > 0", async () => {
    const transaction = {
      stall: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "stall_1",
            marketId: "market_1",
            code: "A-01",
            name: "主通道 1 号位",
            price: 100,
            isActive: true,
            assignedApplicationId: null,
            market: {
              id: "market_1",
              organizerId: "org_1",
              title: "春日咖啡市集"
            }
          })
          .mockResolvedValueOnce({
            id: "stall_1",
            marketId: "market_1",
            code: "A-01",
            name: "主通道 1 号位",
            isActive: true,
            assignedApplicationId: "app_1"
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      application: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
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
          })
          .mockResolvedValueOnce({
            id: "app_1",
            marketId: "market_1",
            vendorId: "vendor_1",
            status: "stall_assigned",
            note: "主营手作咖啡",
            createdAt: new Date("2026-05-01T00:00:00.000Z")
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      order: {
        create: vi.fn().mockResolvedValue({ id: "order_1" })
      }
    };
    const transactionSpy = vi
      .spyOn(db, "$transaction")
      .mockImplementation(async (callback) => {
        if (typeof callback !== "function") {
          throw new Error("expected interactive transaction");
        }

        return callback(transaction as never);
      });
    const notificationSpy = vi.spyOn(db.notification, "create").mockResolvedValue({
      id: "stall_1",
      vendorId: "vendor_1",
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
    expect(transaction.stall.updateMany).toHaveBeenCalledWith({
      where: {
        id: "stall_1",
        isActive: true,
        assignedApplicationId: null
      },
      data: {
        assignedApplicationId: "app_1"
      }
    });
    expect(transaction.application.updateMany).toHaveBeenCalledWith({
      where: {
        id: "app_1",
        status: "approved"
      },
      data: {
        status: "stall_assigned"
      }
    });
    expect(transaction.order.create).toHaveBeenCalledWith({
      data: {
        applicationId: "app_1",
        vendorId: "vendor_1",
        amount: 100,
        status: "pending"
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

  it("rejects assignment when the stall becomes unavailable during the transaction", async () => {
    const transaction = {
      stall: {
        findUnique: vi.fn().mockResolvedValue({
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
        }),
        update: vi.fn().mockResolvedValue({
          id: "stall_1",
          marketId: "market_1",
          code: "A-01",
          name: "主通道 1 号位",
          isActive: true,
          assignedApplicationId: "app_1"
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      application: {
        findUnique: vi.fn().mockResolvedValue({
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
        }),
        update: vi.fn().mockResolvedValue({
          id: "app_1",
          marketId: "market_1",
          vendorId: "vendor_1",
          status: "stall_assigned",
          note: "主营手作咖啡",
          createdAt: new Date("2026-05-01T00:00:00.000Z")
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      if (typeof callback !== "function") {
        throw new Error("expected interactive transaction");
      }

      return callback(transaction as never);
    });

    await expect(
      assignStall({
        organizerId: "org_1",
        stallId: "stall_1",
        applicationId: "app_1"
      })
    ).rejects.toEqual(new StallAssignmentError("STALL_UNAVAILABLE"));
  });

  it("rejects assignment when the application status changes during the transaction", async () => {
    const transaction = {
      stall: {
        findUnique: vi.fn().mockResolvedValue({
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
        }),
        update: vi.fn().mockResolvedValue({
          id: "stall_1",
          marketId: "market_1",
          code: "A-01",
          name: "主通道 1 号位",
          isActive: true,
          assignedApplicationId: "app_1"
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      application: {
        findUnique: vi.fn().mockResolvedValue({
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
        }),
        update: vi.fn().mockResolvedValue({
          id: "app_1",
          marketId: "market_1",
          vendorId: "vendor_1",
          status: "stall_assigned",
          note: "主营手作咖啡",
          createdAt: new Date("2026-05-01T00:00:00.000Z")
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    };
    const notificationSpy = vi.spyOn(db.notification, "create");
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      if (typeof callback !== "function") {
        throw new Error("expected interactive transaction");
      }

      return callback(transaction as never);
    });

    await expect(
      assignStall({
        organizerId: "org_1",
        stallId: "stall_1",
        applicationId: "app_1"
      })
    ).rejects.toEqual(new StallAssignmentError("INVALID_APPLICATION_STATUS"));
    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it("rejects assignment when the stall is unavailable", async () => {
    vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
      if (typeof callback !== "function") {
        throw new Error("expected interactive transaction");
      }

      return callback({
        stall: {
          findUnique: vi.fn().mockResolvedValue({
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
          })
        },
        application: {
          findUnique: vi.fn()
        }
      } as never);
    });

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
        price: 0,
        isActive: true
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
