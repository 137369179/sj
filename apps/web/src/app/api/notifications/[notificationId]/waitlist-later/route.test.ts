import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../../../../lib/auth";
import { markNotificationAsRead } from "../../../../../server/notifications/service";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../../../../server/notifications/service", () => ({
  markNotificationAsRead: vi.fn()
}));

describe("POST /api/notifications/[notificationId]/waitlist-later", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the waitlist notification as read and returns defer receipt", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(markNotificationAsRead).mockResolvedValue({
      id: "n_waitlist_3",
      userId: "vendor_1",
      title: "候补补位通知",
      content: "春日咖啡市集出现补位机会，请尽快确认是否接受本次候补递补。",
      readAt: new Date(),
      createdAt: new Date()
    } as any);

    const response = await POST(
      new Request("http://localhost/api/notifications/n_waitlist_3/waitlist-later", {
        method: "POST"
      }),
      {
        params: Promise.resolve({ notificationId: "n_waitlist_3" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "n_waitlist_3",
      isRead: true,
      message: "已记录稍后确认，请在候补截止前返回处理。"
    });
  });
});
