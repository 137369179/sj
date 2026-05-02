import Link from "next/link";

import { AppShell } from "../../../../components/layout/app-shell";
import { getDemoMarketById } from "../../../../server/markets/service";

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = getDemoMarketById(marketId);

  return (
    <AppShell>
      <main aria-labelledby="market-detail-title">
        <h2 id="market-detail-title">{market?.title ?? "市集详情"}</h2>
        <p>市集编号：{marketId}</p>
        {market ? (
          <>
            <p>{market.city}</p>
            <p>{market.date}</p>
            <p>{market.description}</p>
          </>
        ) : null}
        <p>查看基础招募信息后，可继续进入报名页面提交申请。</p>
        <Link href={`/markets/${marketId}/apply`}>立即报名</Link>
      </main>
    </AppShell>
  );
}
