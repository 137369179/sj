import { revalidatePath } from "next/cache";

import { AppShell } from "../../../../components/layout/app-shell";
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

  const organizerId = String(formData.get("organizerId") ?? "");
  const marketId = String(formData.get("marketId") ?? "");
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");
  const payload = buildStallPayload({
    organizerId,
    marketId,
    code,
    name
  });

  await createStall(payload);
  revalidatePath(`/organizer/stalls?organizerId=${organizerId}`);
}

async function assignStallAction(formData: FormData) {
  "use server";

  const organizerId = String(formData.get("organizerId") ?? "");
  const stallId = String(formData.get("stallId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const payload = buildAssignStallPayload({
    organizerId,
    applicationId
  });

  await assignStall({
    stallId,
    ...payload
  });
  revalidatePath(`/organizer/stalls?organizerId=${organizerId}`);
}

type OrganizerStallsPageProps = {
  searchParams: Promise<{
    organizerId?: string;
  }>;
};

export default async function OrganizerStallsPage({
  searchParams
}: OrganizerStallsPageProps) {
  const { organizerId } = await searchParams;
  const stalls = organizerId ? await listOrganizerStalls(organizerId) : [];
  const applications = organizerId ? await listOrganizerApplications(organizerId) : [];
  const approvedApplications = applications.filter(
    (application) => application.status === "approved"
  );

  return (
    <AppShell>
      <main aria-labelledby="organizer-stalls-title">
        <h2 id="organizer-stalls-title">摊位管理</h2>
        <p>基于已审核通过的报名结果，创建摊位并完成最小分配闭环。</p>

        {!organizerId ? (
          <p>请通过 `?organizerId=` 指定当前主办方后管理摊位。</p>
        ) : null}

        {organizerId ? (
          <section aria-label="创建摊位">
            <h3>创建摊位</h3>
            <form action={createStallAction} aria-label="创建摊位表单">
              <input name="organizerId" type="hidden" value={organizerId} />
              <label>
                市集 ID
                <input name="marketId" type="text" />
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
        ) : null}

        {organizerId && stalls.length === 0 ? <p>当前还没有摊位，请先创建。</p> : null}

        <section aria-label="摊位列表">
          {stalls.map((stall) => {
            const marketApplications = approvedApplications.filter(
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
                    <input name="organizerId" type="hidden" value={organizerId ?? ""} />
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
                    <button type="submit">分配摊位</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>

        {organizerId && approvedApplications.length === 0 ? (
          <p>当前没有可分配的已通过申请，请先完成审核。</p>
        ) : null}
      </main>
    </AppShell>
  );
}
