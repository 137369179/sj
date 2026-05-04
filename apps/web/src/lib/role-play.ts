export const ROLE_LABELS = {
  vendor: "摊主",
  organizer: "主办方",
  admin: "平台管理员",
} as const;

export const ROLE_GUIDANCE = {
  vendor: "可浏览市集、提交报名并跟进自己的入驻进度。",
  organizer: "可发布市集、管理摊位与处理报名申请。",
  admin: "可管理平台组织者、巡检全站数据并处理高权限事务。",
} as const;

export const VENDOR_APPLICATION_TASK_GROUPS = [
  { id: "pending-action", label: "优先处理" },
  { id: "in-progress", label: "处理中" },
  { id: "done", label: "已完成" },
] as const;

export type VendorApplicationTaskGroupId =
  (typeof VENDOR_APPLICATION_TASK_GROUPS)[number]["id"];

export type OrganizerFollowUpState = "idle" | "watching" | "urgent";
export type OrganizerPaymentFollowUpState = "idle" | "watching" | "urgent";

type VendorProgressInput = {
  status: string;
  latestReviewDecision?: string | null;
  reviewedAt?: Date | string | null;
  orderStatus?: string | null;
  orderCreatedAt?: Date | string | null;
  reviewNote?: string | null;
};

export function getVendorStatusHint(
  status: string,
  latestReviewDecision?: string | null
) {
  if (status === "submitted") {
    return "等待主办方处理";
  }

  if (status === "under_review") {
    if (latestReviewDecision === "supplement") {
      return "请尽快补充资料后继续审核";
    }

    if (latestReviewDecision === "waitlist") {
      return "已进入候补队列，建议保留档期";
    }

    return "审核中，请耐心等待";
  }

  if (status === "approved") {
    return "留意主办方后续确认与分配通知";
  }

  if (status === "stall_assigned" || status === "paid") {
    return "查看分配结果与后续安排";
  }

  if (status === "rejected") {
    return "查看结果说明并准备下一次报名";
  }

  return "关注最新进度更新";
}

export function getVendorCurrentStepLabel(
  status: string,
  latestReviewDecision?: string | null
) {
  if (status === "under_review" && latestReviewDecision === "supplement") {
    return "待补件";
  }

  if (status === "under_review" && latestReviewDecision === "waitlist") {
    return "候补中";
  }

  if (status === "under_review") {
    return "审核中";
  }

  if (status === "submitted") {
    return "待主办方处理";
  }

  if (status === "approved") {
    return "待分配";
  }

  if (status === "stall_assigned" || status === "paid") {
    return "已完成分配";
  }

  if (status === "rejected") {
    return "本轮未通过";
  }

  return "处理中";
}

export function getVendorTimingNote(input: {
  status?: string;
  latestReviewDecision?: string | null;
  reviewedAt?: Date | string | null;
  orderStatus?: string | null;
  orderCreatedAt?: Date | string | null;
  reviewNote?: string | null;
}) {
  const reviewedAt = normalizeDate(input.reviewedAt);
  const orderCreatedAt = normalizeDate(input.orderCreatedAt);

  if (input.latestReviewDecision === "supplement") {
    if (!reviewedAt) {
      return null;
    }

    const deadline = new Date(reviewedAt.getTime() + 48 * 60 * 60 * 1000);
    const remainingHours = Math.ceil((deadline.getTime() - Date.now()) / (60 * 60 * 1000));

    if (remainingHours <= 0) {
      return "补件已超时，请立即处理并联系主办方确认是否仍可继续审核。";
    }

    if (remainingHours <= 24) {
      return `补件将在 ${remainingHours} 小时内截止，请优先处理。`;
    }

    return "建议在 48 小时内完成补件，避免影响本次审核。";
  }

  if (input.latestReviewDecision === "waitlist") {
    return "候补观察期内请保留档期，留意补位通知。";
  }

  if (input.status === "stall_assigned" && input.orderStatus === "pending" && orderCreatedAt) {
    const remainingHours = getRemainingHours(orderCreatedAt, 24);

    if (remainingHours <= 0) {
      return "支付已超时，请立即完成支付并联系主办方确认档期是否仍保留。";
    }

    if (remainingHours <= 12) {
      return `支付将在 ${remainingHours} 小时内截止，请尽快完成支付。`;
    }

    return "建议在 24 小时内完成支付，避免已分配摊位被释放。";
  }

  if (input.status === "approved" && input.reviewNote === "摊主已确认候补补位") {
    return "主办方通常会在 24 小时内同步摊位分配结果，请留意最新通知。";
  }

  return null;
}

export function getVendorActionLabel(input: VendorProgressInput) {
  if (input.status === "under_review" && input.latestReviewDecision === "supplement") {
    const timingNote = getVendorTimingNote(input);

    if (timingNote?.includes("截止") || timingNote?.includes("超时")) {
      return "立即补件";
    }

    return "准备补件";
  }

  if (input.status === "under_review" && input.latestReviewDecision === "waitlist") {
    return "保留档期";
  }

  if (input.status === "stall_assigned" && input.orderStatus === "pending") {
    return "完成支付";
  }

  if (input.status === "paid") {
    return "准备进场";
  }

  if (isExpiredPaymentRelease(input)) {
    return "重新报名";
  }

  if (isConfirmedWaitlistProgress(input)) {
    return "等待分配结果";
  }

  if (input.status === "approved") {
    return "等待分配";
  }

  if (input.status === "submitted") {
    return "等待审核";
  }

  return "关注进度";
}

