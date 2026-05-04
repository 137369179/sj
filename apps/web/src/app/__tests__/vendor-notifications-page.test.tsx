import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listVendorNotifications } from "../../server/notifications/service";
import VendorNotificationsPage from "../(vendor)/notifications/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/notifications/service", () => ({
  listVendorNotifications: vi.fn()
}));

// Mock AppShell to avoid testing async components deeply in the page test
vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("VendorNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders notifications for logged in vendor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([
      {
        id: "n_1",
        title: "测试通知",
        content: "这是一条测试内容",
        isRead: false,
        createdAt: new Date("2026-05-01T10:00:00Z")
      }
    ]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "我的通知" })).toBeInTheDocument();
    expect(screen.getByText("测试通知")).toBeInTheDocument();
    expect(screen.getByText("这是一条测试内容")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "标记为已读" })).toBeInTheDocument();
  });

  it("surfaces focused guidance when supplement and waitlist notifications exist", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([
      {
        id: "n_1",
        title: "申请需要补充资料",
        content: "你在春日咖啡市集的申请需要补充资料后继续审核。",
        isRead: false,
        createdAt: new Date("2026-05-02T10:00:00Z")
      },
      {
        id: "n_2",
        title: "候补补位通知",
        content: "夏夜面包市集出现补位机会，请尽快确认是否接受本次候补递补。",
        isRead: false,
        createdAt: new Date("2026-05-01T11:00:00Z")
      }
    ]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "本周需要关注" })).toBeInTheDocument();
    expect(screen.getByText("补件通知请尽快处理，候补通知建议保留档期。")).toBeInTheDocument();
    expect(screen.getByText("补件将在 22 小时内截止，请优先处理。")).toBeInTheDocument();
    expect(screen.getByText("建议动作优先级：先处理补件，再持续关注候补结果。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认补位" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放弃补位" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "稍后确认" })).toBeInTheDocument();
  });

  it("surfaces payment guidance when stall assignment notification exists", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([
      {
        id: "n_3",
        title: "摊位分配已确认",
        content: "你在夏夜面包市集的申请已完成摊位分配，摊位为面包主通道（B-02）。",
        isRead: false,
        createdAt: new Date("2026-05-03T09:00:00Z")
      }
    ]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "本周需要关注" })).toBeInTheDocument();
    expect(screen.getByText("摊位已分配后请尽快完成支付，避免档期释放。")).toBeInTheDocument();
    expect(screen.getByText("建议动作优先级：先完成支付，再准备进场资料。")).toBeInTheDocument();
    expect(screen.getByText("摊位分配已确认")).toBeInTheDocument();
  });

  it("surfaces arrival guidance when payment completed notification exists", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([
      {
        id: "n_4",
        title: "支付已完成",
        content: "你在夏夜面包市集的摊位费用已支付完成，金额为¥800，本次报名已锁定。",
        isRead: false,
        createdAt: new Date("2026-05-03T12:00:00Z")
      }
    ]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "本周需要关注" })).toBeInTheDocument();
    expect(screen.getByText("支付完成后可开始准备进场资料，并核对摊位信息。")).toBeInTheDocument();
    expect(screen.getByText("建议动作优先级：先核对摊位安排，再准备进场。")).toBeInTheDocument();
    expect(screen.getByText("支付已完成")).toBeInTheDocument();
  });

  it("surfaces reminder guidance when payment reminder notification exists", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([
      {
        id: "n_5",
        title: "支付进度提醒",
        content: "主办方提醒你尽快完成夏夜面包市集的摊位费用支付，当前待支付金额为¥800。",
        isRead: false,
        createdAt: new Date("2026-05-03T12:00:00Z")
      }
    ]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByRole("heading", { name: "本周需要关注" })).toBeInTheDocument();
    expect(screen.getByText("支付提醒已送达，请优先完成当前待支付订单。")).toBeInTheDocument();
    expect(screen.getByText("建议动作优先级：先完成支付，再返回查看分配结果。")).toBeInTheDocument();
    expect(screen.getByText("支付进度提醒")).toBeInTheDocument();
  });

  it("renders empty state when no notifications exist", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "vendor_1",
      role: "vendor"
    });
    vi.mocked(listVendorNotifications).mockResolvedValue([]);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByText("当前暂无通知消息。")).toBeInTheDocument();
  });

  it("prompts to login when session is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await VendorNotificationsPage();
    render(page);

    expect(screen.getByText("请先登录后查看通知。")).toBeInTheDocument();
  });
});
