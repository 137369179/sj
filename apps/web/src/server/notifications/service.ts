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

export function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: input
  });
}
