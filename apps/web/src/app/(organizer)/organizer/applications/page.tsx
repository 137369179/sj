import { revalidatePath } from "next/cache";

import { AppShell } from "../../../../components/layout/app-shell";
import {
  buildApplicationReviewPayload,
  listOrganizerApplications,
  reviewApplication
} from "../../../../server/applications/service";

async function reviewApplicationAction(formData: FormData) {
  "use server";

  const applicationId = String(formData.get("applicationId") ?? "");
  const organizerId = String(formData.get("organizerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "");
  const payload = buildApplicationReviewPayload({
    organizerId,
    decision,
    note
  });

  await reviewApplication({
    applicationId,
    ...payload
  });
  revalidatePath(`/organizer/applications?organizerId=${organizerId}`);
}

type OrganizerApplicationsPageProps = {
  searchParams: Promise<{
    organizerId?: string;
  }>;
};

export default async function OrganizerApplicationsPage({
  searchParams
}: OrganizerApplicationsPageProps) {
  const { organizerId } = await searchParams;
  const applications = organizerId
    ? await listOrganizerApplications(organizerId)
    : [];

  return (
    <AppShell>
      <main aria-labelledby="organizer-applications-title">
        <h2 id="organizer-applications-title">报名申请</h2>
        <p>查看摊主报名，并完成最小审核闭环。</p>

        {!organizerId ? (
          <p>请通过 `?organizerId=` 指定当前主办方后查看申请。</p>
        ) : null}

        {organizerId && applications.length === 0 ? (
          <p>当前没有待处理申请。</p>
        ) : null}

        <section aria-label="申请列表">
          {applications.map((application) => (
            <article key={application.id}>
              <h3>{application.vendorName}</h3>
              <p>
                {application.marketTitle} · {application.marketCity}
              </p>
              <p>状态：{application.status}</p>
              <p>报名备注：{application.note ?? "无"}</p>
              <p>提交时间：{formatDate(application.createdAt)}</p>

              <form action={reviewApplicationAction} aria-label={`${application.vendorName} 审核表单`}>
                <input name="applicationId" type="hidden" value={application.id} />
                <input name="organizerId" type="hidden" value={organizerId ?? ""} />
                <label>
                  审核备注
                  <textarea
                    name="note"
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
