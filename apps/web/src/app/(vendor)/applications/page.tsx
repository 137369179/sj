import { AppShell } from "../../../components/layout/app-shell";
import { listVendorApplications } from "../../../server/applications/service";

type VendorApplicationsPageProps = {
  searchParams: Promise<{
    vendorId?: string;
  }>;
};

export default async function VendorApplicationsPage({
  searchParams
}: VendorApplicationsPageProps) {
  const { vendorId } = await searchParams;
  const applications = vendorId ? await listVendorApplications(vendorId) : [];

  return (
    <AppShell>
      <main aria-labelledby="vendor-applications-title">
        <h2 id="vendor-applications-title">我的报名</h2>
        <p>查看当前报名状态、申请备注与摊位分配结果。</p>

        {!vendorId ? (
          <p>请通过 `?vendorId=` 指定当前摊主后查看报名状态。</p>
        ) : null}

        {vendorId && applications.length === 0 ? <p>当前还没有报名记录。</p> : null}

        <section aria-label="报名列表">
          {applications.map((application) => (
            <article key={application.id}>
              <h3>
                {application.marketTitle} · {application.marketCity}
              </h3>
              <p>状态：{application.status}</p>
              <p>申请备注：{application.note ?? "无"}</p>
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
