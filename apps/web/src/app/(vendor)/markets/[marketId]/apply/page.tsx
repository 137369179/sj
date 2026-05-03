import Link from "next/link";

import { AppShell } from "../../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../../lib/auth";
import { listVendorApplications } from "../../../../../server/applications/service";
import { getPublishedMarketById } from "../../../../../server/markets/service";
import { VendorApplyForm } from "./apply-form";

export default async function VendorApplyPage({
  params,
  searchParams
}: {
  params: Promise<{ marketId: string }>;
  searchParams?: Promise<{
    from?: string;
    status?: string;
    applicationId?: string;
    action?: string;
  }>;
}) {
  const { marketId } = await params;
  const market = await getPublishedMarketById(marketId);
  const resolvedSearchParams = (await searchParams) ?? {};
  const returnToApplications =
    resolvedSearchParams.from === "applications"
      ? buildVendorApplicationsReturnHref({
          marketId,
          status: getVendorApplicationStatus(resolvedSearchParams.status)
        })
      : null;
  const supplementApplicationId =
    resolvedSearchParams.action === "supplement" &&
    typeof resolvedSearchParams.applicationId === "string" &&
    resolvedSearchParams.applicationId.length > 0
      ? resolvedSearchParams.applicationId
      : null;
  const sessionUser = supplementApplicationId ? await getSessionUser() : null;
  const supplementApplication =
    supplementApplicationId && sessionUser?.role === "vendor"
      ? (await listVendorApplications(sessionUser.userId)).find(
          (application) =>
            application.id === supplementApplicationId &&
            application.latestReviewDecision === "supplement"
        ) ?? null
      : null;

  return (
    <AppShell>
      <main aria-labelledby="vendor-apply-title">
        <h2 id="vendor-apply-title">提交报名申请</h2>
        <p>市集编号：{marketId}</p>
        <p>{market?.title ?? "当前市集暂不可报名"}</p>
        <p>{market?.city ?? "请返回发现市集查看其他公开招募中的活动。"}</p>
        {market ? (
          <section aria-labelledby="vendor-apply-checklist-title" style={{ margin: "1.5rem 0" }}>
            <h3 id="vendor-apply-checklist-title">报名前先确认</h3>
            <p>报名截止前可提交，补件和确认逾期将影响本次机会，也会降低后续活动的审核效率。</p>
            <p>优先完善通用资料和附件，可减少重复填写，让主办方更快判断你是否适合本场市集。</p>
          </section>
        ) : null}
        {returnToApplications ? (
          <section aria-label="报名回跳">
            <p>当前来自我的报名页，可直接返回当前市集的报名记录。</p>
            <Link href={returnToApplications}>返回我的报名</Link>
          </section>
        ) : null}
        {supplementApplicationId ? (
          <section aria-label="补件提示" style={{ marginBottom: "1rem" }}>
            <p>当前正在补件，请根据主办方要求更新资料后再次提交。</p>
            {supplementApplication?.reviewNote ? (
              <p>本次补件要求：{supplementApplication.reviewNote}</p>
            ) : null}
          </section>
        ) : null}
        {market ? (
          <VendorApplyForm
            marketId={marketId}
            applicationsHref={returnToApplications ?? "/applications"}
            applicationId={supplementApplicationId ?? undefined}
            mode={supplementApplicationId ? "supplement" : "create"}
            initialApplicationNote={supplementApplication?.applicationNote ?? undefined}
            existingAttachments={supplementApplication?.attachments ?? []}
          />
        ) : (
          <section aria-label="报名不可用提示">
            <p>当前市集未公开招募或不存在，暂时不能提交报名。</p>
            <Link href="/markets">返回发现市集</Link>
          </section>
        )}
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
