import { db } from "../../lib/db";

export type ApplicationReviewDecision =
  | "approve"
  | "reject"
  | "supplement"
  | "waitlist";

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

export type ApplicationFollowUpAction =
  | "supplement_reminder"
  | "waitlist_confirmation";

export type BuildApplicationFollowUpNotificationInput = {
  userId: string;
  marketTitle: string;
  action: ApplicationFollowUpAction;
  note?: string;
};

export type BuildStallAssignmentNotificationInput = {
  userId: string;
  marketTitle: string;
  stallCode: string;
  stallName: string;
};

export type BuildOrderPaidNotificationInput = {
  userId: string;
  marketTitle: string;
  amount: number;
};

export type BuildOrderExpiredNotificationInput = {
  userId: string;
  marketTitle: string;
};

export type BuildOrderPaymentReminderNotificationInput = {
  userId: string;
  marketTitle: string;
  amount: number;
};

export type AutomaticPaymentOperationAction = "auto_reminder" | "auto_release";

export type BuildAutomaticPaymentOperationNotificationInput = {
  userId: string;
  marketTitle: string;
  action: AutomaticPaymentOperationAction;
  count: number;
};

export function buildApplicationReviewNotification(
  input: BuildApplicationReviewNotificationInput
): CreateNotificationInput {
  const title = getApplicationReviewNotificationTitle(input.decision);
  const baseContent = getApplicationReviewNotificationContent(
    input.marketTitle,
    input.decision
  );
  const content = input.note
    ? `${baseContent}备注：${input.note}`
    : baseContent;

  return {
    userId: input.userId,
    title,
    content
  };
}

export function buildApplicationFollowUpNotification(
  input: BuildApplicationFollowUpNotificationInput
): CreateNotificationInput {
  const title =
    input.action === "supplement_reminder"
      ? "补件进度提醒"
      : "候补补位通知";
  const baseContent =
    input.action === "supplement_reminder"
      ? `主办方提醒你尽快完成${input.marketTitle}的补件要求，以免错过本轮审核。`
      : `${input.marketTitle}出现补位机会，请尽快确认是否接受本次候补递补。`;

  return {
    userId: input.userId,
    title,
    content: input.note ? `${baseContent}备注：${input.note}` : baseContent
  };
}

function getApplicationReviewNotificationTitle(decision: ApplicationReviewDecision) {
  if (decision === "approve") {
    return "申请审核已通过";
  }

  if (decision === "supplement") {
    return "申请需要补充资料";
  }

  if (decision === "waitlist") {
    return "申请已进入候补";
  }

  return "申请未通过审核";
}

function getApplicationReviewNotificationContent(
  marketTitle: string,
  decision: ApplicationReviewDecision
) {
  if (decision === "approve") {
    return `你在${marketTitle}的申请已审核通过。`;
  }

  if (decision === "supplement") {
    return `你在${marketTitle}的申请需要补充资料后继续审核。`;
  }

  if (decision === "waitlist") {
    return `你在${marketTitle}的申请当前进入候补名单，如有空位将优先通知。`;
  }

  return `你在${marketTitle}的申请未通过审核，请调整后重新报名。`;
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

export function buildOrderPaidNotification(
  input: BuildOrderPaidNotificationInput
): CreateNotificationInput {
  return {
    userId: input.userId,
    title: "支付已完成",
    content: `你在${input.marketTitle}的摊位费用已支付完成，金额为¥${input.amount}，本次报名已锁定。`
  };
}

export function buildOrderExpiredNotification(
  input: BuildOrderExpiredNotificationInput
): CreateNotificationInput {
  return {
    userId: input.userId,
    title: "支付超时，档期已释放",
    content: `你在${input.marketTitle}的待支付订单已超时，主办方已释放本次摊位档期，可重新关注后续机会。`
  };
}

export function buildOrderPaymentReminderNotification(
  input: BuildOrderPaymentReminderNotificationInput
): CreateNotificationInput {
  return {
    userId: input.userId,
    title: "支付进度提醒",
    content: `主办方提醒你尽快完成${input.marketTitle}的摊位费用支付，当前待支付金额为¥${input.amount}。`
  };
}

export function buildAutomaticPaymentOperationNotification(
  input: BuildAutomaticPaymentOperationNotificationInput
): CreateNotificationInput {
  return {
    userId: input.userId,
    title: input.action === "auto_reminder" ? "支付自动催办已执行" : "支付自动释放已执行",
    content:
      input.action === "auto_reminder"
        ? `${input.marketTitle}已自动催办 ${input.count} 笔支付临期订单。`
        : `${input.marketTitle}已自动释放 ${input.count} 笔支付超时订单。`
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
