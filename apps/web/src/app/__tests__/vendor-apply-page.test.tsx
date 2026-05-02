import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VendorApplyPage from "../(vendor)/markets/[marketId]/apply/page";

describe("VendorApplyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  function fillAndSubmitForm() {
    fireEvent.change(screen.getByLabelText("摊位偏好"), {
      target: { value: "靠近主通道" }
    });
    fireEvent.change(screen.getByLabelText("报名备注"), {
      target: { value: "主营手作咖啡" }
    });
    fireEvent.change(screen.getByLabelText("附件地址"), {
      target: { value: "https://example.com/license.pdf" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交申请" }));
  }

  it("submits the minimal application form and shows success feedback", async () => {
    vi.mocked(fetch).mockResolvedValue(
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
    expect(screen.getByLabelText("摊位偏好")).toBeInTheDocument();
    expect(screen.getByLabelText("报名备注")).toBeInTheDocument();
    expect(screen.getByLabelText("附件地址")).toBeInTheDocument();
    expect(
      document.querySelector('input[name="marketId"][value="market_1"]')
    ).not.toBeNull();

    fillAndSubmitForm();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/applications",
        expect.objectContaining({
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            marketId: "market_1",
            boothPreference: "靠近主通道",
            applicationNote: "主营手作咖啡",
            attachments: [
              {
                url: "https://example.com/license.pdf",
                originalName: "license.pdf"
              }
            ]
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
});
