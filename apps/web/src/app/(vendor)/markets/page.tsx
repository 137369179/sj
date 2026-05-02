import Link from "next/link";

import { AppShell } from "../../../components/layout/app-shell";
import { filterMarkets, listDemoMarkets } from "../../../server/markets/service";

export default async function VendorMarketsPage({
  searchParams
}: {
  searchParams?: Promise<{
    city?: string;
    keyword?: string;
  }>;
}) {
  const filters = (await searchParams) ?? {};
  const featuredMarkets = filterMarkets(listDemoMarkets(), filters);

  return (
    <AppShell>
      <main aria-labelledby="vendor-markets-title">
        <h2 id="vendor-markets-title">发现市集</h2>
        <p>浏览公开招募中的活动，并按城市或关键词快速筛选。</p>
        <form aria-label="市集筛选">
          <label>
            城市
            <input name="city" placeholder="城市" type="text" />
          </label>
          <label>
            关键词
            <input name="keyword" placeholder="关键词" type="text" />
          </label>
          <button type="submit">筛选</button>
        </form>
        <section aria-label="市集列表">
          <ul>
            {featuredMarkets.map((market) => (
              <li key={market.id}>
                <article>
                  <h3>{market.title}</h3>
                  <p>
                    {market.city} | {market.date}
                  </p>
                  <Link href={`/markets/${market.id}`}>查看详情</Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
