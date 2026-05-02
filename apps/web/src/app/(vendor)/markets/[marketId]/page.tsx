import Link from "next/link";

import { AppShell } from "../../../../components/layout/app-shell";

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;

  return (
    <AppShell>
      <main aria-labelledby="market-detail-title">
        <h2 id="market-detail-title">市集详情</h2>
        <p>市集编号：{marketId}</p>
        <p>查看基础招募信息后，可继续进入报名页面提交申请。</p>
        <Link href={`/markets/${marketId}/apply`}>立即报名</Link>
      </main>
    </AppShell>
  );
}
