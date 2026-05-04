import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listVendorApplications } from "../../server/applications/service";
import { getPublishedMarketById } from "../../server/markets/service";
import VendorApplyPage from "../(vendor)/markets/[marketId]/apply/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/applications/service", () => ({
  listVendorApplications: vi.fn()
}));

vi.mock("../../server/markets/service", () => ({
  getPublishedMarketById: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("VendorApplyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorApplications).mockResolvedValue([]);
    vi.mocked(getPublishedMarketById).mockResolvedValue({
      id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        status: "published",
        organizerName: "Org 1",
        stallsCount: 10
      });
  });

  function fillAndSubmitForm(options?: { withFile?: boolean; submitLabel?: string }) {
    fireEvent.change(screen.getByLabelText("摊位偏好"), {
      target: { value: "靠近主通道" }
    });
    fireEvent.change(screen.getByLabelText("报名备注"), {
      target: { value: "主营手作咖啡" }
    });

    if (options?.withFile) {
      const file = new File(["license"], "license.pdf", {
        type: "application/pdf"
      });
      fireEvent.change(screen.getByLabelText("附件文件"), {
        target: { files: [file] }
      });
    }

    fireEvent.click(
      screen.getByRole("button", { name: options?.submitLabel ?? "提交申请" })
    );
  }

  it("uploads the selected file before submitting the application and shows success feedback", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: "/uploads/license.pdf",
            originalName: "license.pdf"
          }),
          {
            status: 201,
            headers: {
              "content-type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "app_1" }), {
        status: 201,
        headers: {
          "content-type": "application/json"
        }
      })
      );

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    expect(
      screen.getByRole("heading", { name: "提交报名申请" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "报名前先确认" })).toBeInTheDocument();
    expect(screen.getByText(/补件和确认逾期将影响本次机会/)).toBeInTheDocument();
    expect(screen.getByText(/优先完善通用资料/)).toBeInTheDocument();
    expect(screen.getByLabelText("摊位偏好")).toBeInTheDocument();
    expect(screen.getByLabelText("报名备注")).toBeInTheDocument();
    expect(screen.getByLabelText("附件文件")).toBeInTheDocument();
    expect(
      document.querySelector('input[name="marketId"][value="market_1"]')
    ).not.toBeNull();

    fillAndSubmitForm({ withFile: true });

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        "/api/uploads",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        "/api/applications",
        expect.objectContaining({
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            boothPreference: "靠近主通道",
            applicationNote: "主营手作咖啡",
            attachments: [
              {
                url: "/uploads/license.pdf",
                originalName: "license.pdf"
              }
            ],
            marketId: "market_1"
          })
        })
      );
    });

    expect(screen.getByText("报名提交成功，可前往我的报名查看进度。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看我的报名" })).toHaveAttribute(
      "href",
      "/applications"
    );
  });

  it("shows a sign-in message when the application API returns unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    fillAndSubmitForm();

    expect(
      await screen.findByText("请先以摊主身份登录后再提交报名。")
    ).toBeInTheDocument();
  });

  it("shows a vendor-only message when the application API returns forbidden", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    fillAndSubmitForm();

    expect(
      await screen.findByText("当前账号没有报名权限，请切换为摊主账号。")
    ).toBeInTheDocument();
  });

  it("shows a duplicate message when the application API returns conflict", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "duplicate application" }), {
        status: 409,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    fillAndSubmitForm();

    expect(
      await screen.findByText("你已经提交过该市集的报名，请前往我的报名查看进度。")
    ).toBeInTheDocument();
  });

  it("shows an upload error when the attachment upload fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "unsupported file type" }), {
        status: 415,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" })
      })
    );

    fillAndSubmitForm({ withFile: true });

    expect(
      await screen.findByText("附件上传失败，请更换 JPG、PNG、WEBP 或 PDF 文件后重试。")
    ).toBeInTheDocument();
  });

  it("renders an applications return link when opened from vendor applications", async () => {
    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" }),
        searchParams: Promise.resolve({
          from: "applications",
          status: "approved"
        })
      })
    );

    expect(screen.getByText("当前来自我的报名页，可直接返回当前市集的报名记录。")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "返回我的报名" })
    ).toHaveAttribute("href", "/applications?marketId=market_1&status=approved");
  });

  it("submits supplement updates through the application patch route", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "app_2" }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );
    vi.mocked(listVendorApplications).mockResolvedValue([
      {
        id: "app_2",
        marketId: "market_1",
        marketTitle: "春日咖啡市集",
        marketCity: "杭州",
        status: "under_review",
        taskGroup: "pending-action",
        latestReviewDecision: "supplement",
        note: "主营手作咖啡",
        applicationNote: "主营手作咖啡",
        reviewNote: "请补充近三次摆摊照片",
        attachments: [
          {
            url: "/uploads/menu.pdf",
            originalName: "menu.pdf"
          }
        ],
        reviewedAt: new Date("2026-05-02T09:00:00.000Z"),
        reviews: [
          {
            id: "review_3",
            applicationId: "app_2",
            organizerId: "org_1",
            decision: "supplement",
            reviewNote: "请补充近三次摆摊照片",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          }
        ],
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        assignedStallId: null,
        assignedStallCode: null,
        assignedStallName: null,
        assignedStallPrice: null,
        orderId: null,
        orderAmount: null,
        orderStatus: null,
        orderPaymentMethod: null,
        orderPaidAt: null
      }
    ]);

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "market_1" }),
        searchParams: Promise.resolve({
          from: "applications",
          applicationId: "app_2",
          action: "supplement"
        })
      })
    );

    expect(screen.getByText("当前正在补件，请根据主办方要求更新资料后再次提交。")).toBeInTheDocument();
    expect(screen.getByText("本次补件要求：请补充近三次摆摊照片")).toBeInTheDocument();
    expect(screen.getByText("当前已提交资料")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "menu.pdf" })).toHaveAttribute(
      "href",
      "/uploads/menu.pdf"
    );
    expect(screen.getByRole("button", { name: "提交补件" })).toBeInTheDocument();

    fillAndSubmitForm({ submitLabel: "提交补件" });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/applications/app_2",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            boothPreference: "靠近主通道",
            applicationNote: "主营手作咖啡",
            attachments: []
          })
        })
      );
    });

    expect(
      await screen.findByText("补件已提交，可返回我的报名查看最新进度。")
    ).toBeInTheDocument();
  });

  it("shows an unavailable message instead of the form when the market is not published", async () => {
    vi.mocked(getPublishedMarketById).mockResolvedValue(null);

    render(
      await VendorApplyPage({
        params: Promise.resolve({ marketId: "missing_market" })
      })
    );

    expect(screen.getByText("当前市集未公开招募或不存在，暂时不能提交报名。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交申请" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回发现市集" })).toHaveAttribute(
      "href",
      "/markets"
    );
  });
});
