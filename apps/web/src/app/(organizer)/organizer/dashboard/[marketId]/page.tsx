import { AppShell } from "../../../../../components/layout/app-shell";
import { getMarketDashboardSummary } from "../../../../../server/dashboard/service";

type OrganizerDashboardPageProps = {
  params: Promise<{
    marketId: string;
  }>;
  searchParams: Promise<{
    organizerId?: string;
  }>;
};

export default async function OrganizerDashboardPage({
  params,
  searchParams
}: OrganizerDashboardPageProps) {
  const { marketId } = await params;
  const { organizerId } = await searchParams;

  if (!organizerId) {
    return (
      <AppShell>
        <main aria-labelledby="organizer-dashboard-title">
          <h2 id="organizer-dashboard-title">市集看板</h2>
          <p>请通过 `?organizerId=` 指定当前主办方后查看看板。</p>
          <p>当前市集编号：{marketId}</p>
        </main>
      </AppShell>
    );
  }

  const summary = await getMarketDashboardSummary({
    organizerId,
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
