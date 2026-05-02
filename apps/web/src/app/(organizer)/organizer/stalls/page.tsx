import { revalidatePath } from "next/cache";
import Link from "next/link";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import { listOrganizerMarketOptions } from "../../../../server/markets/service";
import { listOrganizerApplications } from "../../../../server/applications/service";
import {
  assignStall,
  buildAssignStallPayload,
  buildStallPayload,
  createStall,
  listOrganizerStalls
} from "../../../../server/stalls/service";

async function createStallAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const marketId = String(formData.get("marketId") ?? "");
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");
  const payload = buildStallPayload({
    organizerId: sessionUser.userId,
    marketId,
    code,
    name
  });

  await createStall(payload);
  revalidatePath("/organizer/stalls");
}

async function assignStallAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const stallId = String(formData.get("stallId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const payload = buildAssignStallPayload({
    organizerId: sessionUser.userId,
    applicationId
  });

  await assignStall({
    stallId,
    ...payload
  });
  revalidatePath("/organizer/stalls");
}

type OrganizerStallsPageProps = {
  searchParams?: Promise<{
    status?: string;
    marketId?: string;
    from?: string;
    marketStatus?: string;
    sourceStatus?: string;
  }>;
};

export default async function OrganizerStallsPage({
  searchParams
}: OrganizerStallsPageProps) {
  const sessionUser = await getSessionUser();
  const isOrganizerSession = sessionUser?.role === "organizer";
  const stalls = isOrganizerSession
    ? await listOrganizerStalls(sessionUser.userId)
    : [];
  const marketOptions = isOrganizerSession
    ? await listOrganizerMarketOptions(sessionUser.userId)
    : [];
  const applications = isOrganizerSession
    ? await listOrganizerApplications(sessionUser.userId)
    : [];
  const approvedApplications = applications.filter(
    (application) => application.status === "approved"
  );
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedMarketId = getSelectedMarketId(resolvedSearchParams.marketId);
  const marketScopedStalls = selectedMarketId
    ? stalls.filter((stall) => stall.marketId === selectedMarketId)
    : stalls;
  const marketScopedApplications = selectedMarketId
    ? approvedApplications.filter((application) => application.marketId === selectedMarketId)
    : approvedApplications;
  const selectedStatus = getSelectedStatus(resolvedSearchParams.status);
  const filteredStalls =
    selectedStatus === "all"
      ? marketScopedStalls
      : marketScopedStalls.filter((stall) => getStallFilterStatus(stall) === selectedStatus);
  const summary = buildStallSummary(marketScopedStalls);
  const sourceApplicationStatus = getOrganizerApplicationStatus(
    resolvedSearchParams.sourceStatus ?? resolvedSearchParams.status
  );
  const applicationsReturnHref =
    resolvedSearchParams.from === "applications"
      ? buildOrganizerApplicationsReturnHref({
          marketId: selectedMarketId,
          status: sourceApplicationStatus
        })
      : null;
  const organizerMarketsHref = buildOrganizerMarketsHref(resolvedSearchParams.marketStatus);
  const currentMarketTitle =
    selectedMarketId &&
    (marketScopedStalls.find((stall) => stall.marketId === selectedMarketId)?.marketTitle ??
      marketOptions.find((market) => market.id === selectedMarketId)?.title);

  return (
    <AppShell>
      <main aria-labelledby="organizer-stalls-title">
        <h2 id="organizer-stalls-title">摊位管理</h2>
        <p>基于已审核通过的报名结果，创建摊位并完成最小分配闭环。</p>

        {!isOrganizerSession ? (
          <p>请先以主办方身份登录后管理摊位。</p>
        ) : null}

        {isOrganizerSession ? (
          <>
            {applicationsReturnHref ? (
              <section aria-label="来源回跳">
                <p>当前来自报名申请页。</p>
                <Link href={applicationsReturnHref}>返回当前市集报名申请</Link>
              </section>
            ) : null}
            {resolvedSearchParams.from === "markets" ? (
              <section aria-label="来源回跳">
                <p>当前来自我的市集页。</p>
                <Link href={organizerMarketsHref}>返回我的市集</Link>
              </section>
            ) : null}
            {currentMarketTitle ? <p>当前市集：{currentMarketTitle}</p> : null}
            {selectedMarketId ? (
              <nav aria-label="当前市集快捷操作">
                <Link
                  href={buildOrganizerMarketsContextHref({
                    pathname: "/organizer/applications",
                    marketId: selectedMarketId,
                    from: resolvedSearchParams.from,
                    marketStatus: resolvedSearchParams.marketStatus,
                    status: sourceApplicationStatus
                  })}
                >
                  查看当前市集报名申请
                </Link>
                <Link
                  href={buildDashboardHref({
                    marketId: selectedMarketId,
                    from:
                      resolvedSearchParams.from === "markets" ||
                      resolvedSearchParams.from === "applications"
                        ? resolvedSearchParams.from
                        : "stalls",
                    status:
                      resolvedSearchParams.from === "applications"
                        ? sourceApplicationStatus
                        : selectedStatus,
                    marketStatus: resolvedSearchParams.marketStatus
                  })}
                >
                  查看当前市集看板
                </Link>
              </nav>
            ) : null}
            {marketOptions.length > 0 ? (
              <nav aria-label="切换市集">
                {marketOptions.map((market) => {
                  const isCurrent = market.id === selectedMarketId;

                  return (
                    <Link
                      key={market.id}
                      href={buildStallsFilterHref({
                        marketId: market.id,
                        status: selectedStatus === "all" ? undefined : selectedStatus,
                        from: resolvedSearchParams.from,
                        marketStatus: resolvedSearchParams.marketStatus,
                        sourceStatus: sourceApplicationStatus
                      })}
                    >
                      {isCurrent ? `${market.title}（当前）` : market.title}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <section aria-label="摊位摘要">
              <p>全部摊位：{summary.all}</p>
              <p>待分配：{summary.unassigned}</p>
              <p>已分配：{summary.assigned}</p>
              <p>已停用：{summary.inactive}</p>
            </section>

            <nav aria-label="摊位筛选">
              <Link
                href={buildStallsFilterHref({
                  marketId: selectedMarketId,
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceApplicationStatus
                })}
              >
                全部（{summary.all}）
              </Link>
              <Link
                href={buildStallsFilterHref({
                  marketId: selectedMarketId,
                  status: "unassigned",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceApplicationStatus
                })}
              >
                待分配（{summary.unassigned}）
              </Link>
              <Link
                href={buildStallsFilterHref({
                  marketId: selectedMarketId,
                  status: "assigned",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceApplicationStatus
                })}
              >
                已分配（{summary.assigned}）
              </Link>
              <Link
                href={buildStallsFilterHref({
                  marketId: selectedMarketId,
                  status: "inactive",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceApplicationStatus
                })}
              >
                已停用（{summary.inactive}）
              </Link>
            </nav>

            <section aria-label="创建摊位">
              <h3>创建摊位</h3>
              <form action={createStallAction} aria-label="创建摊位表单">
                <label>
                  选择市集
                  <select
                    name="marketId"
                    aria-label="选择市集"
                    defaultValue={selectedMarketId ?? ""}
                  >
                    <option value="" disabled>
                      请选择已创建的市集
                    </option>
                    {marketOptions.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.title}（{market.city}）
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  摊位编码
                  <input name="code" type="text" />
                </label>
                <label>
                  摊位名称
                  <input name="name" type="text" />
                </label>
                <button type="submit">创建摊位</button>
              </form>
            </section>
          </>
        ) : null}

        {isOrganizerSession && filteredStalls.length === 0 ? (
          <p>当前没有符合筛选条件的摊位。</p>
        ) : null}

        <section aria-label="摊位列表">
          {filteredStalls.map((stall) => {
            const marketApplications = marketScopedApplications.filter(
              (application) => application.marketId === stall.marketId
            );
            const isAssignable =
              stall.isActive &&
              !stall.assignedApplicationId &&
              marketApplications.length > 0;

            return (
              <article key={stall.id}>
                <h3>{stall.name}</h3>
                <p>
                  {stall.marketTitle} · {stall.code}
                </p>
                <p>状态：{stall.isActive ? "启用中" : "已停用"}</p>
                <p>已分配摊主：{stall.assignedVendorName ?? "待分配"}</p>

                {isAssignable ? (
                  <form action={assignStallAction} aria-label={`${stall.name} 分配表单`}>
                    <input name="stallId" type="hidden" value={stall.id} />
                    <label>
                      已通过申请
                      <select name="applicationId" defaultValue={marketApplications[0]?.id ?? ""}>
                        {marketApplications.map((application) => (
                          <option key={application.id} value={application.id}>
                            {application.vendorName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>报名备注：{marketApplications[0]?.applicationNote ?? "无"}</p>
                    <p>审核备注：{marketApplications[0]?.reviewNote ?? "无"}</p>
                    <button type="submit">分配摊位</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>

        {isOrganizerSession && approvedApplications.length === 0 ? (
          <p>当前没有可分配的已通过申请，请先完成审核。</p>
        ) : null}
      </main>
    </AppShell>
  );
}

function getSelectedStatus(status: string | undefined) {
  if (status === "unassigned" || status === "assigned" || status === "inactive") {
    return status;
  }

  return "all";
}

function getSelectedMarketId(marketId: string | undefined) {
  return typeof marketId === "string" && marketId.length > 0 ? marketId : null;
}

function buildStallsFilterHref(input: {
  marketId: string | null;
  status?: "unassigned" | "assigned" | "inactive";
  from?: string;
  marketStatus?: string;
  sourceStatus?: "submitted" | "approved" | "rejected" | null;
}) {
  const params = new URLSearchParams();

  if (input.marketId) {
    params.set("marketId", input.marketId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.from === "markets") {
    params.set("from", "markets");

    if (
      input.marketStatus === "draft" ||
      input.marketStatus === "published" ||
      input.marketStatus === "completed"
    ) {
      params.set("marketStatus", input.marketStatus);
    }
  }

  if (input.from === "applications") {
    params.set("from", "applications");

    if (input.sourceStatus) {
      params.set("sourceStatus", input.sourceStatus);
    }
  }

  const query = params.toString();
  return query.length > 0 ? `/organizer/stalls?${query}` : "/organizer/stalls";
}

function buildDashboardHref(input: {
  marketId: string;
  from: "stalls" | "markets" | "applications";
  status?: string | null;
  marketStatus?: string;
}) {
  const params = new URLSearchParams({
    from: input.from
  });

  if (input.from === "markets") {
    if (
      input.marketStatus === "draft" ||
      input.marketStatus === "published" ||
      input.marketStatus === "completed"
    ) {
      params.set("marketStatus", input.marketStatus);
    }

    return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
  }

  if (input.from === "applications") {
    if (input.status === "submitted" || input.status === "approved" || input.status === "rejected") {
      params.set("status", input.status);
    }

    return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
  }

  if (input.status === "unassigned" || input.status === "assigned" || input.status === "inactive") {
    params.set("status", input.status);
  }

  return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
}

function buildOrganizerMarketsContextHref(input: {
  pathname: "/organizer/applications";
  marketId: string;
  from?: string;
  marketStatus?: string;
  status?: "submitted" | "approved" | "rejected" | null;
}) {
  const params = new URLSearchParams({
    marketId: input.marketId
  });

  if (input.from === "markets") {
    params.set("from", "markets");

    if (
      input.marketStatus === "draft" ||
      input.marketStatus === "published" ||
      input.marketStatus === "completed"
    ) {
      params.set("marketStatus", input.marketStatus);
    }
  }

  if (input.from === "applications") {
    params.set("from", "applications");

    if (input.status) {
      params.set("status", input.status);
    }
  }

  return `${input.pathname}?${params.toString()}`;
}

function buildOrganizerMarketsHref(marketStatus: string | undefined) {
  if (marketStatus === "draft" || marketStatus === "published" || marketStatus === "completed") {
    return `/organizer/markets?status=${marketStatus}`;
  }

  return "/organizer/markets";
}

function getOrganizerApplicationStatus(status: string | undefined) {
  if (status === "submitted" || status === "approved" || status === "rejected") {
    return status;
  }

  return null;
}

function buildOrganizerApplicationsReturnHref(input: {
  marketId: string | null;
  status: "submitted" | "approved" | "rejected" | null;
}) {
  const params = new URLSearchParams();

  if (input.marketId) {
    params.set("marketId", input.marketId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  const query = params.toString();
  return query.length > 0 ? `/organizer/applications?${query}` : "/organizer/applications";
}

function getStallFilterStatus(stall: Awaited<ReturnType<typeof listOrganizerStalls>>[number]) {
  if (!stall.isActive) {
    return "inactive";
  }

  if (stall.assignedApplicationId) {
    return "assigned";
  }

  return "unassigned";
}

function buildStallSummary(stalls: Awaited<ReturnType<typeof listOrganizerStalls>>) {
  return {
    all: stalls.length,
    unassigned: stalls.filter((stall) => getStallFilterStatus(stall) === "unassigned").length,
    assigned: stalls.filter((stall) => getStallFilterStatus(stall) === "assigned").length,
    inactive: stalls.filter((stall) => getStallFilterStatus(stall) === "inactive").length
  };
}
