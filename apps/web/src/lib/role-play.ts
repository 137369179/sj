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

export const ORGANIZER_DASHBOARD_PRIORITIES = [
  "待审核申请",
  "待确认摊主",
  "空位风险",
  "补件超时",
] as const;
