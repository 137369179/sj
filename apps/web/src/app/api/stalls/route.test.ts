import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { getSessionRole } from "../../../lib/auth";
import {
  StallCreationError,
  buildStallPayload,
  createStall
} from "../../../server/stalls/service";
import { POST } from "./route";

vi.mock("../../../lib/auth", () => ({
  getSessionRole: vi.fn()
}));

vi.mock("../../../server/stalls/service", () => ({
  StallCreationError: class StallCreationError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  buildStallPayload: vi.fn((input: unknown) => input),
  createStall: vi.fn()
}));

describe("POST /api/stalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-organizer roles", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("vendor");

    const request = new Request("http://localhost/api/stalls", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: "forbidden" });
    expect(createStall).not.toHaveBeenCalled();
  });

  it("creates a stall for organizers", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(buildStallPayload).mockReturnValue({
      organizerId: "org_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      price: 0,
      isActive: true
    });
    vi.mocked(createStall).mockResolvedValue({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      price: 0,
      isActive: true,
      assignedApplicationId: null
    });

    const request = new Request("http://localhost/api/stalls", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        marketId: "market_1",
        code: "A-01",
        name: "主通道 1 号位"
      })
    });

    const response = await POST(request);

    expect(buildStallPayload).toHaveBeenCalledWith({
      organizerId: "org_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位"
    });
    expect(createStall).toHaveBeenCalledWith({
      organizerId: "org_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      price: 0,
      isActive: true
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "stall_1",
      marketId: "market_1",
      code: "A-01",
      name: "主通道 1 号位",
      price: 0,
      isActive: true,
      assignedApplicationId: null
    });
  });

  it("returns not found when the market does not exist", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(buildStallPayload).mockReturnValue({
      organizerId: "org_1",
      marketId: "market_404",
      code: "A-01",
      name: "主通道 1 号位",
      price: 0,
      isActive: true
    });
    vi.mocked(createStall).mockRejectedValue(
      new StallCreationError("MARKET_NOT_FOUND")
    );

    const request = new Request("http://localhost/api/stalls", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        marketId: "market_404",
        code: "A-01",
        name: "主通道 1 号位"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: "market not found" });
  });

  it("returns field errors when the stall payload is invalid", async () => {
    vi.mocked(getSessionRole).mockResolvedValue("organizer");
    vi.mocked(buildStallPayload).mockImplementation(() => {
      throw new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "摊位编码不能为空",
          path: ["code"]
        }
      ]);
    });

    const request = new Request("http://localhost/api/stalls", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        organizerId: "org_1",
        marketId: "market_1",
        code: "",
        name: "主通道 1 号位"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      message: "validation failed",
      fieldErrors: {
        code: ["摊位编码不能为空"]
      }
    });
  });
});
