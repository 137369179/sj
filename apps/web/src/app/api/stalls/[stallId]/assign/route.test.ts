import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionRole } from "../../../../../lib/auth";
import {
  StallAssignmentError,
  assignStall,
  buildAssignStallPayload
} from "../../../../../server/stalls/service";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionRole: vi.fn()
}));

vi.mock("../../../../../server/stalls/service", () => ({
  StallAssignmentError: class StallAssignmentError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  buildAssignStallPayload: vi.fn((input: unknown) => input),
  assignStall: vi.fn()
}));

describe("POST /api/stalls/[stallId]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-organizer roles", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("vendor");

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        applicationId: "app_1"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ stallId: "stall_1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
    expect(assignStall).not.toHaveBeenCalled();
  });

  it("assigns a stall for organizers", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(buildAssignStallPayload).mockReturnValue({
      organizerId: "org_1",
      applicationId: "app_1"
    });
    vi.mocked(assignStall).mockResolvedValue({
      stall: {
        id: "stall_1",
        assignedApplicationId: "app_1"
      },
      application: {
        id: "app_1",
        status: "stall_assigned"
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "摊位分配已确认",
        content: "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。"
      }
    });

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        applicationId: "app_1"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ stallId: "stall_1" })
    });

    expect(buildAssignStallPayload).toHaveBeenCalledWith({
      organizerId: "org_1",
      applicationId: "app_1"
    });
    expect(assignStall).toHaveBeenCalledWith({
      organizerId: "org_1",
      stallId: "stall_1",
      applicationId: "app_1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      stall: {
        id: "stall_1",
        assignedApplicationId: "app_1"
      },
      application: {
        id: "app_1",
        status: "stall_assigned"
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "摊位分配已确认",
        content:
          "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。"
      }
    });
  });

  it("returns conflict when the stall is unavailable", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(buildAssignStallPayload).mockReturnValue({
      organizerId: "org_1",
      applicationId: "app_1"
    });
    vi.mocked(assignStall).mockRejectedValue(
      new StallAssignmentError("STALL_UNAVAILABLE")
    );

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        applicationId: "app_1"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ stallId: "stall_1" })
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: "stall unavailable" });
  });
});
