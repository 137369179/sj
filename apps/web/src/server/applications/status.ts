export const applicationStatuses = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "stall_assigned",
  "paid"
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["stall_assigned"],
  rejected: [],
  stall_assigned: ["paid"],
  paid: []
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus
) {
  return allowedTransitions[from].includes(to);
}