export function getVendorReceiptNote(input: VendorProgressInput) {
  if (input.status === "under_review" && input.latestReviewDecision === "supplement") {
    return "资料补齐后会重新进入主办方审核队列。";
  }

  if (input.status === "under_review" && input.latestReviewDecision === "waitlist") {
    return "当前仍在候补观察名单中，如有空位将优先递补。";
  }

  if (input.status === "stall_assigned" && input.orderStatus === "pending") {
    return "摊位已锁定，付款后将正式保留本次档期。";
  }

  if (input.status === "paid") {
    return "报名已锁定，可按摊位安排准备进场。";
  }

  if (isExpiredPaymentRelease(input)) {
    return "由于支付超时，本次摊位档期已释放，可重新关注后续场次。";
  }

  if (isConfirmedWaitlistProgress(input)) {
    return "你已确认候补补位，主办方正在安排摊位分配。";
  }

  if (input.status === "approved") {
    return "你已通过审核，等待主办方完成摊位分配。";
  }

  if (input.status === "submitted") {
    return "报名已提交，当前等待主办方首次处理。";
  }

  return "请留意主办方后续通知。";
}

export function getOrganizerFollowUpState(input: {
  latestReviewDecision?: string | null;
  reviewedAt?: Date | string | null;
}): OrganizerFollowUpState {
  const reviewedAt = normalizeDate(input.reviewedAt);

  if (!reviewedAt) {
    return "idle";
  }

  if (input.latestReviewDecision === "supplement") {
    const remainingHours = getRemainingHours(reviewedAt, 48);
    return remainingHours <= 24 ? "urgent" : "watching";
  }

  if (input.latestReviewDecision === "waitlist") {
    const remainingHours = getRemainingHours(reviewedAt, 72);
    return remainingHours <= 24 ? "urgent" : "watching";
  }

  return "idle";
}

export function getOrganizerFollowUpLabel(state: OrganizerFollowUpState) {
  if (state === "urgent") {
    return "立即催办";
  }

  if (state === "watching") {
    return "持续跟进";
  }

  return "正常推进";
}

export function getOrganizerFollowUpNote(input: {
  latestReviewDecision?: string | null;
  reviewedAt?: Date | string | null;
}) {
  const reviewedAt = normalizeDate(input.reviewedAt);

  if (!reviewedAt) {
    return null;
  }

  if (input.latestReviewDecision === "supplement") {
    const remainingHours = getRemainingHours(reviewedAt, 48);

    if (remainingHours <= 0) {
      return "补件已超时，建议立即催办摊主，仍无回应则改判。";
    }

    if (remainingHours <= 24) {
      return `补件将在 ${remainingHours} 小时后超时，建议今天完成催办。`;
    }

    return "补件处理中，建议在截止前至少催办一次。";
  }

  if (input.latestReviewDecision === "waitlist") {
    const remainingHours = getRemainingHours(reviewedAt, 72);

    if (remainingHours <= 0) {
      return "候补观察已到期，建议立即确认补位或释放名额。";
    }

    if (remainingHours <= 24) {
      return `候补观察将在 ${remainingHours} 小时后到期，建议尽快确认是否补位。`;
    }

    return "候补观察中，建议提前确认可补位摊主。";
  }

  return null;
}

export function getOrganizerPaymentFollowUpState(input: {
  orderStatus?: string | null;
  orderCreatedAt?: Date | string | null;
}): OrganizerPaymentFollowUpState {
  const orderCreatedAt = normalizeDate(input.orderCreatedAt);

  if (input.orderStatus !== "pending" || !orderCreatedAt) {
    return "idle";
  }

  const remainingHours = getRemainingHours(orderCreatedAt, 24);

  if (remainingHours <= 12) {
    return "urgent";
  }

  return "watching";
}

export function getOrganizerPaymentFollowUpLabel(state: OrganizerPaymentFollowUpState) {
  if (state === "urgent") {
    return "立即催办";
  }

  if (state === "watching") {
    return "持续跟进";
  }

  return "正常推进";
}

export function getOrganizerPaymentFollowUpNote(input: {
  orderStatus?: string | null;
  orderCreatedAt?: Date | string | null;
}) {
  const orderCreatedAt = normalizeDate(input.orderCreatedAt);

  if (input.orderStatus !== "pending" || !orderCreatedAt) {
    return null;
  }

  const remainingHours = getRemainingHours(orderCreatedAt, 24);

  if (remainingHours <= 0) {
    return "支付已超时，建议立即释放档期并通知下一位候补。";
  }

  if (remainingHours <= 12) {
    return `支付将在 ${remainingHours} 小时后超时，建议立即催办摊主完成支付。`;
  }

  return "待支付订单仍在时效窗口内，可继续观察付款进展。";
}

function normalizeDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRemainingHours(reviewedAt: Date, windowHours: number) {
  const deadline = new Date(reviewedAt.getTime() + windowHours * 60 * 60 * 1000);
  return Math.ceil((deadline.getTime() - Date.now()) / (60 * 60 * 1000));
}

function isConfirmedWaitlistProgress(input: VendorProgressInput) {
  return input.status === "approved" && input.reviewNote === "摊主已确认候补补位";
}

function isExpiredPaymentRelease(input: VendorProgressInput) {
  return input.status === "rejected" && input.reviewNote === "摊位支付超时，已释放档期";
}

export const ORGANIZER_DASHBOARD_PRIORITIES = [
  "待审核申请",
  "待确认摊主",
  "空位风险",
  "补件超时",
] as const;
