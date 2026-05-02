import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import {
  ApplicationReviewError,
  buildApplicationReviewPayload,
  reviewApplication
} from "../../../../../server/applications/service";
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
  buildApplicationReviewPayload: vi.fn((input: unknown) => input),
  reviewApplication: vi.fn()
}));

describe("POST /api/applications/[applicationId]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-organizer session users", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_session_1",
      role: "vendor"
    });

    const request = new Request("http://localhost/api/applications/app_1/review", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        decision: "approve"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ applicationId: "app_1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
    expect(reviewApplication).not.toHaveBeenCalled();
  });

  it("returns not found when the application does not exist", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "organizer_session_1",
      role: "organizer"
    });
    vi.mocked(reviewApplication).mockRejectedValue(
      new ApplicationReviewError("NOT_FOUND")
    );

    const request = new Request("http://localhost/api/applications/app_1/review", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        decision: "approve"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ applicationId: "app_1" })
    });

    expect(buildApplicationReviewPayload).toHaveBeenCalledWith({
      organizerId: "organizer_session_1",
      decision: "approve"
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "application not found" });
  });

  it("reviews an application with session organizerId and reviewNote", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "organizer_session_1",
      role: "organizer"
    });
    vi.mocked(reviewApplication).mockResolvedValue({
      application: {
        id: "app_1",
        status: "rejected",
        reviewNote: "资质与本场主题不匹配"
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "申请未通过审核",
        content: "你在春日咖啡市集的申请未通过审核，请调整后重新报名。"
      }
    });

    const request = new Request("http://localhost/api/applications/app_1/review", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        decision: "reject",
        reviewNote: "资质与本场主题不匹配"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ applicationId: "app_1" })
    });

    expect(buildApplicationReviewPayload).toHaveBeenCalledWith({
      organizerId: "organizer_session_1",
      decision: "reject",
      reviewNote: "资质与本场主题不匹配"
    });
    expect(reviewApplication).toHaveBeenCalledWith({
      applicationId: "app_1",
      organizerId: "organizer_session_1",
      decision: "reject",
      reviewNote: "资质与本场主题不匹配"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      application: {
        id: "app_1",
        status: "rejected",
        reviewNote: "资质与本场主题不匹配"
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "申请未通过审核",
        content: "你在春日咖啡市集的申请未通过审核，请调整后重新报名。"
      }
    });
  });
});
