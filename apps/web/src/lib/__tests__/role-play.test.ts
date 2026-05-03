import { describe, expect, it } from "vitest";

import {
  ORGANIZER_DASHBOARD_PRIORITIES,
  ROLE_GUIDANCE,
  ROLE_LABELS,
  VENDOR_APPLICATION_TASK_GROUPS,
} from "../role-play";

describe("role-play metadata", () => {
  it("defines readable labels and guidance for vendor and organizer roles", () => {
    expect(ROLE_LABELS.vendor).toBe("摊主");
    expect(ROLE_LABELS.organizer).toBe("主办方");
    expect(ROLE_GUIDANCE.organizer).toContain("发布市集");
  });

  it("defines vendor task groups and organizer priorities", () => {
    expect(VENDOR_APPLICATION_TASK_GROUPS[0].id).toBe("pending-action");
    expect(ORGANIZER_DASHBOARD_PRIORITIES).toContain("待审核申请");
  });
});
