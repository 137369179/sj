import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import { declineWaitlistOffer } from "../../../../../server/applications/service";
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
  declineWaitlistOffer: vi.fn()
}));

describe("POST /api/notifications/[notificationId]/waitlist-decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("declines the waitlist offer for the current vendor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(declineWaitlistOffer).mockResolvedValue({
      application: {
        id: "app_10",
        status: "rejected"
      },
      review: {
        id: "review_reject_1",
        reviewNote: "摊主已放弃候补补位"
      }
    } as any);

    const response = await POST(
      new Request("http://localhost/api/notifications/n_waitlist_2/waitlist-decline", {
        method: "POST"
      }),
      {
        params: Promise.resolve({ notificationId: "n_waitlist_2" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      applicationId: "app_10",
      status: "rejected",
      message: "已放弃本次候补补位，主办方会继续处理候补名单。"
    });
    expect(declineWaitlistOffer).toHaveBeenCalledWith({
      notificationId: "n_waitlist_2",
      userId: "vendor_1"
    });
  });
});
