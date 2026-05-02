import Link from "next/link";

import { AppShell } from "../../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../../lib/auth";
import { getMarketDashboardSummary } from "../../../../../server/dashboard/service";
import { listOrganizerMarketOptions } from "../../../../../server/markets/service";

type OrganizerDashboardPageProps = {
  params: Promise<{
    marketId: string;
  }>;
  searchParams?: Promise<{
    from?: string;
    status?: string;
  }>;
};

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
          <p>请先以主办方身份登录后查看看板。</p>
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
    status: resolvedSearchParams.status
  });

  const approvalRateLabel = `${Math.round(summary.metrics.approvalRate * 100)}%`;
  const stallOccupancyRateLabel = `${Math.round(summary.metrics.stallOccupancyRate * 100)}%`;

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
          <Link href={`/organizer/applications?marketId=${summary.market.id}`}>
            查看当前市集申请
          </Link>
          <Link href={`/organizer/stalls?marketId=${summary.market.id}`}>
            查看当前市集摊位
          </Link>
        </nav>
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
                    status: resolvedSearchParams.status
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
      </main>
    </AppShell>
  );
}

function buildDashboardReturnContext(input: {
  marketId: string;
  from?: string;
  status?: string;
}) {
  if (input.from === "applications") {
    return {
      message: "当前来自报名申请页。",
      linkLabel: "返回当前市集申请",
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
}) {
  if (input.from !== "applications" && input.from !== "stalls") {
    return `/organizer/dashboard/${input.marketId}`;
  }

  const params = new URLSearchParams({
    from: input.from
  });

  if (typeof input.status === "string" && input.status.length > 0) {
    params.set("status", input.status);
  }

  return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
}
