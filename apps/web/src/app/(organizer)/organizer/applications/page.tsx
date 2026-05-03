import { revalidatePath } from "next/cache";
import Link from "next/link";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { ReviewHistory } from "../../../../components/applications/review-history";
import { AppShell } from "../../../../components/layout/app-shell";
import { getApplicationStatusLabel } from "../../../../lib/application-status";
import { getSessionUser } from "../../../../lib/auth";
import { listOrganizerMarketOptions } from "../../../../server/markets/service";
import {
  ApplicationReviewError,
  buildApplicationReviewPayload,
  listOrganizerApplications,
  reviewApplication
} from "../../../../server/applications/service";

async function reviewApplicationAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const applicationId = String(formData.get("applicationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "");
  
  try {
    const payload = buildApplicationReviewPayload({
      organizerId: sessionUser.userId,
      decision,
      reviewNote
    });

    await reviewApplication({
      applicationId,
      ...payload
    });
    revalidatePath("/organizer/applications");
  } catch (error) {
    const params = new URLSearchParams();
    
    if (error instanceof ApplicationReviewError) {
      params.set("reviewError", error.code);
      params.set("errorApplicationId", applicationId);
    } else if (error instanceof ZodError) {
      const decisionError = error.errors.find((e) => e.path[0] === "decision")?.message;
      const reviewNoteError = error.errors.find((e) => e.path[0] === "reviewNote")?.message;
      
      if (decisionError) params.set("decisionError", decisionError);
      if (reviewNoteError) params.set("reviewNoteError", reviewNoteError);
      params.set("errorApplicationId", applicationId);
    } else {
      throw error;
    }

    const marketId = String(formData.get("marketId") ?? "");
    const from = String(formData.get("from") ?? "");
    const marketStatus = String(formData.get("marketStatus") ?? "");
    const status = String(formData.get("status") ?? "");
    const sourceStatus = String(formData.get("sourceStatus") ?? "");
    
    if (marketId) params.set("marketId", marketId);
    if (from) params.set("from", from);
    if (marketStatus) params.set("marketStatus", marketStatus);
    if (status) params.set("status", status);
    if (sourceStatus) params.set("sourceStatus", sourceStatus);
    
    redirect(`/organizer/applications?${params.toString()}`);
  }
}

type OrganizerApplicationsPageProps = {
  searchParams?: Promise<{
    status?: string;
    marketId?: string;
    from?: string;
    marketStatus?: string;
    sourceStatus?: string;
    reviewError?: string;
    decisionError?: string;
    reviewNoteError?: string;
    errorApplicationId?: string;
  }>;
};

export default async function OrganizerApplicationsPage({
  searchParams
}: OrganizerApplicationsPageProps) {
  const sessionUser = await getSessionUser();
  const isOrganizerSession = sessionUser?.role === "organizer";
  const marketOptions = isOrganizerSession
    ? await listOrganizerMarketOptions(sessionUser.userId)
    : [];
  const applications = isOrganizerSession
    ? await listOrganizerApplications(sessionUser.userId)
    : [];
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedMarketId = getSelectedMarketId(resolvedSearchParams.marketId);
  const marketScopedApplications = selectedMarketId
    ? applications.filter((application) => application.marketId === selectedMarketId)
    : applications;
  const selectedStatus = getSelectedStatus(resolvedSearchParams.status);
  const filteredApplications =
    selectedStatus === "all"
      ? marketScopedApplications
      : marketScopedApplications.filter((application) => application.status === selectedStatus);
  const summary = buildStatusSummary(marketScopedApplications);
  const sourceStallStatus = getOrganizerStallStatus(
    resolvedSearchParams.sourceStatus ?? resolvedSearchParams.status
  );
  const stallReturnHref =
    resolvedSearchParams.from === "stalls"
      ? buildOrganizerStallsReturnHref({
          marketId: selectedMarketId,
          status: sourceStallStatus
        })
      : null;
  const organizerMarketsHref = buildOrganizerMarketsHref(resolvedSearchParams.marketStatus);
  const currentMarketTitle =
    selectedMarketId &&
    marketScopedApplications.find((application) => application.marketId === selectedMarketId)
      ?.marketTitle;

  return (
    <AppShell>
      <main aria-labelledby="organizer-applications-title">
        <h2 id="organizer-applications-title">报名申请</h2>
        <p>查看摊主报名，并完成最小审核闭环。</p>

        {!isOrganizerSession ? (
          <p>请先以主办方身份登录后查看报名申请。</p>
        ) : null}

        {isOrganizerSession ? (
          <>
            {stallReturnHref ? (
              <section aria-label="来源回跳">
                <p>当前来自摊位管理页。</p>
                <Link href={stallReturnHref}>返回当前市集摊位</Link>
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
                    pathname: "/organizer/stalls",
                    marketId: selectedMarketId,
                    from: resolvedSearchParams.from,
                    marketStatus: resolvedSearchParams.marketStatus,
                        status: sourceStallStatus
                  })}
                >
                  查看当前市集摊位
                </Link>
                <Link
                  href={buildDashboardHref({
                    marketId: selectedMarketId,
                    from:
                      resolvedSearchParams.from === "markets" || resolvedSearchParams.from === "stalls"
                        ? resolvedSearchParams.from
                        : "applications",
                    status: resolvedSearchParams.from === "stalls" ? sourceStallStatus : selectedStatus,
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
                      href={buildApplicationsFilterHref({
                        marketId: market.id,
                        status: selectedStatus === "all" ? undefined : selectedStatus,
                        from: resolvedSearchParams.from,
                        marketStatus: resolvedSearchParams.marketStatus,
                        sourceStatus: sourceStallStatus
                      })}
                    >
                      {isCurrent ? `${market.title}（当前）` : market.title}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <section aria-label="申请摘要">
              <p>全部报名申请：{summary.all}</p>
              <p>待审核：{summary.submitted}</p>
              <p>已通过：{summary.approved}</p>
              <p>已拒绝：{summary.rejected}</p>
            </section>

            <nav aria-label="状态筛选">
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceStallStatus
                })}
              >
                全部（{summary.all}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "submitted",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceStallStatus
                })}
              >
                待审核（{summary.submitted}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "approved",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceStallStatus
                })}
              >
                已通过（{summary.approved}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "rejected",
                  from: resolvedSearchParams.from,
                  marketStatus: resolvedSearchParams.marketStatus,
                  sourceStatus: sourceStallStatus
                })}
              >
                已拒绝（{summary.rejected}）
              </Link>
            </nav>
          </>
        ) : null}

        {isOrganizerSession && filteredApplications.length === 0 ? (
          <p>
            {selectedStatus === "all" && !selectedMarketId
              ? "当前还没有报名申请。"
              : "当前没有符合筛选条件的报名申请。"}
          </p>
        ) : null}

        <section aria-label="申请列表">
          {filteredApplications.map((application) => (
            <article key={application.id}>
              <h3>{application.vendorName}</h3>
              <p>
                {application.marketTitle} · {application.marketCity}
              </p>
              <p>状态：{getApplicationStatusLabel(application.status)}</p>
              <p>报名备注：{application.applicationNote ?? "无"}</p>
              <p>审核备注：{application.reviewNote ?? "无"}</p>
              <p>最近审核时间：{application.reviewedAt ? formatDate(application.reviewedAt) : "未审核"}</p>
              <ReviewHistory reviews={application.reviews} />
              <p>报名附件：{application.attachments.length > 0 ? null : "无"}</p>
              {application.attachments.map((attachment) => (
                <p key={attachment.url}>
                  <a href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.originalName}
                  </a>
                </p>
              ))}
              <p>提交时间：{formatDate(application.createdAt)}</p>

              <form action={reviewApplicationAction} aria-label={`${application.vendorName} 审核表单`}>
                {resolvedSearchParams.reviewError && resolvedSearchParams.errorApplicationId === application.id ? (
                  <p role="alert">{getReviewErrorMessage(resolvedSearchParams.reviewError)}</p>
                ) : null}
                <input name="applicationId" type="hidden" value={application.id} />
                <input name="marketId" type="hidden" value={resolvedSearchParams.marketId ?? ""} />
                <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
                <input name="marketStatus" type="hidden" value={resolvedSearchParams.marketStatus ?? ""} />
                <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
                <input name="sourceStatus" type="hidden" value={resolvedSearchParams.sourceStatus ?? ""} />
                <label>
                  审核备注
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="可选填写审核备注，系统会同步通知摊主。"
                    aria-invalid={resolvedSearchParams.errorApplicationId === application.id && resolvedSearchParams.reviewNoteError ? "true" : "false"}
                  />
                </label>
                {resolvedSearchParams.errorApplicationId === application.id && resolvedSearchParams.reviewNoteError ? (
                  <p>{resolvedSearchParams.reviewNoteError}</p>
                ) : null}
                <button name="decision" type="submit" value="approve">
                  通过
                </button>
                <button name="decision" type="submit" value="reject">
                  拒绝
                </button>
                {resolvedSearchParams.errorApplicationId === application.id && resolvedSearchParams.decisionError ? (
                  <p>{resolvedSearchParams.decisionError}</p>
                ) : null}
              </form>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}

function getReviewErrorMessage(code: string | undefined) {
  if (code === "NOT_FOUND") {
    return "审核失败：申请不存在。";
  }

  if (code === "FORBIDDEN") {
    return "审核失败：无权操作该申请。";
  }

  if (code === "INVALID_STATUS") {
    return "审核失败：当前申请状态不允许该操作。";
  }

  return "审核失败：请重试。";
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getSelectedStatus(status: string | undefined) {
  if (status === "submitted" || status === "approved" || status === "rejected") {
    return status;
  }

  return "all";
}

function getSelectedMarketId(marketId: string | undefined) {
  return typeof marketId === "string" && marketId.length > 0 ? marketId : null;
}

function buildApplicationsFilterHref(input: {
  marketId: string | null;
  status?: "submitted" | "approved" | "rejected";
  from?: string;
  marketStatus?: string;
  sourceStatus?: "unassigned" | "assigned" | "inactive" | null;
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

  if (input.from === "stalls") {
    params.set("from", "stalls");

    if (input.sourceStatus) {
      params.set("sourceStatus", input.sourceStatus);
    }
  }

  const query = params.toString();
  return query.length > 0 ? `/organizer/applications?${query}` : "/organizer/applications";
}

function buildDashboardHref(input: {
  marketId: string;
  from: "applications" | "markets" | "stalls";
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

  if (input.from === "stalls") {
    if (
      input.status === "unassigned" ||
      input.status === "assigned" ||
      input.status === "inactive"
    ) {
      params.set("status", input.status);
    }

    return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
  }

  if (input.status === "submitted" || input.status === "approved" || input.status === "rejected") {
    params.set("status", input.status);
  }

  return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
}

function buildOrganizerMarketsContextHref(input: {
  pathname: "/organizer/stalls";
  marketId: string;
  from?: string;
  marketStatus?: string;
  status?: "unassigned" | "assigned" | "inactive" | null;
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

  if (input.from === "stalls") {
    params.set("from", "stalls");

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

function getOrganizerStallStatus(status: string | undefined) {
  if (status === "unassigned" || status === "assigned" || status === "inactive") {
    return status;
  }

  return null;
}

function buildOrganizerStallsReturnHref(input: {
  marketId: string | null;
  status: "unassigned" | "assigned" | "inactive" | null;
}) {
  const params = new URLSearchParams();

  if (input.marketId) {
    params.set("marketId", input.marketId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  const query = params.toString();
  return query.length > 0 ? `/organizer/stalls?${query}` : "/organizer/stalls";
}

function buildStatusSummary(
  applications: Awaited<ReturnType<typeof listOrganizerApplications>>
) {
  return {
    all: applications.length,
    submitted: applications.filter((application) => application.status === "submitted").length,
    approved: applications.filter((application) => application.status === "approved").length,
    rejected: applications.filter((application) => application.status === "rejected").length
  };
}
