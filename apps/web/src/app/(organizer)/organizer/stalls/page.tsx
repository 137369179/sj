import { revalidatePath } from "next/cache";
import Link from "next/link";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import {
  getOrganizerPaymentFollowUpLabel,
  getOrganizerPaymentFollowUpNote,
  getOrganizerPaymentFollowUpState
} from "../../../../lib/role-play";
import { listOrganizerMarketOptions } from "../../../../server/markets/service";
import {
  expirePendingOrder,
  PaymentError,
  sendPaymentReminder
} from "../../../../server/payments/service";
import { listOrganizerApplications } from "../../../../server/applications/service";
import {
  StallCreationError,
  StallAssignmentError,
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
  
  try {
    const payload = buildStallPayload({
      organizerId: sessionUser.userId,
      marketId,
      code,
      name
    });

    await createStall(payload);
    revalidatePath("/organizer/stalls");
  } catch (error) {
    const params = new URLSearchParams();
    
    if (error instanceof StallCreationError) {
      params.set("createError", error.code);
    } else if (error instanceof ZodError) {
      const codeError = error.errors.find((e) => e.path[0] === "code")?.message;
      const nameError = error.errors.find((e) => e.path[0] === "name")?.message;
      
      if (codeError) params.set("codeError", codeError);
      if (nameError) params.set("nameError", nameError);
    } else {
      throw error;
    }

    const from = String(formData.get("from") ?? "");
    const marketStatus = String(formData.get("marketStatus") ?? "");
    const status = String(formData.get("status") ?? "");
    const sourceStatus = String(formData.get("sourceStatus") ?? "");
    
    if (marketId) params.set("marketId", marketId);
    if (from) params.set("from", from);
    if (marketStatus) params.set("marketStatus", marketStatus);
    if (status) params.set("status", status);
    if (sourceStatus) params.set("sourceStatus", sourceStatus);
    
    redirect(`/organizer/stalls?${params.toString()}`);
  }
}

async function assignStallAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const stallId = String(formData.get("stallId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  
  try {
    const payload = buildAssignStallPayload({
      organizerId: sessionUser.userId,
      applicationId
    });

    await assignStall({
      stallId,
      ...payload
    });
    revalidatePath("/organizer/stalls");
  } catch (error) {
    const params = new URLSearchParams();
    
    if (error instanceof StallAssignmentError) {
      params.set("assignError", error.code);
      params.set("errorStallId", stallId);
    } else if (error instanceof ZodError) {
      const applicationIdError = error.errors.find((e) => e.path[0] === "applicationId")?.message;
      if (applicationIdError) params.set("applicationIdError", applicationIdError);
      params.set("errorStallId", stallId);
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
    
    redirect(`/organizer/stalls?${params.toString()}`);
  }
}

async function expirePendingPaymentAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const orderId = String(formData.get("orderId") ?? "");
  const stallId = String(formData.get("stallId") ?? "");

  try {
    await expirePendingOrder({
      orderId,
      organizerId: sessionUser.userId
    });
    revalidatePath("/organizer/stalls");

    const params = buildStallsRedirectParams(formData);
    params.set("paymentReleasedStallId", stallId);
    redirect(`/organizer/stalls?${params.toString()}`);
  } catch (error) {
    if (error instanceof PaymentError) {
      const params = buildStallsRedirectParams(formData);
      params.set("paymentError", error.code);
      params.set("errorStallId", stallId);
      redirect(`/organizer/stalls?${params.toString()}`);
    }

    throw error;
  }
}

async function remindPendingPaymentAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  const orderId = String(formData.get("orderId") ?? "");
  const stallId = String(formData.get("stallId") ?? "");

  try {
    await sendPaymentReminder({
      orderId,
      organizerId: sessionUser.userId
    });
    revalidatePath("/organizer/stalls");

    const params = buildStallsRedirectParams(formData);
    params.set("paymentRemindedStallId", stallId);
    redirect(`/organizer/stalls?${params.toString()}`);
  } catch (error) {
    if (error instanceof PaymentError) {
      const params = buildStallsRedirectParams(formData);
      params.set("paymentError", error.code);
      params.set("errorStallId", stallId);
      redirect(`/organizer/stalls?${params.toString()}`);
    }

    throw error;
  }
}

