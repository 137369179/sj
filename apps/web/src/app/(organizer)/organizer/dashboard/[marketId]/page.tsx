import Link from "next/link";

import { AppShell } from "../../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../../lib/auth";
import { getMarketDashboardSummary } from "../../../../../server/dashboard/service";
import { listOrganizerMarketOptions } from "../../../../../server/markets/service";

type OrganizerDashboardPageProps = {
  params: Promise<{
    marketId: string;
  }>;
};

export default async function OrganizerDashboardPage({
  params
}: OrganizerDashboardPageProps) {
  const { marketId } = await params;
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

  const approvalRateLabel = `${Math.round(summary.metrics.approvalRate * 100)}%`;

  return (
    <AppShell>
      <main aria-labelledby="organizer-dashboard-title">
        <h2 id="organizer-dashboard-title">市集看板</h2>
        <p>
          {summary.market.title} · {summary.market.city}
        </p>
        <p>市集编号：{summary.market.id}</p>
        <p>用于回看当前招募、审核与摊位分配的最小结果。</p>
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
                <Link key={market.id} href={`/organizer/dashboard/${market.id}`}>
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
        </section>
      </main>
    </AppShell>
  );
}
