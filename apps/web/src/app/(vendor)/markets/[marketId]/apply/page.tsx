import { AppShell } from "../../../../../components/layout/app-shell";
import { getDemoMarketById } from "../../../../../server/markets/service";
import { VendorApplyForm } from "./apply-form";

export default async function VendorApplyPage({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = getDemoMarketById(marketId);

  return (
    <AppShell>
      <main aria-labelledby="vendor-apply-title">
        <h2 id="vendor-apply-title">提交报名申请</h2>
        <p>市集编号：{marketId}</p>
        <p>{market?.title ?? "当前市集"}</p>
        <p>{market?.city ?? "城市待确认"}</p>
        <VendorApplyForm marketId={marketId} />
      </main>
    </AppShell>
  );
}
