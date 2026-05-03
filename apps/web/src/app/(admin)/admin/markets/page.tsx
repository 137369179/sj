import { redirect } from "next/navigation";
import Image from "next/image";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import { listAdminMarkets } from "../../../../server/admin/market-service";
import { getMarketStatusLabel } from "../../../../lib/market-status";
import { approveMarketAction, rejectMarketAction } from "./actions";

export default async function AdminMarketsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    redirect("/");
  }

  const markets = await listAdminMarkets();

  return (
    <AppShell>
      <main aria-labelledby="admin-markets-title">
        <h2 id="admin-markets-title">平台运营与审核后台 - 市集大盘巡检</h2>
        <p>当前以平台管理员身份访问。</p>

        <section aria-label="市集列表" style={{ marginTop: "2rem" }}>
          <h3>全部市集</h3>
          {markets.length === 0 ? (
            <p>暂无市集数据。</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {markets.map((market) => (
                <li
                  key={market.id}
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4>
                      {market.title}
                      <span
                        style={{
                          marginLeft: "1rem",
                          fontSize: "0.8rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: market.isPlatformApproved ? "#dcfce7" : "#fee2e2",
                          color: market.isPlatformApproved ? "#166534" : "#991b1b"
                        }}
                      >
                        {market.isPlatformApproved ? "已上架" : "平台巡检中"}
                      </span>
                    </h4>
                    <p>
                      {market.city} · {getMarketStatusLabel(market.status)}
                    </p>
                    <p>主办方：{market.organizer.name}</p>
                    <p>
                      摊位：{market._count.stalls} 个 | 报名：{market._count.applications} 份
                    </p>
                    {market.description && (
                      <p style={{ marginTop: "0.5rem", color: "#4b5563", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                        描述: {market.description.slice(0, 100)}{market.description.length > 100 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  {market.coverUrl && (
                    <div style={{ flexShrink: 0 }}>
                      <Image
                        src={market.coverUrl}
                        alt={`${market.title} 海报`}
                        width={80}
                        height={80}
                        unoptimized
                        style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "4px" }}
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "1rem", flexDirection: "column", alignItems: "flex-end" }}>
                    {market.status === "published" && !market.isPlatformApproved && (
                      <form action={approveMarketAction.bind(null, market.id)}>
                        <button type="submit" style={{ backgroundColor: "#10b981", color: "white" }}>
                          通过上架审核
                        </button>
                      </form>
                    )}
                    {market.status !== "draft" && (
                      <form action={rejectMarketAction.bind(null, market.id)}>
                        <button type="submit" style={{ backgroundColor: "#ef4444", color: "white" }}>
                          强制下架/退回草稿
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
