import { ReviewHistory } from "../../../components/applications/review-history";
import { AppShell } from "../../../components/layout/app-shell";
import { getApplicationStatusLabel } from "../../../lib/application-status";
import { getSessionUser } from "../../../lib/auth";
import { listVendorApplications } from "../../../server/applications/service";

export default async function VendorApplicationsPage() {
  const sessionUser = await getSessionUser();
  const isVendorSession = sessionUser?.role === "vendor";
  const applications = isVendorSession
    ? await listVendorApplications(sessionUser.userId)
    : [];

  return (
    <AppShell>
      <main aria-labelledby="vendor-applications-title">
        <h2 id="vendor-applications-title">我的报名</h2>
        <p>查看当前报名状态、报名备注、审核备注与摊位分配结果。</p>

        {!isVendorSession ? (
          <p>请先以摊主身份登录后查看报名状态。</p>
        ) : null}

        {isVendorSession && applications.length === 0 ? <p>当前还没有报名记录。</p> : null}

        <section aria-label="报名列表">
          {applications.map((application) => (
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