type OrganizerStallsPageProps = {
  searchParams?: Promise<{
    status?: string;
    marketId?: string;
    from?: string;
    marketStatus?: string;
    sourceStatus?: string;
    createError?: string;
    codeError?: string;
    nameError?: string;
    assignError?: string;
    applicationIdError?: string;
    errorStallId?: string;
    paymentError?: string;
    paymentReleasedStallId?: string;
    paymentRemindedStallId?: string;
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
                {(resolvedSearchParams.createError || resolvedSearchParams.codeError || resolvedSearchParams.nameError) ? (
                  <div role="alert" aria-live="assertive" className="error-summary">
                    <p>创建摊位失败，请修正以下错误后重试：</p>
                    <ul>
                      {resolvedSearchParams.createError ? (
                        <li>{getStallCreationErrorMessage(resolvedSearchParams.createError)}</li>
                      ) : null}
                      {resolvedSearchParams.codeError ? (
                        <li>
                          <a href="#input-code">摊位编码：{resolvedSearchParams.codeError}</a>
                        </li>
                      ) : null}
                      {resolvedSearchParams.nameError ? (
                        <li>
                          <a href="#input-name">摊位名称：{resolvedSearchParams.nameError}</a>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
                <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
                <input name="marketStatus" type="hidden" value={resolvedSearchParams.marketStatus ?? ""} />
                <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
                <input name="sourceStatus" type="hidden" value={resolvedSearchParams.sourceStatus ?? ""} />
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
                  <input 
                    id="input-code"
                    name="code" 
                    type="text" 
                    required 
                    aria-invalid={resolvedSearchParams.codeError ? "true" : "false"}
                  />
                </label>
                {resolvedSearchParams.codeError ? <p className="field-error">{resolvedSearchParams.codeError}</p> : null}
                <label>
                  摊位名称
                  <input 
                    id="input-name"
                    name="name" 
                    type="text" 
                    required 
                    aria-invalid={resolvedSearchParams.nameError ? "true" : "false"}
                  />
                </label>
                {resolvedSearchParams.nameError ? <p className="field-error">{resolvedSearchParams.nameError}</p> : null}
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
                {stall.assignedOrderStatus ? (
                  <p>支付状态：{getOrderStatusLabel(stall.assignedOrderStatus)}</p>
                ) : null}
                {stall.assignedOrderStatus ? (
                  <p>
                    支付跟进：
                    {getOrganizerPaymentFollowUpLabel(getPaymentFollowUpStateForStall(stall))}
                  </p>
                ) : null}
                {stall.assignedOrderStatus === "pending" && stall.assignedOrderCreatedAt ? (
                  <p>
                    {getOrganizerPaymentFollowUpNote({
                      orderStatus: stall.assignedOrderStatus,
                      orderCreatedAt: stall.assignedOrderCreatedAt
                    })}
                  </p>
                ) : null}
                {resolvedSearchParams.paymentReleasedStallId === stall.id ? (
                  <p>已按支付超时释放档期，可继续分配给下一位摊主。</p>
                ) : null}
                {resolvedSearchParams.paymentRemindedStallId === stall.id ? (
                  <p>已发送支付提醒，摊主会收到催办通知。</p>
                ) : null}
                {resolvedSearchParams.paymentError && resolvedSearchParams.errorStallId === stall.id ? (
                  <p role="alert">{getPaymentErrorMessage(resolvedSearchParams.paymentError)}</p>
                ) : null}
                {canRemindPendingOrder(stall) ? (
                  <form action={remindPendingPaymentAction} aria-label={`${stall.name} 支付提醒表单`}>
                    <input name="orderId" type="hidden" value={stall.assignedOrderId ?? ""} />
                    <input name="stallId" type="hidden" value={stall.id} />
                    <input name="marketId" type="hidden" value={resolvedSearchParams.marketId ?? ""} />
                    <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
                    <input name="marketStatus" type="hidden" value={resolvedSearchParams.marketStatus ?? ""} />
                    <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
                    <input name="sourceStatus" type="hidden" value={resolvedSearchParams.sourceStatus ?? ""} />
                    <button type="submit">催办支付</button>
                  </form>
                ) : null}
                {isOverduePendingOrder(stall) ? (
                  <form action={expirePendingPaymentAction} aria-label={`${stall.name} 支付超时处理表单`}>
                    <input name="orderId" type="hidden" value={stall.assignedOrderId ?? ""} />
                    <input name="stallId" type="hidden" value={stall.id} />
                    <input name="marketId" type="hidden" value={resolvedSearchParams.marketId ?? ""} />
                    <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
                    <input name="marketStatus" type="hidden" value={resolvedSearchParams.marketStatus ?? ""} />
                    <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
                    <input name="sourceStatus" type="hidden" value={resolvedSearchParams.sourceStatus ?? ""} />
                    <button type="submit">超时释放档期</button>
                  </form>
                ) : null}

                {isAssignable ? (
                  <form action={assignStallAction} aria-label={`${stall.name} 分配表单`}>
                    {resolvedSearchParams.assignError && resolvedSearchParams.errorStallId === stall.id ? (
                      <p role="alert">{getStallAssignmentErrorMessage(resolvedSearchParams.assignError)}</p>
                    ) : null}
                    <input name="stallId" type="hidden" value={stall.id} />
                    <input name="marketId" type="hidden" value={resolvedSearchParams.marketId ?? ""} />
                    <input name="from" type="hidden" value={resolvedSearchParams.from ?? ""} />
                    <input name="marketStatus" type="hidden" value={resolvedSearchParams.marketStatus ?? ""} />
                    <input name="status" type="hidden" value={resolvedSearchParams.status ?? ""} />
                    <input name="sourceStatus" type="hidden" value={resolvedSearchParams.sourceStatus ?? ""} />
                    <label>
                      已通过申请
                      <select 
                        name="applicationId" 
                        defaultValue={marketApplications[0]?.id ?? ""}
                        aria-invalid={resolvedSearchParams.errorStallId === stall.id && resolvedSearchParams.applicationIdError ? "true" : "false"}
                      >
                        {marketApplications.map((application) => (
                          <option key={application.id} value={application.id}>
                            {application.vendorName}
                          </option>
                        ))}
                      </select>
                    </label>
                    {resolvedSearchParams.errorStallId === stall.id && resolvedSearchParams.applicationIdError ? (
                      <p>{resolvedSearchParams.applicationIdError}</p>
                    ) : null}
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

function getStallCreationErrorMessage(code: string | undefined) {
  if (code === "MARKET_NOT_FOUND") {
    return "创建失败：关联的市集不存在。";
  }

  if (code === "FORBIDDEN") {
    return "创建失败：无权操作该市集。";
  }

  return "创建失败：请重试。";
}

function getStallAssignmentErrorMessage(code: string | undefined) {
  if (code === "NOT_FOUND") {
    return "分配失败：摊位或申请不存在。";
  }

  if (code === "FORBIDDEN") {
    return "分配失败：无权操作该摊位或申请。";
  }

  if (code === "STALL_UNAVAILABLE") {
    return "分配失败：该摊位已停用或已分配给其他申请。";
  }

  if (code === "INVALID_APPLICATION") {
    return "分配失败：该申请不属于当前市集。";
  }

  if (code === "INVALID_APPLICATION_STATUS") {
    return "分配失败：只能分配给已通过审核且未分配的申请。";
  }

  return "分配失败：请重试。";
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

function buildStallsRedirectParams(formData: FormData) {
  const params = new URLSearchParams();
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

  return params;
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

function getOrderStatusLabel(status: string) {
  if (status === "pending") {
    return "待支付";
  }

  if (status === "paid") {
    return "已支付";
  }

  if (status === "cancelled") {
    return "已取消";
  }

  return status;
}

function isOverduePendingOrder(
  stall: Awaited<ReturnType<typeof listOrganizerStalls>>[number]
) {
  if (stall.assignedOrderStatus !== "pending" || !stall.assignedOrderCreatedAt) {
    return false;
  }

  const deadline = new Date(stall.assignedOrderCreatedAt.getTime() + 24 * 60 * 60 * 1000);
  return deadline.getTime() <= Date.now();
}

function canRemindPendingOrder(
  stall: Awaited<ReturnType<typeof listOrganizerStalls>>[number]
) {
  return (
    stall.assignedOrderStatus === "pending" &&
    stall.assignedApplicationStatus === "stall_assigned" &&
    Boolean(stall.assignedOrderId) &&
    !isOverduePendingOrder(stall)
  );
}

function getPaymentFollowUpStateForStall(
  stall: Awaited<ReturnType<typeof listOrganizerStalls>>[number]
) {
  return getOrganizerPaymentFollowUpState({
    orderStatus: stall.assignedOrderStatus,
    orderCreatedAt: stall.assignedOrderCreatedAt
  });
}

function getPaymentErrorMessage(code: string | undefined) {
  if (code === "NOT_FOUND") {
    return "支付处理失败：订单不存在。";
  }

  if (code === "FORBIDDEN") {
    return "支付处理失败：无权处理该订单。";
  }

  if (code === "INVALID_STATUS") {
    return "支付处理失败：当前订单还不能执行超时释放。";
  }

  return "支付处理失败：请重试。";
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
