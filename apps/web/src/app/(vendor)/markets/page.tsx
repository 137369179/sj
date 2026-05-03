import Link from "next/link";
import Image from "next/image";

import { AppShell } from "../../../components/layout/app-shell";
import { listPublishedMarkets } from "../../../server/markets/service";

export default async function VendorMarketsPage({
  searchParams
}: {
  searchParams?: Promise<{
    city?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const filters = (await searchParams) ?? {};
  let featuredMarkets: Awaited<ReturnType<typeof listPublishedMarkets>> = [];
  let loadError = false;

  try {
    featuredMarkets = await listPublishedMarkets(filters);
  } catch (error) {
    loadError = true;
  }

  return (
    <AppShell>
      <main aria-labelledby="vendor-markets-title">
        <h2 id="vendor-markets-title">发现市集</h2>
        <p>浏览公开招募中的活动，并按城市或关键词快速筛选。</p>
        <section aria-labelledby="vendor-opportunity-title" style={{ margin: "1.5rem 0" }}>
          <h3 id="vendor-opportunity-title">适合我的招募</h3>
          <p>先看时间、城市、费用压力和主办方的处理效率，再决定把精力投入到哪些机会。</p>
          <p>重点关注处理效率、履约口碑和当前开放摊位，避免把时间花在低匹配活动上。</p>
        </section>
        {loadError ? (
          <p role="alert">市集列表暂时不可用，请稍后再试。</p>
        ) : null}
        <form aria-label="市集筛选">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <label>
              城市
              <input name="city" placeholder="城市" type="text" defaultValue={filters.city} />
            </label>
            <label>
              关键词
              <input name="keyword" placeholder="关键词" type="text" defaultValue={filters.keyword} />
            </label>
            <label>
              开始日期
              <input name="dateFrom" type="date" defaultValue={filters.dateFrom} />
            </label>
            <label>
              结束日期
              <input name="dateTo" type="date" defaultValue={filters.dateTo} />
            </label>
            <button type="submit" style={{ alignSelf: "flex-end" }}>筛选</button>
          </div>
        </form>
        <section aria-label="市集列表">
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
            {featuredMarkets.map((market) => (
              <li key={market.id}>
                <article style={{ display: "flex", gap: "1rem", border: "1px solid #e5e7eb", padding: "1rem", borderRadius: "8px" }}>
                  {market.coverUrl && (
                    <Image
                      src={market.coverUrl}
                      alt={`${market.title} 缩略图`}
                      width={120}
                      height={120}
                      unoptimized
                      style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "4px" }}
                    />
                  )}
                  <div>
                    <h3>{market.title}</h3>
                    <p>
                      {market.city} | {formatDate(market.startsAt)}
                    </p>
                    <p>
                      主办方：{market.organizerName} | 启用摊位：{market.stallsCount} 个
                    </p>
                    <p>审核周期：通常 1-3 天内反馈</p>
                    <p>主办方信誉：资料完整，近期有持续招募记录</p>
                    <Link href={`/markets/${market.id}`}>查看详情</Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
