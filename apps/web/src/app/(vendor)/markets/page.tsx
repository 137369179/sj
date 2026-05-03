import Link from "next/link";

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
  const featuredMarkets = await listPublishedMarkets(filters);

  return (
    <AppShell>
      <main aria-labelledby="vendor-markets-title">
        <h2 id="vendor-markets-title">发现市集</h2>
        <p>浏览公开招募中的活动，并按城市或关键词快速筛选。</p>
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
                    <img
                      src={market.coverUrl}
                      alt={`${market.title} 缩略图`}
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
