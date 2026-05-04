import Link from "next/link";
import Image from "next/image";

import { AppShell } from "../../../../components/layout/app-shell";
import { getPublishedMarketById } from "../../../../server/markets/service";
import { listAvailableStallsForMarket } from "../../../../server/stalls/service";

export default async function MarketDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ marketId: string }>;
  searchParams?: Promise<{
    from?: string;
    status?: string;
  }>;
}) {
  const { marketId } = await params;
  const market = await getPublishedMarketById(marketId);
  const availableStalls = market ? await listAvailableStallsForMarket(marketId) : [];
  const resolvedSearchParams = (await searchParams) ?? {};
  const applyHref = buildVendorApplyHref({
    marketId,
    from: resolvedSearchParams.from,
    status: getVendorApplicationStatus(resolvedSearchParams.status)
  });
  const returnToApplications =
    resolvedSearchParams.from === "applications"
      ? buildVendorApplicationsReturnHref({
          marketId,
          status: getVendorApplicationStatus(resolvedSearchParams.status)
        })
      : null;

  return (
    <AppShell>
      <main aria-labelledby="market-detail-title">
        <h2 id="market-detail-title">{market?.title ?? "市集详情"}</h2>
        <p>市集编号：{marketId}</p>
        {market ? (
          <>
            {market.coverUrl && (
              <Image
                src={market.coverUrl}
                alt={`${market.title} 海报`}
                width={1200}
                height={675}
                unoptimized
                style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", margin: "1rem 0" }}
              />
            )}
            <p>
              {market.city} · {formatDate(market.startsAt)} 至 {formatDate(market.endsAt)}
            </p>
            <p>
              主办方：{market.organizerName} | 启用摊位：{market.stallsCount} 个
            </p>
            {market.description && (
              <div style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
                <strong>市集介绍：</strong>
                <p>{market.description}</p>
              </div>
            )}
            <p style={{ marginTop: "2rem" }}>当前市集正在公开招募中，可继续进入报名页面提交申请。</p>

            <section aria-label="可用摊位一览" style={{ marginTop: "2rem" }}>
              <h3>可用摊位一览</h3>
              {availableStalls.length === 0 ? (
                <p>暂无可供选择的摊位。</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {availableStalls.map((stall) => (
                    <li key={stall.id} style={{ padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: "4px" }}>
                      <strong>{stall.code}</strong> - {stall.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p>当前市集暂不可查看或未公开招募。</p>
        )}
        {returnToApplications ? (
          <section aria-label="报名回跳">
            <p>当前来自我的报名页，可直接返回当前市集的报名记录。</p>
            <Link href={returnToApplications}>返回我的报名</Link>
          </section>
        ) : null}
        <section aria-label="报名入口">
          {market ? <Link href={applyHref}>立即报名</Link> : null}
          <Link href={returnToApplications ?? "/applications"}>查看我的报名</Link>
        </section>
      </main>
    </AppShell>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getVendorApplicationStatus(status: string | undefined) {
  if (status === "submitted" || status === "approved" || status === "stall_assigned") {
    return status;
  }

  return null;
}

function buildVendorApplicationsReturnHref(input: {
  marketId: string;
  status: "submitted" | "approved" | "stall_assigned" | null;
}) {
  const params = new URLSearchParams({
    marketId: input.marketId
  });

  if (input.status) {
    params.set("status", input.status);
  }

  return `/applications?${params.toString()}`;
}

function buildVendorApplyHref(input: {
  marketId: string;
  from?: string;
  status: "submitted" | "approved" | "stall_assigned" | null;
}) {
  if (input.from !== "applications") {
    return `/markets/${input.marketId}/apply`;
  }

  const params = new URLSearchParams({
    from: "applications"
  });

  if (input.status) {
    params.set("status", input.status);
  }

  return `/markets/${input.marketId}/apply?${params.toString()}`;
}
