import { revalidatePath } from "next/cache";
import Link from "next/link";

import { redirect } from "next/navigation";
import { AppShell } from "../../../../../components/layout/app-shell";
import { DashboardCharts } from "../../../../../components/dashboard/dashboard-charts";
import { getSessionUser } from "../../../../../lib/auth";
import { getMarketDashboardSummary } from "../../../../../server/dashboard/service";
import { listOrganizerMarketOptions } from "../../../../../server/markets/service";
import {
  runAutomaticPaymentReminders,
  runAutomaticPaymentReleases
} from "../../../../../server/payments/service";

type OrganizerDashboardPageProps = {
  params: Promise<{
    marketId: string;
  }>;
  searchParams?: Promise<{
    autoRemindedCount?: string;
    autoReleasedCount?: string;
    from?: string;
    status?: string;
    marketStatus?: string;
  }>;
};

async function runAutomaticPaymentRemindersAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const marketId = String(formData.get("marketId") ?? "");
  const result = await runAutomaticPaymentReminders({
    marketId,
    organizerId: sessionUser.userId
  });
  revalidatePath(`/organizer/dashboard/${marketId}`);

  const params = buildDashboardActionParams(formData);
  params.set("autoRemindedCount", String(result.remindedCount));
  redirect(`/organizer/dashboard/${marketId}?${params.toString()}`);
}

async function runAutomaticPaymentReleasesAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const marketId = String(formData.get("marketId") ?? "");
  const result = await runAutomaticPaymentReleases({
    marketId,
    organizerId: sessionUser.userId
  });
  revalidatePath(`/organizer/dashboard/${marketId}`);

  const params = buildDashboardActionParams(formData);
  params.set("autoReleasedCount", String(result.releasedCount));
  redirect(`/organizer/dashboard/${marketId}?${params.toString()}`);
}

