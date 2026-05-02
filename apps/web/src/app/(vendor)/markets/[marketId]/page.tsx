import Link from "next/link";

import { AppShell } from "../../../../components/layout/app-shell";
import { getDemoMarketById } from "../../../../server/markets/service";

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
  const market = getDemoMarketById(marketId);
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
            <p>{market.city}</p>
            <p>{market.date}</p>
            <p>{market.description}</p>
          </>
        ) : null}
        <p>查看基础招募信息后，可继续进入报名页面提交申请。</p>
        {returnToApplications ? (
          <section aria-label="报名回跳">
            <p>当前来自我的报名页。</p>
            <Link href={returnToApplications}>返回我的报名</Link>
          </section>
        ) : null}
        <section aria-label="报名入口">
          <Link href={applyHref}>立即报名</Link>
          <Link href={returnToApplications ?? "/applications"}>查看我的报名</Link>
        </section>
      </main>
    </AppShell>
  );
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
