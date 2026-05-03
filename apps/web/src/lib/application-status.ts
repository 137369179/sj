import type { ApplicationStatus } from "../server/applications/status";

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  submitted: "待审核",
  under_review: "审核中",
  approved: "已通过",
  rejected: "已拒绝",
  stall_assigned: "已分配摊位",
  paid: "已支付"
};

export function getApplicationStatusLabel(status: ApplicationStatus) {
  return applicationStatusLabels[status];
}
