import Link from "next/link";

import { AppShell } from "../../../../../components/layout/app-shell";
import { getDemoMarketById } from "../../../../../server/markets/service";
import { VendorApplyForm } from "./apply-form";

export default async function VendorApplyPage({
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
  const returnToApplications =
    resolvedSearchParams.from === "applications"
      ? buildVendorApplicationsReturnHref({
          marketId,
          status: getVendorApplicationStatus(resolvedSearchParams.status)
        })
      : null;

  return (
    <AppShell>
      <main aria-labelledby="vendor-apply-title">
        <h2 id="vendor-apply-title">提交报名申请</h2>
        <p>市集编号：{marketId}</p>
        <p>{market?.title ?? "当前市集"}</p>
        <p>{market?.city ?? "城市待确认"}</p>
        {returnToApplications ? (
          <section aria-label="报名回跳">
            <p>当前来自我的报名页，可直接返回当前市集的报名记录。</p>
            <Link href={returnToApplications}>返回我的报名</Link>
          </section>
        ) : null}
        <VendorApplyForm
          marketId={marketId}
          applicationsHref={returnToApplications ?? "/applications"}
        />
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
