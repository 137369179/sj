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
  const selectedStatus = getSelectedStatus(resolvedSearchParams.status);
  const filteredStalls =
    selectedStatus === "all"
      ? stalls
      : stalls.filter((stall) => getStallFilterStatus(stall) === selectedStatus);
  const summary = buildStallSummary(stalls);

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
            <section aria-label="摊位摘要">
              <p>全部摊位：{summary.all}</p>
              <p>待分配：{summary.unassigned}</p>
              <p>已分配：{summary.assigned}</p>
              <p>已停用：{summary.inactive}</p>
            </section>

            <nav aria-label="摊位筛选">
              <Link href="/organizer/stalls">全部（{summary.all}）</Link>
              <Link href="/organizer/stalls?status=unassigned">
                待分配（{summary.unassigned}）
              </Link>
              <Link href="/organizer/stalls?status=assigned">
                已分配（{summary.assigned}）
              </Link>
              <Link href="/organizer/stalls?status=inactive">
                已停用（{summary.inactive}）
              </Link>
            </nav>

            <section aria-label="创建摊位">
              <h3>创建摊位</h3>
              <form action={createStallAction} aria-label="创建摊位表单">
                <label>
                  选择市集
                  <select name="marketId" aria-label="选择市集" defaultValue="">
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