export default async function OrganizerDashboardPage({
  params,
  searchParams
}: OrganizerDashboardPageProps) {
  const { marketId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return (
      <AppShell>
        <main aria-labelledby="organizer-dashboard-title">
          <h2 id="organizer-dashboard-title">市集看板</h2>
          <p>请先以主办方身份登录后查看市集看板。</p>
          <p>当前市集编号：{marketId}</p>
        </main>
      </AppShell>
    );
  }

  const marketOptions = await listOrganizerMarketOptions(sessionUser.userId);
  const summary = await getMarketDashboardSummary({
    organizerId: sessionUser.userId,
    marketId
  });
  const returnContext = buildDashboardReturnContext({
    marketId: summary.market.id,
    from: resolvedSearchParams.from,
    status: resolvedSearchParams.status,
    marketStatus: resolvedSearchParams.marketStatus
  });

  const approvalRateLabel = `${Math.round(summary.metrics.approvalRate * 100)}%`;
  const stallOccupancyRateLabel = `${Math.round(summary.metrics.stallOccupancyRate * 100)}%`;
  const paymentCompletionRateLabel = `${Math.round(summary.metrics.paymentCompletionRate * 100)}%`;
  const paymentReleaseRateLabel = `${Math.round(summary.metrics.paymentReleaseRate * 100)}%`;
  const paymentReminderConversionRateLabel = `${Math.round(
    summary.metrics.paymentReminderConversionRate * 100
  )}%`;

  return (
    <AppShell>
      <main aria-labelledby="organizer-dashboard-title">
        <h2 id="organizer-dashboard-title">市集看板</h2>
        <p>
          {summary.market.title} · {summary.market.city}
        </p>
        <p>市集编号：{summary.market.id}</p>
        <p>用于回看当前招募、审核与摊位分配的最小结果。</p>
        {returnContext ? (
          <section aria-label="来源回跳">
            <p>{returnContext.message}</p>
            <Link href={returnContext.href}>{returnContext.linkLabel}</Link>
          </section>
        ) : null}
        <nav aria-label="当前市集快捷操作">
          <Link
            href={buildDashboardShortcutHref({
              pathname: "/organizer/applications",
              marketId: summary.market.id,
              from: resolvedSearchParams.from,
              status: resolvedSearchParams.status,
              marketStatus: resolvedSearchParams.marketStatus
            })}
          >
            查看当前市集报名申请
          </Link>
          <Link
            href={buildDashboardShortcutHref({
              pathname: "/organizer/stalls",
              marketId: summary.market.id,
              from: resolvedSearchParams.from,
              status: resolvedSearchParams.status,
              marketStatus: resolvedSearchParams.marketStatus
            })}
          >
            查看当前市集摊位
          </Link>
        </nav>
        <aside aria-label="成场风险提醒" style={{ margin: "1.5rem 0" }}>
          <h3>成场风险提醒</h3>
          <p>确认率偏低或空位较多时，优先推进候补补位和摊主确认，避免临近开场仍有空档。</p>
        </aside>
        {marketOptions.length > 0 ? (
          <nav aria-label="切换市集">
            {marketOptions.map((market) => {
              const isCurrent = market.id === summary.market.id;

              return (
                <Link
                  key={market.id}
                  href={buildDashboardMarketHref({
                    marketId: market.id,
                    from: resolvedSearchParams.from,
                    status: resolvedSearchParams.status,
                    marketStatus: resolvedSearchParams.marketStatus
                  })}
                >
                  {isCurrent ? `${market.title}（当前）` : market.title}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <section aria-label="看板指标">
          <article>
            <h3>总报名数</h3>
            <p>{summary.metrics.totalApplications}</p>
          </article>
          <article>
            <h3>待处理</h3>
            <p>{summary.metrics.pendingReviewCount}</p>
          </article>
          <article>
            <h3>已通过</h3>
            <p>{summary.metrics.approvedCount}</p>
          </article>
          <article>
            <h3>已拒绝</h3>
            <p>{summary.metrics.rejectedCount}</p>
          </article>
          <article>
            <h3>已分配</h3>
            <p>{summary.metrics.assignedCount}</p>
          </article>
          <article>
            <h3>已支付</h3>
            <p>{summary.metrics.paidCount}</p>
          </article>
          <article>
            <h3>补件催办</h3>
            <p>{summary.metrics.supplementPendingCount}</p>
          </article>
          <article>
            <h3>候补待决</h3>
            <p>{summary.metrics.waitlistPendingCount}</p>
          </article>
          <article>
            <h3>高优先风险</h3>
            <p>{summary.metrics.followUpUrgentCount}</p>
          </article>
          <article>
            <h3>待支付</h3>
            <p>{summary.metrics.paymentPendingCount}</p>
          </article>
          <article>
            <h3>支付临期</h3>
            <p>{summary.metrics.paymentUrgentCount}</p>
          </article>
          <article>
            <h3>支付超时</h3>
            <p>{summary.metrics.paymentOverdueCount}</p>
          </article>
          <article>
            <h3>总营收</h3>
            <p>¥{summary.metrics.totalRevenue.toFixed(2)}</p>
          </article>
          <article>
            <h3>通过率</h3>
            <p>{approvalRateLabel}</p>
          </article>
          <article>
            <h3>摊位总数</h3>
            <p>{summary.metrics.totalStalls}</p>
          </article>
          <article>
            <h3>启用中摊位</h3>
            <p>{summary.metrics.activeStalls}</p>
          </article>
          <article>
            <h3>摊位利用率</h3>
            <p>{stallOccupancyRateLabel}</p>
          </article>
        </section>

        <section aria-labelledby="payment-funnel-title" style={{ marginTop: "1.5rem" }}>
          <h3 id="payment-funnel-title">支付漏斗</h3>
          <p>用于快速判断当前市集从已创建支付单到完成支付、释放档期的转化情况。</p>
          {typeof resolvedSearchParams.autoRemindedCount === "string" ? (
            <p>已自动催办 {resolvedSearchParams.autoRemindedCount} 笔支付临期订单。</p>
          ) : null}
          {typeof resolvedSearchParams.autoReleasedCount === "string" ? (
            <p>已自动释放 {resolvedSearchParams.autoReleasedCount} 笔支付超时订单。</p>
          ) : null}
          {summary.metrics.paymentUrgentCount > 0 ? (
            <form action={runAutomaticPaymentRemindersAction} aria-label="自动催办表单">
              <input name="marketId" type="hidden" value={summary.market.id} />
              <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
              <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
              <input
                name="marketStatus"
                type="hidden"
                value={resolvedSearchParams.marketStatus ?? ""}
              />
              <button type="submit">执行自动催办</button>
            </form>
          ) : null}
          {summary.metrics.paymentOverdueCount > 0 ? (
            <form action={runAutomaticPaymentReleasesAction} aria-label="自动释放表单">
              <input name="marketId" type="hidden" value={summary.market.id} />
              <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
              <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
              <input
                name="marketStatus"
                type="hidden"
                value={resolvedSearchParams.marketStatus ?? ""}
              />
              <button type="submit">执行自动释放</button>
            </form>
          ) : null}
          <article>
            <h3>已创建支付单</h3>
            <p>{summary.metrics.paymentCreatedCount}</p>
          </article>
          <article>
            <h3>已完成支付</h3>
            <p>{summary.metrics.paymentCompletedCount}</p>
          </article>
          <article>
            <h3>已释放档期</h3>
            <p>{summary.metrics.paymentReleasedCount}</p>
          </article>
          <article>
            <h3>支付完成率</h3>
            <p>{paymentCompletionRateLabel}</p>
          </article>
          <article>
            <h3>释放率</h3>
            <p>{paymentReleaseRateLabel}</p>
          </article>
          <article>
            <h3>已发送催办</h3>
            <p>{summary.metrics.paymentReminderCount}</p>
          </article>
          <article>
            <h3>催办后支付</h3>
            <p>{summary.metrics.paymentReminderConvertedCount}</p>
          </article>
          <article>
            <h3>催办转化率</h3>
            <p>{paymentReminderConversionRateLabel}</p>
          </article>
        </section>

        {summary.recentAutomationActivities.length > 0 ? (
          <section aria-labelledby="recent-automation-title" style={{ marginTop: "1.5rem" }}>
            <h3 id="recent-automation-title">最近自动处理</h3>
            <ul>
              {summary.recentAutomationActivities.map((activity) => (
                <li key={`${activity.title}-${activity.createdAt.toISOString()}`}>
                  <p>{activity.title}</p>
                  <p>{activity.content}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DashboardCharts
          applications={{
            submitted: summary.metrics.submittedCount,
            underReview: summary.metrics.underReviewCount,
            approved: summary.metrics.approvedCount,
            rejected: summary.metrics.rejectedCount,
            assigned: summary.metrics.assignedCount,
            paid: summary.metrics.paidCount
          }}
          stalls={{
            active: summary.metrics.activeStalls,
            occupied: summary.metrics.occupiedStalls
          }}
        />
      </main>
    </AppShell>
  );
}

function buildDashboardReturnContext(input: {
  marketId: string;
  from?: string;
  status?: string;
  marketStatus?: string;
}) {
  if (input.from === "markets") {
    return {
      message: "当前来自我的市集页。",
      linkLabel: "返回我的市集",
      href: buildOrganizerMarketsHref(input.marketStatus)
    };
  }

  if (input.from === "applications") {
    return {
      message: "当前来自报名申请页。",
      linkLabel: "返回当前市集报名申请",
      href: buildOrganizerApplicationsHref({
        marketId: input.marketId,
        status: getOrganizerApplicationStatus(input.status)
      })
    };
  }

  if (input.from === "stalls") {
    return {
      message: "当前来自摊位管理页。",
      linkLabel: "返回当前市集摊位",
      href: buildOrganizerStallsHref({
        marketId: input.marketId,
        status: getOrganizerStallStatus(input.status)
      })
    };
  }

  return null;
}

function getOrganizerApplicationStatus(status: string | undefined) {
  if (status === "submitted" || status === "approved" || status === "rejected") {
    return status;
  }

  return null;
}

function getOrganizerStallStatus(status: string | undefined) {
  if (status === "unassigned" || status === "assigned" || status === "inactive") {
    return status;
  }

  return null;
}

function buildOrganizerApplicationsHref(input: {
  marketId: string;
  status: "submitted" | "approved" | "rejected" | null;
}) {
  const params = new URLSearchParams({
    marketId: input.marketId
  });

  if (input.status) {
    params.set("status", input.status);
  }

  return `/organizer/applications?${params.toString()}`;
}

function buildOrganizerStallsHref(input: {
  marketId: string;
  status: "unassigned" | "assigned" | "inactive" | null;
}) {
  const params = new URLSearchParams({
    marketId: input.marketId
  });

  if (input.status) {
    params.set("status", input.status);
  }

  return `/organizer/stalls?${params.toString()}`;
}

function buildDashboardMarketHref(input: {
  marketId: string;
  from?: string;
  status?: string;
  marketStatus?: string;
}) {
  if (input.from !== "applications" && input.from !== "stalls" && input.from !== "markets") {
    return `/organizer/dashboard/${input.marketId}`;
  }

  const params = new URLSearchParams({
    from: input.from
  });

  if (input.from === "markets") {
    if (typeof input.marketStatus === "string" && input.marketStatus.length > 0) {
      params.set("marketStatus", input.marketStatus);
    }

    return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
  }

  if (typeof input.status === "string" && input.status.length > 0) {
    params.set("status", input.status);
  }

  return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
}

function buildOrganizerMarketsHref(marketStatus: string | undefined) {
  if (marketStatus === "draft" || marketStatus === "published" || marketStatus === "completed") {
    return `/organizer/markets?status=${marketStatus}`;
  }

  return "/organizer/markets";
}

function buildDashboardShortcutHref(input: {
  pathname: "/organizer/applications" | "/organizer/stalls";
  marketId: string;
  from?: string;
  status?: string;
  marketStatus?: string;
}) {
  const params = new URLSearchParams({
    marketId: input.marketId
  });

  if (input.from === "markets") {
    params.set("from", "markets");

    if (
      input.marketStatus === "draft" ||
      input.marketStatus === "published" ||
      input.marketStatus === "completed"
    ) {
      params.set("marketStatus", input.marketStatus);
    }
  }

  if (input.from === "applications") {
    params.set("from", "applications");

    if (input.status === "submitted" || input.status === "approved" || input.status === "rejected") {
      params.set("status", input.status);
    }
  }

  if (input.from === "stalls") {
    params.set("from", "stalls");

    if (input.status === "unassigned" || input.status === "assigned" || input.status === "inactive") {
      params.set("status", input.status);
    }
  }

  return `${input.pathname}?${params.toString()}`;
}

function buildDashboardActionParams(formData: FormData) {
  const params = new URLSearchParams();
  const from = String(formData.get("from") ?? "");
  const status = String(formData.get("status") ?? "");
  const marketStatus = String(formData.get("marketStatus") ?? "");

  if (from === "applications" || from === "stalls" || from === "markets") {
    params.set("from", from);
  }

  if (status) {
    params.set("status", status);
  }

  if (marketStatus) {
    params.set("marketStatus", marketStatus);
  }

  return params;
}
