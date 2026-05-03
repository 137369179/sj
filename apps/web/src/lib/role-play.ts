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

export const ORGANIZER_DASHBOARD_PRIORITIES = [
  "待审核申请",
  "待确认摊主",
  "空位风险",
  "补件超时",
] as const;
