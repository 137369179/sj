import Link from "next/link";

import { ReviewHistory } from "../../../components/applications/review-history";
import { AppShell } from "../../../components/layout/app-shell";
import { getApplicationStatusLabel } from "../../../lib/application-status";
import { getSessionUser } from "../../../lib/auth";
import {
  getVendorActionLabel,
  getVendorCurrentStepLabel,
  getVendorReceiptNote,
  getVendorStatusHint,
  getVendorTimingNote,
  VENDOR_APPLICATION_TASK_GROUPS
} from "../../../lib/role-play";
import { listVendorApplications } from "../../../server/applications/service";

type VendorApplicationsPageProps = {
  searchParams?: Promise<{
    status?: string;
    marketId?: string;
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
  const selectedMarketId = getSelectedMarketId(resolvedSearchParams.marketId);
  const marketScopedApplications = selectedMarketId
    ? applications.filter((application) => application.marketId === selectedMarketId)
    : applications;
  const selectedStatus = getSelectedStatus(resolvedSearchParams.status);
  const filteredApplications =
    selectedStatus === "all"
      ? marketScopedApplications
      : marketScopedApplications.filter((application) => application.status === selectedStatus);
  const summary = buildVendorStatusSummary(marketScopedApplications);
  const currentMarketTitle =
    selectedMarketId &&
    marketScopedApplications.find((application) => application.marketId === selectedMarketId)
      ?.marketTitle;
  const marketOptions = buildVendorMarketOptions(applications);
  const applicationsByTaskGroup = buildVendorApplicationsByTaskGroup(filteredApplications);

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
            <section aria-labelledby="vendor-task-title" style={{ marginBottom: "1.5rem" }}>
              <h3 id="vendor-task-title">待处理事项</h3>
              <ul>
                <li>待补件</li>
                <li>待确认</li>
                <li>审核中</li>
              </ul>
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                {VENDOR_APPLICATION_TASK_GROUPS.map((group) => {
                  const groupedApplications = applicationsByTaskGroup[group.id];

                  if (groupedApplications.length === 0) {
                    return null;
                  }

                  return (
                    <section key={group.id} aria-label={group.label}>
                      <h4>{group.label}</h4>
                      <ul>
                        {groupedApplications.map((application) => (
                          <li key={application.id}>
                            {application.marketTitle}：
                            {getVendorStatusHint(
                              application.status,
                              application.latestReviewDecision
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </section>
            {currentMarketTitle ? <p>当前市集：{currentMarketTitle}</p> : null}
            <section aria-label="报名摘要">
              <p>全部报名：{summary.all}</p>
              <p>待审核：{summary.submitted}</p>
              <p>已通过：{summary.approved}</p>
              <p>已分配摊位：{summary.stallAssigned}</p>
            </section>

            <nav aria-label="状态筛选">
              <Link href={buildVendorApplicationsHref({ marketId: selectedMarketId })}>
                全部（{summary.all}）
              </Link>
              <Link
                href={buildVendorApplicationsHref({
                  marketId: selectedMarketId,
                  status: "submitted"
                })}
              >
                待审核（{summary.submitted}）
              </Link>
              <Link
                href={buildVendorApplicationsHref({
                  marketId: selectedMarketId,
                  status: "approved"
                })}
              >
                已通过（{summary.approved}）
              </Link>
              <Link
                href={buildVendorApplicationsHref({
                  marketId: selectedMarketId,
                  status: "stall_assigned"
                })}
              >
                已分配摊位（{summary.stallAssigned}）
              </Link>
            </nav>
            {marketOptions.length > 0 ? (
              <nav aria-label="切换市集">
                {marketOptions.map((market) => {
                  const isCurrent = market.marketId === selectedMarketId;

                  return (
                    <Link
                      key={market.marketId}
                      href={buildVendorApplicationsHref({
                        marketId: market.marketId,
                        status: selectedStatus === "all" ? undefined : selectedStatus
                      })}
                    >
                      {isCurrent ? `${market.marketTitle}（当前）` : market.marketTitle}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </>
        ) : null}

        {isVendorSession && filteredApplications.length === 0 ? (
          <p>
            {selectedStatus === "all" && !selectedMarketId
              ? "当前还没有报名记录。"
              : "当前没有符合筛选条件的报名记录。"}
          </p>
        ) : null}

        <section aria-label="报名列表">
          {filteredApplications.map((application) => {
            const timingNote = getVendorTimingNote({
              status: application.status,
              latestReviewDecision: application.latestReviewDecision,
              reviewedAt: application.reviewedAt,
              orderStatus: application.orderStatus,
              orderCreatedAt: application.orderCreatedAt,
              reviewNote: application.reviewNote
            });

            return (
              <article key={application.id}>
                <h3>
                  {application.marketTitle} · {application.marketCity}
                </h3>
                <p>状态：{getApplicationStatusLabel(application.status)}</p>
                <p>
                  当前处理：
                  {getVendorCurrentStepLabel(
                    application.status,
                    application.latestReviewDecision
                  )}
                </p>
                <p>
                  建议动作：
                  {getVendorActionLabel({
                    status: application.status,
                    latestReviewDecision: application.latestReviewDecision,
                    reviewedAt: application.reviewedAt,
                    orderStatus: application.orderStatus,
                    orderCreatedAt: application.orderCreatedAt,
                    reviewNote: application.reviewNote
                  })}
                </p>
                <p>
                  进度回执：
                  {getVendorReceiptNote({
                    status: application.status,
                    latestReviewDecision: application.latestReviewDecision,
                    reviewedAt: application.reviewedAt,
                    orderStatus: application.orderStatus,
                    orderCreatedAt: application.orderCreatedAt,
                    reviewNote: application.reviewNote
                  })}
                </p>
                {timingNote ? (
                  <p>
                    时效提醒：
                    {timingNote}
                  </p>
                ) : null}
                {application.latestReviewDecision === "supplement" ? (
                  <p>
                    <Link
                      href={`/markets/${application.marketId}/apply?from=applications&action=supplement&applicationId=${application.id}`}
                    >
                      去补件
                    </Link>
                  </p>
                ) : null}
                <p>报名备注：{application.applicationNote ?? "无"}</p>
                <p>审核备注：{application.reviewNote ?? "无"}</p>
                <p>
                  最近审核时间：
                  {application.reviewedAt ? formatDate(application.reviewedAt) : "未审核"}
                </p>
                <ReviewHistory reviews={application.reviews} />
                <p>
                  <Link
                    href={buildVendorMarketDetailHref({
                      marketId: application.marketId,
                      status: selectedStatus
                    })}
                  >
                    查看{application.marketTitle}详情
                  </Link>
                </p>
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
                {application.orderId && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px"
                    }}
                  >
                    <h4>账单与支付</h4>
                    <p>账单金额：¥{application.orderAmount}</p>
                    <p>账单状态：{application.orderStatus === "paid" ? "已支付" : "待支付"}</p>
                    {application.orderStatus === "paid" && application.orderPaidAt ? (
                      <p>支付时间：{formatDate(application.orderPaidAt)}</p>
                    ) : null}
                    {application.orderStatus === "pending" && (
                      <form action={`/api/payments/${application.orderId}/pay`} method="POST">
                        <button
                          type="submit"
                          style={{
                            marginTop: "0.5rem",
                            backgroundColor: "#10b981",
                            color: "white",
                            padding: "0.5rem 1rem",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          立即支付
                        </button>
                      </form>
                    )}
                  </div>
                )}
                <p>提交时间：{formatDate(application.createdAt)}</p>
              </article>
            );
          })}
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

function getSelectedMarketId(marketId: string | undefined) {
  return typeof marketId === "string" && marketId.length > 0 ? marketId : null;
}

function buildVendorApplicationsHref(input: {
  marketId: string | null;
  status?: "submitted" | "approved" | "stall_assigned";
}) {
  const params = new URLSearchParams();

  if (input.marketId) {
    params.set("marketId", input.marketId);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  const query = params.toString();
  return query.length > 0 ? `/applications?${query}` : "/applications";
}

function buildVendorMarketDetailHref(input: {
  marketId: string;
  status: "all" | "submitted" | "approved" | "stall_assigned";
}) {
  const params = new URLSearchParams({
    from: "applications"
  });

  if (input.status !== "all") {
    params.set("status", input.status);
  }

  return `/markets/${input.marketId}?${params.toString()}`;
}

function buildVendorMarketOptions(
  applications: Awaited<ReturnType<typeof listVendorApplications>>
) {
  const marketMap = new Map<string, { marketId: string; marketTitle: string }>();

  for (const application of applications) {
    if (!marketMap.has(application.marketId)) {
      marketMap.set(application.marketId, {
        marketId: application.marketId,
        marketTitle: application.marketTitle
      });
    }
  }

  return [...marketMap.values()];
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

function buildVendorApplicationsByTaskGroup(
  applications: Awaited<ReturnType<typeof listVendorApplications>>
) {
  return {
    "pending-action": applications.filter((application) => application.taskGroup === "pending-action"),
    "in-progress": applications.filter((application) => application.taskGroup === "in-progress"),
    done: applications.filter((application) => application.taskGroup === "done")
  };
}
