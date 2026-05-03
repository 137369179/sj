import { z } from "zod";

import { db } from "../../lib/db";
import {
  normalizeAttachments,
  storedAttachmentSchema,
  type StoredAttachment
} from "../../lib/storage";
import {
  getOrganizerFollowUpState,
  type OrganizerFollowUpState
} from "../../lib/role-play";
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

export const applicationSupplementSchema = z.object({
  boothPreference: z.string().trim().min(1),
  applicationNote: optionalTextSchema,
  attachments: z.array(storedAttachmentSchema).default([])
});

export type ApplicationSupplementPayload = z.infer<typeof applicationSupplementSchema>;

export const applicationReviewSchema = z.object({
  organizerId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject", "supplement", "waitlist"]),
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
  attachmentsJson?: unknown;
  reviewedAt: Date | null;
  reviews: RawApplicationReviewRecord[];
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
  attachmentsJson?: unknown;
  reviewedAt: Date | null;
  reviews: RawApplicationReviewRecord[];
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
    price: number;
  } | null;
  order: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    paidAt: Date | null;
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
  latestReviewDecision: ApplicationReviewAuditRecord["decision"] | null;
  followUpState: OrganizerFollowUpState;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  attachments: StoredAttachment[];
  reviewedAt: Date | null;
  reviews: ApplicationReviewAuditRecord[];
  createdAt: Date;
};

export type VendorApplicationListItem = {
  id: string;
  marketId: string;
  marketTitle: string;
  marketCity: string;
  status: ApplicationStatus;
  taskGroup: "pending-action" | "in-progress" | "done";
  latestReviewDecision: ApplicationReviewAuditRecord["decision"] | null;
  note: string | null;
  applicationNote: string | null;
  reviewNote: string | null;
  attachments: StoredAttachment[];
  reviewedAt: Date | null;
  reviews: ApplicationReviewAuditRecord[];
  createdAt: Date;
  assignedStallId: string | null;
  assignedStallCode: string | null;
  assignedStallName: string | null;
  assignedStallPrice: number | null;
  orderId: string | null;
  orderAmount: number | null;
  orderStatus: string | null;
  orderPaymentMethod: string | null;
  orderPaidAt: Date | null;
};

export type ReviewApplicationInput = ApplicationReviewPayload & {
  applicationId: string;
};

export type ApplicationReviewAuditRecord = {
  id: string;
  applicationId: string;
  organizerId: string;
  decision: "approve" | "reject" | "supplement" | "waitlist";
  reviewNote: string | null;
  createdAt: Date;
};

type RawApplicationReviewRecord = Omit<ApplicationReviewAuditRecord, "decision"> & {
  decision: string;
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
      paidAt: true
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
} as const;

export function buildApplicationPayload(input: unknown): ApplicationPayload {
  return applicationSchema.parse(input);
}

export function buildApplicationSupplementPayload(
  input: unknown
): ApplicationSupplementPayload {
  return applicationSupplementSchema.parse(input);
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
    include: organizerApplicationInclude,
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

  const nextStatus = resolveReviewNextStatus(application.status, input.decision);

  if (!nextStatus) {
    throw new ApplicationReviewError("INVALID_STATUS");
  }

  const reviewTimestamp = new Date();
  const { updatedApplication, review } = await db.$transaction(async (transaction) => {
    const updatedApplication = await transaction.application.update({
      where: {
        id: input.applicationId
      },
      data: {
        status: nextStatus,
        reviewNote: input.reviewNote,
        reviewedAt: reviewTimestamp,
        reviewedByUserId: input.organizerId
      }
    });

    const review = await transaction.applicationReview.create({
      data: {
        applicationId: input.applicationId,
        organizerId: input.organizerId,
        decision: input.decision,
        reviewNote: input.reviewNote
      }
    });

    return {
      updatedApplication,
      review
    };
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
    review,
    notification
  };
}

function formatOrganizerApplication(
  application: OrganizerApplicationRecord
): OrganizerApplicationListItem {
  const normalizedReviews = normalizeReviewRecords(application.reviews);
  const latestReviewDecision = normalizedReviews[0]?.decision ?? null;

  return {
    id: application.id,
    marketId: application.marketId,
    marketTitle: application.market.title,
    marketCity: application.market.city,
    vendorId: application.vendorId,
    vendorName: application.vendor.name,
    status: application.status,
    latestReviewDecision,
    followUpState: getOrganizerFollowUpState({
      latestReviewDecision,
      reviewedAt: application.reviewedAt
    }),
    note: application.note,
    applicationNote: application.applicationNote ?? application.note,
    reviewNote: application.reviewNote,
    attachments: normalizeAttachments(application.attachmentsJson),
    reviewedAt: application.reviewedAt,
    reviews: normalizedReviews,
    createdAt: application.createdAt
  };
}

function formatVendorApplication(
  application: VendorApplicationRecord
): VendorApplicationListItem {
  const normalizedReviews = normalizeReviewRecords(application.reviews);
  const latestReviewDecision = normalizedReviews[0]?.decision ?? null;

  return {
    id: application.id,
    marketId: application.marketId,
    marketTitle: application.market.title,
    marketCity: application.market.city,
    status: application.status,
    taskGroup: getVendorApplicationTaskGroup(application.status, latestReviewDecision),
    latestReviewDecision,
    note: application.note,
    applicationNote: application.applicationNote ?? application.note,
    reviewNote: application.reviewNote,
    attachments: normalizeAttachments(application.attachmentsJson),
    reviewedAt: application.reviewedAt,
    reviews: normalizedReviews,
    createdAt: application.createdAt,
    assignedStallId: application.assignedStall?.id ?? null,
    assignedStallCode: application.assignedStall?.code ?? null,
    assignedStallName: application.assignedStall?.name ?? null,
    assignedStallPrice: application.assignedStall?.price ?? null,
    orderId: application.order?.id ?? null,
    orderAmount: application.order?.amount ?? null,
    orderStatus: application.order?.status ?? null,
    orderPaymentMethod: application.order?.paymentMethod ?? null,
    orderPaidAt: application.order?.paidAt ?? null
  };
}

function getVendorApplicationTaskGroup(
  status: ApplicationStatus,
  latestReviewDecision: ApplicationReviewAuditRecord["decision"] | null
): "pending-action" | "in-progress" | "done" {
  if (status === "submitted") {
    return "pending-action";
  }

  if (status === "under_review") {
    if (latestReviewDecision === "supplement") {
      return "pending-action";
    }

    return "in-progress";
  }

  return "done";
}

function normalizeReviewRecords(
  reviews: RawApplicationReviewRecord[]
): ApplicationReviewAuditRecord[] {
  return reviews
    .filter(isSupportedReviewDecision)
    .map((review) => ({
      ...review,
      decision: review.decision
    }));
}

function isSupportedReviewDecision(
  review: RawApplicationReviewRecord
): review is ApplicationReviewAuditRecord {
  return (
    review.decision === "approve" ||
    review.decision === "reject" ||
    review.decision === "supplement" ||
    review.decision === "waitlist"
  );
}

function resolveReviewNextStatus(
  currentStatus: ApplicationStatus,
  decision: ApplicationReviewPayload["decision"]
): ApplicationStatus | null {
  if (decision === "approve") {
    return canTransitionApplication(currentStatus, "approved") ? "approved" : null;
  }

  if (decision === "reject") {
    return canTransitionApplication(currentStatus, "rejected") ? "rejected" : null;
  }

  if (currentStatus === "submitted") {
    return "under_review";
  }

  if (currentStatus === "under_review") {
    return "under_review";
  }

  return null;
}
