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

describe("POST /api/notifications/[notificationId]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the notification as read and returns success", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(markNotificationAsRead).mockResolvedValue({
      id: "n_1",
      userId: "vendor_1",
      title: "Test",
      content: "Content",
      readAt: new Date(),
      createdAt: new Date()
    });

    const request = new Request("http://localhost/api/notifications/n_1/read", {
      method: "POST"
    });
    const response = await POST(request, {
      params: Promise.resolve({ notificationId: "n_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "n_1",
      isRead: true
    });
    expect(markNotificationAsRead).toHaveBeenCalledWith({
      notificationId: "n_1",
      userId: "vendor_1"
    });
  });

  it("returns 403 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const request = new Request("http://localhost/api/notifications/n_1/read", {
      method: "POST"
    });
    const response = await POST(request, {
      params: Promise.resolve({ notificationId: "n_1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
  });

  it("returns 404 when notification is not found", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(markNotificationAsRead).mockRejectedValue(new Error("NOTIFICATION_NOT_FOUND"));

    const request = new Request("http://localhost/api/notifications/n_1/read", {
      method: "POST"
    });
    const response = await POST(request, {
      params: Promise.resolve({ notificationId: "n_1" })
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when forbidden", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(markNotificationAsRead).mockRejectedValue(new Error("FORBIDDEN"));

    const request = new Request("http://localhost/api/notifications/n_1/read", {
      method: "POST"
    });
    const response = await POST(request, {
      params: Promise.resolve({ notificationId: "n_1" })
    });

    expect(response.status).toBe(403);
  });
});