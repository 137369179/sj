import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "../../lib/db";
import { buildStallAssignmentNotification, createNotification } from "../notifications/service";

export const stallSchema = z.object({
  organizerId: z.string().trim().min(1),
  marketId: z.string().trim().min(1),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const stallAssignmentSchema = z.object({
  organizerId: z.string().trim().min(1),
  applicationId: z.string().trim().min(1)
});

export type StallPayload = z.infer<typeof stallSchema>;
export type StallAssignmentPayload = z.infer<typeof stallAssignmentSchema>;

type OrganizerStallRecord = {
  id: string;
  marketId: string;
  code: string;
  name: string;
  price: number;
  isActive: boolean;
  assignedApplicationId: string | null;
  market: {
    id: string;
    organizerId: string;
    title: string;
  };
  assignedApplication: {
    id: string;
    status: string;
    order: {
      id: string;
      status: string;
      createdAt: Date;
    } | null;
    vendor: {
      id: string;
      name: string;
    };
  } | null;
};

export type VendorStallListItem = {
  id: string;
  code: string;
  name: string;
  price: number;
};

export async function listAvailableStallsForMarket(marketId: string): Promise<VendorStallListItem[]> {
  const stalls = await db.stall.findMany({
    where: {
      marketId,
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

  return stalls;
}

export type OrganizerStallListItem = {
  id: string;
  marketId: string;
  marketTitle: string;
  code: string;
  name: string;
  price: number;
  isActive: boolean;
  assignedApplicationId: string | null;
  assignedVendorId: string | null;
  assignedVendorName: string | null;
  assignedApplicationStatus: string | null;
  assignedOrderId: string | null;
  assignedOrderStatus: string | null;
  assignedOrderCreatedAt: Date | null;
};





export type AssignStallInput = StallAssignmentPayload & {
  stallId: string;
};

export type StallCreationErrorCode = "MARKET_NOT_FOUND" | "FORBIDDEN";

export class StallCreationError extends Error {
  code: StallCreationErrorCode;

  constructor(code: StallCreationErrorCode) {
    super(code);
    this.code = code;
  }
}

export type StallAssignmentErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "STALL_UNAVAILABLE"
  | "INVALID_APPLICATION"
  | "INVALID_APPLICATION_STATUS";

export class StallAssignmentError extends Error {
  code: StallAssignmentErrorCode;

  constructor(code: StallAssignmentErrorCode) {
    super(code);
    this.code = code;
  }
}

const organizerStallInclude = {
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
} as const;

const stallAssignmentInclude = {
  market: {
    select: {
      id: true,
      organizerId: true,
      title: true
    }
  }
} as const;

const assignableApplicationInclude = {
  vendor: {
    select: {
      id: true,
      name: true
    }
  },
  market: {
    select: {
      id: true,
      organizerId: true,
      title: true,
      city: true
    }
  }
} as const;

export function buildStallPayload(input: unknown): StallPayload {
  return stallSchema.parse(input);
}

export function buildAssignStallPayload(input: unknown): StallAssignmentPayload {
  return stallAssignmentSchema.parse(input);
}

export function canAssignStall(input: {
  isActive: boolean;
  assignedApplicationId: string | null;
}) {
  return input.isActive && !input.assignedApplicationId;
}

export async function listOrganizerStalls(
  organizerId: string
): Promise<OrganizerStallListItem[]> {
  if (isDemoOrganizerUser(organizerId)) {
    return [];
  }

  try {
    const stalls = await db.stall.findMany({
      where: {
        market: {
          organizerId
        }
      },
      include: organizerStallInclude,
      orderBy: [
        {
          marketId: "asc"
        },
        {
          code: "asc"
        }
      ]
    });

    return stalls.map((stall) => formatOrganizerStall(stall));
  } catch (error) {
    if (isDemoLoginEnabled()) {
      return [];
    }

    throw error;
  }
}

export async function createStall(input: StallPayload) {
  const market = await db.market.findUnique({
    where: {
      id: input.marketId
    },
    select: {
      id: true,
      organizerId: true,
      title: true
    }
  });

  if (!market) {
    throw new StallCreationError("MARKET_NOT_FOUND");
  }

  if (market.organizerId !== input.organizerId) {
    throw new StallCreationError("FORBIDDEN");
  }

  return db.stall.create({
    data: {
      marketId: input.marketId,
      code: input.code,
      name: input.name,
      price: input.price,
      isActive: input.isActive
    }
  });
}

export async function assignStall(input: AssignStallInput) {
  let result: {
    updatedStall: Awaited<ReturnType<typeof db.stall.update>>;
    updatedApplication: Awaited<ReturnType<typeof db.application.update>>;
    notificationInput: ReturnType<typeof buildStallAssignmentNotification>;
  };

  try {
    result = await db.$transaction(async (transaction) => {
      const stall = await transaction.stall.findUnique({
        where: {
          id: input.stallId
        },
        include: stallAssignmentInclude
      });

      if (!stall) {
        throw new StallAssignmentError("NOT_FOUND");
      }

      if (stall.market.organizerId !== input.organizerId) {
        throw new StallAssignmentError("FORBIDDEN");
      }

      if (
        !canAssignStall({
          isActive: stall.isActive,
          assignedApplicationId: stall.assignedApplicationId
        })
      ) {
        throw new StallAssignmentError("STALL_UNAVAILABLE");
      }

      const application = await transaction.application.findUnique({
        where: {
          id: input.applicationId
        },
        include: assignableApplicationInclude
      });

      if (!application || application.market.organizerId !== input.organizerId) {
        throw new StallAssignmentError("INVALID_APPLICATION");
      }

      if (application.marketId !== stall.marketId) {
        throw new StallAssignmentError("INVALID_APPLICATION");
      }

      if (application.status !== "approved") {
        throw new StallAssignmentError("INVALID_APPLICATION_STATUS");
      }

      const updatedStallResult = await transaction.stall.updateMany({
        where: {
          id: input.stallId,
          isActive: true,
          assignedApplicationId: null
        },
        data: {
          assignedApplicationId: input.applicationId
        }
      });

      if (updatedStallResult.count === 0) {
        throw new StallAssignmentError("STALL_UNAVAILABLE");
      }

      const updatedApplicationResult = await transaction.application.updateMany({
        where: {
          id: input.applicationId,
          status: "approved"
        },
        data: {
          status: "stall_assigned"
        }
      });

      if (updatedApplicationResult.count === 0) {
        throw new StallAssignmentError("INVALID_APPLICATION_STATUS");
      }

      const updatedStall = await transaction.stall.findUnique({
        where: {
          id: input.stallId
        }
      });
      const updatedApplication = await transaction.application.findUnique({
        where: {
          id: input.applicationId
        }
      });

      if (!updatedStall || !updatedApplication) {
        throw new StallAssignmentError("NOT_FOUND");
      }

      if (stall.price > 0) {
        await transaction.order.create({
          data: {
            applicationId: application.id,
            vendorId: application.vendor.id,
            amount: stall.price,
            status: "pending"
          }
        });
      }

      return {
        updatedStall,
        updatedApplication,
        notificationInput: buildStallAssignmentNotification({
          userId: application.vendor.id,
          marketTitle: stall.market.title,
          stallCode: stall.code,
          stallName: stall.name
        })
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new StallAssignmentError("INVALID_APPLICATION");
    }

    throw error;
  }

  const notification = await createNotification(
    result.notificationInput
  );

  return {
    stall: result.updatedStall,
    application: result.updatedApplication,
    notification
  };
}

function formatOrganizerStall(stall: OrganizerStallRecord): OrganizerStallListItem {
  return {
    id: stall.id,
    marketId: stall.marketId,
    marketTitle: stall.market.title,
    code: stall.code,
    name: stall.name,
    price: stall.price,
    isActive: stall.isActive,
    assignedApplicationId: stall.assignedApplicationId,
    assignedVendorId: stall.assignedApplication?.vendor.id ?? null,
    assignedVendorName: stall.assignedApplication?.vendor.name ?? null,
    assignedApplicationStatus: stall.assignedApplication?.status ?? null,
    assignedOrderId: stall.assignedApplication?.order?.id ?? null,
    assignedOrderStatus: stall.assignedApplication?.order?.status ?? null,
    assignedOrderCreatedAt: stall.assignedApplication?.order?.createdAt ?? null
  };
}

function isDemoLoginEnabled() {
  return process.env.AUTH_ENABLE_DEMO_LOGIN === "true" && process.env.NODE_ENV !== "production";
}

function isDemoOrganizerUser(organizerId: string) {
  return isDemoLoginEnabled() && organizerId === "organizer_1";
}
