import { revalidatePath } from "next/cache";
import Link from "next/link";

import { ReviewHistory } from "../../../../components/applications/review-history";
import { AppShell } from "../../../../components/layout/app-shell";
import { getApplicationStatusLabel } from "../../../../lib/application-status";
import { getSessionUser } from "../../../../lib/auth";
import {
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
}

type OrganizerApplicationsPageProps = {
  searchParams?: Promise<{
    status?: string;
    marketId?: string;
  }>;
};

export default async function OrganizerApplicationsPage({
  searchParams
}: OrganizerApplicationsPageProps) {
  const sessionUser = await getSessionUser();
  const isOrganizerSession = sessionUser?.role === "organizer";
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
          <p>请先以主办方身份登录后查看申请。</p>
        ) : null}

        {isOrganizerSession ? (
          <>
            {currentMarketTitle ? <p>当前市集：{currentMarketTitle}</p> : null}
            <section aria-label="申请摘要">
              <p>全部申请：{summary.all}</p>
              <p>待审核：{summary.submitted}</p>
              <p>已通过：{summary.approved}</p>
              <p>已拒绝：{summary.rejected}</p>
            </section>

            <nav aria-label="状态筛选">
              <Link href={buildApplicationsFilterHref({ marketId: selectedMarketId })}>
                全部（{summary.all}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "submitted"
                })}
              >
                待审核（{summary.submitted}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "approved"
                })}
              >
                已通过（{summary.approved}）
              </Link>
              <Link
                href={buildApplicationsFilterHref({
                  marketId: selectedMarketId,
                  status: "rejected"
                })}
              >
                已拒绝（{summary.rejected}）
              </Link>
            </nav>
          </>
        ) : null}

        {isOrganizerSession && filteredApplications.length === 0 ? (
          <p>当前没有待处理申请。</p>
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
                <input name="applicationId" type="hidden" value={application.id} />
                <label>
                  审核备注
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="可选填写审核备注，系统会同步通知摊主。"
                  />
                </label>
                <button name="decision" type="submit" value="approve">
                  通过
                </button>
                <button name="decision" type="submit" value="reject">
                  拒绝
                </button>
              </form>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
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
