import { db } from "../../lib/db";

export type ApplicationReviewDecision = "approve" | "reject";

export type CreateNotificationInput = {
  userId: string;
  title: string;
  content: string;
};

export type BuildApplicationReviewNotificationInput = {
  userId: string;
  marketTitle: string;
  decision: ApplicationReviewDecision;
  note?: string;
};

export type BuildStallAssignmentNotificationInput = {
  userId: string;
  marketTitle: string;
  stallCode: string;
  stallName: string;
};

export function buildApplicationReviewNotification(
  input: BuildApplicationReviewNotificationInput
): CreateNotificationInput {
  const title =
    input.decision === "approve" ? "申请审核已通过" : "申请未通过审核";
  const baseContent =
    input.decision === "approve"
      ? `你在${input.marketTitle}的申请已审核通过。`
      : `你在${input.marketTitle}的申请未通过审核，请调整后重新报名。`;
  const content = input.note
    ? `${baseContent}备注：${input.note}`
    : baseContent;

  return {
    userId: input.userId,
    title,
    content
  };
}

export function buildStallAssignmentNotification(
  input: BuildStallAssignmentNotificationInput
): CreateNotificationInput {
  return {
    userId: input.userId,
    title: "摊位分配已确认",
    content: `你在${input.marketTitle}的申请已完成摊位分配，摊位为${input.stallName}（${input.stallCode}）。`
  };
}

export function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: input
  });
}

export type VendorNotificationListItem = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
};

export async function listVendorNotifications(
  userId: string
): Promise<VendorNotificationListItem[]> {
  const notifications = await db.notification.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    content: notification.content,
    isRead: notification.readAt !== null,
    createdAt: notification.createdAt
  }));
}

export async function markNotificationAsRead(input: {
  notificationId: string;
  userId: string;
}) {
  const notification = await db.notification.findUnique({
    where: {
      id: input.notificationId
    }
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  if (notification.userId !== input.userId) {
    throw new Error("FORBIDDEN");
  }

  if (notification.readAt) {
    return notification;
  }

  return db.notification.update({
    where: {
      id: input.notificationId
    },
    data: {
      readAt: new Date()
    }
  });
}
