import { z } from "zod";

import { db } from "../../lib/db";
import { storedAttachmentSchema } from "../../lib/storage";
import {
  buildApplicationReviewNotification,
  createNotification
} from "../notifications/service";
import { canTransitionApplication, type ApplicationStatus } from "./status";

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const applicationSchema = z.object({
  marketId: z.string().trim().min(1),
  boothPreference: z.string().trim().min(1),
  applicationNote: optionalTextSchema,
  attachments: z.array(storedAttachmentSchema).default([])
});

export type ApplicationPayload = z.infer<typeof applicationSchema>;

export const applicationReviewSchema = z.object({
  organizerId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  reviewNote: optionalTextSchema
});

export type ApplicationReviewPayload = z.infer<typeof applicationReviewSchema>;

type OrganizerApplicationRecord = {
  id: string;
  marketId: string;
  vendorId: string;
  status: ApplicationStatus;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  createdAt: Date;
  market: {
    id: string;
    title: string;
    city: string;
  };
  vendor: {
    id: string;
    name: string;
  };
};

type VendorApplicationRecord = {
  id: string;
  marketId: string;
  status: ApplicationStatus;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  createdAt: Date;
  market: {
    id: string;
    title: string;
    city: string;
  };
  assignedStall: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type OrganizerApplicationListItem = {
  id: string;
  marketId: string;
  marketTitle: string;
  marketCity: string;
  vendorId: string;
  vendorName: string;
  status: ApplicationStatus;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  createdAt: Date;
};

export type VendorApplicationListItem = {
  id: string;
  marketId: string;
  marketTitle: string;
  marketCity: string;
  status: ApplicationStatus;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  createdAt: Date;
  assignedStallId: string | null;
  assignedStallCode: string | null;
  assignedStallName: string | null;
};

export type ReviewApplicationInput = ApplicationReviewPayload & {
  applicationId: string;
};

export type ApplicationReviewErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATUS";

export class ApplicationReviewError extends Error {
  code: ApplicationReviewErrorCode;

  constructor(code: ApplicationReviewErrorCode) {
    super(code);
    this.code = code;
  }
}

const organizerApplicationInclude = {
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
} as const;

const vendorApplicationInclude = {
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
  }
} as const;

export function buildApplicationPayload(input: unknown): ApplicationPayload {
  return applicationSchema.parse(input);
}

export function buildApplicationReviewPayload(
  input: unknown
): ApplicationReviewPayload {
  return applicationReviewSchema.parse(input);
}

export function makeApplicationKey(marketId: string, vendorId: string) {
  return `${marketId}:${vendorId}`;
}

export async function listOrganizerApplications(
  organizerId: string
): Promise<OrganizerApplicationListItem[]> {
  const applications = await db.application.findMany({
    where: {
      market: {
        organizerId
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

  return applications.map((application) => formatOrganizerApplication(application));
}

export async function listVendorApplications(
  vendorId: string
): Promise<VendorApplicationListItem[]> {
  const applications = await db.application.findMany({
    where: {
      vendorId
    },
    include: vendorApplicationInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return applications.map((application) => formatVendorApplication(application));
}

export async function reviewApplication(input: ReviewApplicationInput) {
  const application = await db.application.findUnique({
    where: {
      id: input.applicationId
    },
    include: organizerApplicationInclude
  });

  if (!application) {
    throw new ApplicationReviewError("NOT_FOUND");
  }

  if (application.market.organizerId !== input.organizerId) {
    throw new ApplicationReviewError("FORBIDDEN");
  }

  const nextStatus: ApplicationStatus =
    input.decision === "approve" ? "approved" : "rejected";

  if (!canTransitionApplication(application.status, nextStatus)) {
    throw new ApplicationReviewError("INVALID_STATUS");
  }

  const updatedApplication = await db.application.update({
    where: {
      id: input.applicationId
    },
    data: {
      status: nextStatus,
      reviewNote: input.reviewNote
    }
  });

  const notification = await createNotification(
    buildApplicationReviewNotification({
      userId: application.vendor.id,
      marketTitle: application.market.title,
      decision: input.decision,
      note: input.reviewNote
    })
  );

  return {
    application: updatedApplication,
    notification
  };
}

function formatOrganizerApplication(
  application: OrganizerApplicationRecord
): OrganizerApplicationListItem {
  return {
    id: application.id,
    marketId: application.marketId,
    marketTitle: application.market.title,
    marketCity: application.market.city,
    vendorId: application.vendorId,
    vendorName: application.vendor.name,
    status: application.status,
    note: application.note,
    applicationNote: application.applicationNote ?? application.note,
    reviewNote: application.reviewNote,
    createdAt: application.createdAt
  };
}

function formatVendorApplication(
  application: VendorApplicationRecord
): VendorApplicationListItem {
  return {
    id: application.id,
    marketId: application.marketId,
    marketTitle: application.market.title,
    marketCity: application.market.city,
    status: application.status,
    note: application.note,
    applicationNote: application.applicationNote ?? application.note,
    reviewNote: application.reviewNote,
    createdAt: application.createdAt,
    assignedStallId: application.assignedStall?.id ?? null,
    assignedStallCode: application.assignedStall?.code ?? null,
    assignedStallName: application.assignedStall?.name ?? null
  };
}
