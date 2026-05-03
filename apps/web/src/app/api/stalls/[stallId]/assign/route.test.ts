import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { getSessionUser } from "../../../../../lib/auth";
import {
  StallAssignmentError,
  assignStall,
  buildAssignStallPayload
} from "../../../../../server/stalls/service";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
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
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
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

  it("uses the session userId instead of organizerId from request body", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(buildAssignStallPayload).mockReturnValue({
      organizerId: "org_body_1",
      applicationId: "app_1"
    });
    vi.mocked(assignStall).mockResolvedValue({
      stall: {
        id: "stall_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        price: 0,
        isActive: true,
        assignedApplicationId: "app_1"
      },
      application: {
        id: "app_1",
        marketId: "market_1",
        vendorId: "vendor_1",
        status: "stall_assigned",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "已录取",
        boothPreference: "靠近主通道",
        attachmentsJson: [],
        reviewedAt: new Date("2026-05-01T01:00:00.000Z"),
        reviewedByUserId: "org_session_1",
        createdAt: new Date("2026-05-01T00:00:00.000Z")
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "摊位分配已确认",
        content: "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。",
        readAt: null,
        createdAt: new Date("2026-05-01T01:00:00.000Z")
      }
    });

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_body_1",
        applicationId: "app_1"
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ stallId: "stall_1" })
    });

    expect(buildAssignStallPayload).toHaveBeenCalledWith({
      organizerId: "org_body_1",
      applicationId: "app_1"
    });
    expect(assignStall).toHaveBeenCalledWith({
      organizerId: "org_session_1",
      stallId: "stall_1",
      applicationId: "app_1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      stall: {
        id: "stall_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位",
        price: 0,
        isActive: true,
        assignedApplicationId: "app_1"
      },
      application: {
        id: "app_1",
        marketId: "market_1",
        vendorId: "vendor_1",
        status: "stall_assigned",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "已录取",
        boothPreference: "靠近主通道",
        attachmentsJson: [],
        reviewedAt: "2026-05-01T01:00:00.000Z",
        reviewedByUserId: "org_session_1",
        createdAt: "2026-05-01T00:00:00.000Z"
      },
      notification: {
        id: "notice_1",
        userId: "vendor_1",
        title: "摊位分配已确认",
        content: "你在春日咖啡市集的申请已完成摊位分配，摊位为主通道 1 号位（A-01）。",
        readAt: null,
        createdAt: "2026-05-01T01:00:00.000Z"
      }
    });
  });

  it("returns conflict when the stall is unavailable", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(buildAssignStallPayload).mockReturnValue({
      organizerId: "org_body_1",
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

  it("returns field errors when the assignment payload is invalid", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(buildAssignStallPayload).mockImplementation(() => {
      throw new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "申请 ID 不能为空",
          path: ["applicationId"]
        }
      ]);
    });

    const request = new Request("http://localhost/api/stalls/stall_1/assign", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        applicationId: ""
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ stallId: "stall_1" })
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "validation failed",
      fieldErrors: {
        applicationId: ["申请 ID 不能为空"]
      }
    });
  });
});
