import { describe, expect, it, vi, beforeEach } from "vitest";

import { db } from "../../../../../lib/db";
import { getSessionUser } from "../../../../../lib/auth";
import { POST } from "./route";

vi.mock("../../../../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../../../../lib/db", () => ({
  db: {
    order: {
      findUnique: vi.fn()
    },
    notification: {
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

describe("POST /api/payments/[orderId]/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires vendor session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/payments/order_1/pay"), {
      params: Promise.resolve({ orderId: "order_1" })
    });

    expect(response.status).toBe(401);
  });

  it("pays the order successfully", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });

    vi.mocked(db.order.findUnique).mockResolvedValue({
      id: "order_1",
      vendorId: "vendor_1",
      applicationId: "app_1",
      status: "pending",
      amount: 100,
      application: {
        market: {
          title: "春日咖啡市集"
        }
      }
    } as any);

    const transactionMock = {
      order: { update: vi.fn().mockResolvedValue({ id: "order_1", status: "paid" }) },
      application: { update: vi.fn().mockResolvedValue({ id: "app_1", status: "paid" }) }
    };

    vi.mocked(db.$transaction).mockImplementation(async (cb) => {
      return cb(transactionMock as any);
    });
    vi.mocked(db.notification.create).mockResolvedValue({
      id: "notification_1"
    } as any);

    const response = await POST(new Request("http://localhost/api/payments/order_1/pay"), {
      params: Promise.resolve({ orderId: "order_1" })
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("http://localhost/applications");
  });

  it("returns 403 for other vendor's order", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_2",
      role: "vendor"
    });

    vi.mocked(db.order.findUnique).mockResolvedValue({
      id: "order_1",
      vendorId: "vendor_1",
      applicationId: "app_1",
      status: "pending"
    } as any);

    const response = await POST(new Request("http://localhost/api/payments/order_1/pay"), {
      params: Promise.resolve({ orderId: "order_1" })
    });

    expect(response.status).toBe(403);
  });
});
