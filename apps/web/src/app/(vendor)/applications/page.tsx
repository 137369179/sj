import { ReviewHistory } from "../../../components/applications/review-history";
import { AppShell } from "../../../components/layout/app-shell";
import { getApplicationStatusLabel } from "../../../lib/application-status";
import { getSessionUser } from "../../../lib/auth";
import { listVendorApplications } from "../../../server/applications/service";

type VendorApplicationsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function VendorApplicationsPage({
  searchParams
}: VendorApplicationsPageProps) {
  const sessionUser = await getSessionUser();
  const isVendorSession = sessionUser?.role === "vendor";
  const applications = isVendorSession
    ? await listVendorApplications(sessionUser.userId)
    : [];
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = getSelectedStatus(resolvedSearchParams.status);
  const filteredApplications =
    selectedStatus === "all"
      ? applications
      : applications.filter((application) => application.status === selectedStatus);
  const summary = buildVendorStatusSummary(applications);

  return (
    <AppShell>
      <main aria-labelledby="vendor-applications-title">
        <h2 id="vendor-applications-title">我的报名</h2>
        <p>查看当前报名状态、报名备注、审核备注与摊位分配结果。</p>

        {!isVendorSession ? (
          <p>请先以摊主身份登录后查看报名状态。</p>
        ) : null}

        {isVendorSession ? (
          <>
            <section aria-label="报名摘要">
              <p>全部报名：{summary.all}</p>
              <p>待审核：{summary.submitted}</p>
              <p>已通过：{summary.approved}</p>
              <p>已分配摊位：{summary.stallAssigned}</p>
            </section>

            <nav aria-label="状态筛选">
              <a href="/applications">全部（{summary.all}）</a>
              <a href="/applications?status=submitted">待审核（{summary.submitted}）</a>
              <a href="/applications?status=approved">已通过（{summary.approved}）</a>
              <a href="/applications?status=stall_assigned">
                已分配摊位（{summary.stallAssigned}）
              </a>
            </nav>
          </>
        ) : null}

        {isVendorSession && filteredApplications.length === 0 ? <p>当前还没有报名记录。</p> : null}

        <section aria-label="报名列表">
          {filteredApplications.map((application) => (
            <article key={application.id}>
              <h3>
                {application.marketTitle} · {application.marketCity}
              </h3>
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
              <p>
                分配结果：
                {application.assignedStallName && application.assignedStallCode
                  ? `${application.assignedStallName}（${application.assignedStallCode}）`
                  : "待分配"}
              </p>
              <p>提交时间：{formatDate(application.createdAt)}</p>
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
  if (status === "submitted" || status === "approved" || status === "stall_assigned") {
    return status;
  }

  return "all";
}

function buildVendorStatusSummary(
  applications: Awaited<ReturnType<typeof listVendorApplications>>
) {
  return {
    all: applications.length,
    submitted: applications.filter((application) => application.status === "submitted").length,
    approved: applications.filter((application) => application.status === "approved").length,
    stallAssigned: applications.filter((application) => application.status === "stall_assigned")
      .length
  };
}
