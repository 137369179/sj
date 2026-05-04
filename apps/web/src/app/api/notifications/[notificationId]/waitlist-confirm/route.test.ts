import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import { confirmWaitlistOffer } from "../../../../../server/applications/service";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../../../../server/applications/service", () => ({
  ApplicationReviewError: class ApplicationReviewError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  confirmWaitlistOffer: vi.fn()
}));

describe("POST /api/notifications/[notificationId]/waitlist-confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms the waitlist offer for the current vendor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(confirmWaitlistOffer).mockResolvedValue({
      application: {
        id: "app_9",
        status: "approved"
      },
      review: {
        id: "review_approve_1",
        reviewNote: "摊主已确认候补补位"
      }
    } as any);

    const response = await POST(new Request("http://localhost/api/notifications/n_waitlist_1/waitlist-confirm", {
      method: "POST"
    }), {
      params: Promise.resolve({ notificationId: "n_waitlist_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      applicationId: "app_9",
      status: "approved",
      message: "已确认候补补位，主办方将继续安排摊位。"
    });
    expect(confirmWaitlistOffer).toHaveBeenCalledWith({
      notificationId: "n_waitlist_1",
      userId: "vendor_1"
    });
  });

  it("returns 403 for unauthenticated users", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/notifications/n_waitlist_1/waitlist-confirm", {
      method: "POST"
    }), {
      params: Promise.resolve({ notificationId: "n_waitlist_1" })
    });

    expect(response.status).toBe(403);
  });
});
