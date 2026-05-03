import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "../../lib/auth";
import { listOrganizerMarkets } from "../../server/markets/service";
import OrganizerMarketsPage from "../(organizer)/organizer/markets/page";

vi.mock("../../lib/auth", () => ({
  getSessionUser: vi.fn()
}));

vi.mock("../../server/markets/service", () => ({
  listOrganizerMarkets: vi.fn()
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

describe("Organizer markets page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders publish error when the organizer is unverified", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_session_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        status: "draft",
        isPlatformApproved: false
      }
    ]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({ publishError: "UNVERIFIED_ORGANIZER" })
    });
    render(page);

    expect(screen.getByRole("alert")).toHaveTextContent("发布失败：主办方资质未认证，无法发布市集。请联系平台管理员。");
  });

  it("renders organizer markets from session identity with management links", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        status: "published",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z"),
        isPlatformApproved: true
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        status: "draft",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        isPlatformApproved: false
      }
    ]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(listOrganizerMarkets).toHaveBeenCalledWith("org_1");
    expect(screen.getByRole("heading", { name: "我的市集" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "招募进度总览" })).toBeInTheDocument();
    expect(screen.getByText("待审核申请")).toBeInTheDocument();
    expect(screen.getByText("空位风险")).toBeInTheDocument();
    expect(screen.getByLabelText("开始时间")).toBeInTheDocument();
    expect(screen.getByLabelText("结束时间")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建草稿" })).toBeInTheDocument();
    expect(screen.getByText("夏夜面包市集")).toBeInTheDocument();
    expect(screen.getByText("上海 · 已发布")).toBeInTheDocument();
    expect(screen.getByText("2026-06-08 至 2026-06-08")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "夏夜面包市集 查看报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=markets"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集 摊位管理" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=markets"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集 查看市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=markets"
    );
    expect(screen.getByText("春日咖啡市集")).toBeInTheDocument();
    expect(screen.getByText("杭州 · 草稿")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布 春日咖啡市集" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发布 夏夜面包市集" })).not.toBeInTheDocument();

    expect(screen.queryByText("平台巡检中")).not.toBeInTheDocument();
  });

  it("renders pending approval status when market is published but not platform approved", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        status: "published",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        isPlatformApproved: false
      }
    ]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("平台巡检中")).toBeInTheDocument();
  });

  it("renders market summary metrics and filters markets by status from search params", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([
      {
        id: "market_3",
        title: "秋日手作市集",
        city: "南京",
        status: "completed",
        startsAt: new Date("2026-07-08T10:00:00.000Z"),
        endsAt: new Date("2026-07-08T18:00:00.000Z"),
        isPlatformApproved: true,
      },
      {
        id: "market_2",
        title: "夏夜面包市集",
        city: "上海",
        status: "published",
        startsAt: new Date("2026-06-08T10:00:00.000Z"),
        endsAt: new Date("2026-06-08T18:00:00.000Z"),
        isPlatformApproved: true
      },
      {
        id: "market_1",
        title: "春日咖啡市集",
        city: "杭州",
        status: "draft",
        startsAt: new Date("2026-05-18T10:00:00.000Z"),
        endsAt: new Date("2026-05-18T18:00:00.000Z"),
        isPlatformApproved: false
      }
    ]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({ status: "published" })
    });

    render(page);

    expect(screen.getByText("全部市集：3")).toBeInTheDocument();
    expect(screen.getByText("草稿：1")).toBeInTheDocument();
    expect(screen.getByText("已发布：1")).toBeInTheDocument();
    expect(screen.getByText("已完成：1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部（3）" })).toHaveAttribute(
      "href",
      "/organizer/markets"
    );
    expect(screen.getByRole("link", { name: "草稿（1）" })).toHaveAttribute(
      "href",
      "/organizer/markets?status=draft"
    );
    expect(screen.getByRole("link", { name: "已发布（1）" })).toHaveAttribute(
      "href",
      "/organizer/markets?status=published"
    );
    expect(screen.getByRole("link", { name: "已完成（1）" })).toHaveAttribute(
      "href",
      "/organizer/markets?status=completed"
    );
    expect(screen.getByText("夏夜面包市集")).toBeInTheDocument();
    expect(screen.queryByText("春日咖啡市集")).not.toBeInTheDocument();
    expect(screen.queryByText("秋日手作市集")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "夏夜面包市集 查看报名申请" })).toHaveAttribute(
      "href",
      "/organizer/applications?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集 摊位管理" })).toHaveAttribute(
      "href",
      "/organizer/stalls?marketId=market_2&from=markets&marketStatus=published"
    );
    expect(screen.getByRole("link", { name: "夏夜面包市集 查看市集看板" })).toHaveAttribute(
      "href",
      "/organizer/dashboard/market_2?from=markets&marketStatus=published"
    );
  });

  it("renders empty state for organizer without markets", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("当前还没有市集，请先创建草稿。")).toBeInTheDocument();
  });

  it("renders field errors from create market validation feedback", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({
        startsAtError: "开始时间不能晚于结束时间",
        endsAtError: "结束时间不能早于开始时间"
      })
    });

    render(page);

    expect(screen.getByText("开始时间不能晚于结束时间")).toBeInTheDocument();
    expect(screen.getByText("结束时间不能早于开始时间")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("请修复以下字段错误后重新提交：");
  });

  it("prompts for organizer login when the session identity is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({})
    });

    render(page);

    expect(screen.getByText("请先以主办方身份登录后管理市集。")).toBeInTheDocument();
    expect(listOrganizerMarkets).not.toHaveBeenCalled();
  });

  it("renders publish error when the action fails", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      userId: "org_1",
      role: "organizer"
    });
    vi.mocked(listOrganizerMarkets).mockResolvedValue([]);

    const page = await OrganizerMarketsPage({
      searchParams: Promise.resolve({
        publishError: "INVALID_STATUS"
      })
    });

    render(page);

    expect(
      screen.getByText("发布失败：市集当前状态无法发布，请确保市集包含至少一个摊位。")
    ).toBeInTheDocument();
  });
});
