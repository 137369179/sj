import Link from "next/link";

import { AppShell } from "../../../components/layout/app-shell";

const featuredMarkets = [
  {
    id: "spring-coffee",
    title: "春日咖啡市集",
    city: "杭州",
    date: "2026-05-18"
  }
];

export default function VendorMarketsPage() {
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
