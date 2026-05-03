import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import { getMarketStatusLabel } from "../../../../lib/market-status";
import {
  MarketPublishError,
  createOrganizerMarket,
  listOrganizerMarkets,
  publishOrganizerMarket
} from "../../../../server/markets/service";

async function createMarketAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  try {
    await createOrganizerMarket({
      organizerId: sessionUser.userId,
      title: String(formData.get("title") ?? ""),
      city: String(formData.get("city") ?? ""),
      startsAt: normalizeDateTimeInput(String(formData.get("startsAt") ?? "")),
      endsAt: normalizeDateTimeInput(String(formData.get("endsAt") ?? ""))
    });
    revalidatePath("/organizer/markets");
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(
        buildCreateMarketErrorHref({
          titleError: getFirstFieldError(error, "title"),
          cityError: getFirstFieldError(error, "city"),
          startsAtError: getFirstFieldError(error, "startsAt"),
          endsAtError: getFirstFieldError(error, "endsAt")
        })
      );
    }

    throw error;
  }
}

async function publishMarketAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  try {
    await publishOrganizerMarket({
      marketId: String(formData.get("marketId") ?? ""),
      organizerId: sessionUser.userId
    });
    revalidatePath("/organizer/markets");
  } catch (error) {
    if (error instanceof MarketPublishError) {
      redirect(`/organizer/markets?publishError=${error.code}`);
    }

    throw error;
  }
}

type OrganizerMarketsPageProps = {
  searchParams?: Promise<{
    status?: string;
    titleError?: string;
    cityError?: string;
    startsAtError?: string;
    endsAtError?: string;
    publishError?: string;
  }>;
};

export default async function OrganizerMarketsPage({
  searchParams
}: OrganizerMarketsPageProps) {
  const sessionUser = await getSessionUser();
  const isOrganizerSession = sessionUser?.role === "organizer";
  const markets = isOrganizerSession
    ? await listOrganizerMarkets(sessionUser.userId)
    : [];
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = getSelectedMarketStatus(resolvedSearchParams.status);
  const createMarketErrors = getCreateMarketErrors(resolvedSearchParams);
  const publishErrorMessage = getPublishErrorMessage(resolvedSearchParams.publishError);
  const filteredMarkets =
    selectedStatus === "all"
      ? markets
      : markets.filter((market) => market.status === selectedStatus);
  const summary = buildMarketSummary(markets);

  return (
    <AppShell>
      <main aria-labelledby="organizer-markets-title">
        <h2 id="organizer-markets-title">我的市集</h2>
        <p>创建草稿、编辑信息，并在准备完成后发布市集。</p>

        {!isOrganizerSession ? <p>请先以主办方身份登录后管理市集。</p> : null}

        <form action={createMarketAction} aria-label="市集表单">
          {createMarketErrors.formError ? (
            <p role="alert">{createMarketErrors.formError}</p>
          ) : null}
          <label>
            市集标题
            <input
              aria-invalid={createMarketErrors.title ? "true" : "false"}
              name="title"
              type="text"
            />
          </label>
          {createMarketErrors.title ? <p>{createMarketErrors.title}</p> : null}
          <label>
            城市
            <input
              aria-invalid={createMarketErrors.city ? "true" : "false"}
              name="city"
              type="text"
            />
          </label>
          {createMarketErrors.city ? <p>{createMarketErrors.city}</p> : null}
          <label>
            开始时间
            <input
              aria-invalid={createMarketErrors.startsAt ? "true" : "false"}
              aria-label="开始时间"
              name="startsAt"
              type="datetime-local"
            />
          </label>
          {createMarketErrors.startsAt ? <p>{createMarketErrors.startsAt}</p> : null}
          <label>
            结束时间
            <input
              aria-invalid={createMarketErrors.endsAt ? "true" : "false"}
              aria-label="结束时间"
              name="endsAt"
              type="datetime-local"
            />
          </label>
          {createMarketErrors.endsAt ? <p>{createMarketErrors.endsAt}</p> : null}
          <button type="submit">创建草稿</button>
        </form>

        {isOrganizerSession ? (
          <>
            {publishErrorMessage ? <p role="alert">{publishErrorMessage}</p> : null}
            <section aria-label="市集摘要">
              <p>全部市集：{summary.all}</p>
              <p>草稿：{summary.draft}</p>
              <p>已发布：{summary.published}</p>
              <p>已完成：{summary.completed}</p>
            </section>

            <nav aria-label="市集状态筛选">
              <Link href="/organizer/markets">全部（{summary.all}）</Link>
              <Link href="/organizer/markets?status=draft">草稿（{summary.draft}）</Link>
              <Link href="/organizer/markets?status=published">
                已发布（{summary.published}）
              </Link>
              <Link href="/organizer/markets?status=completed">
                已完成（{summary.completed}）
              </Link>
            </nav>
          </>
        ) : null}

        {isOrganizerSession && filteredMarkets.length === 0 ? (
          <p>当前还没有市集，请先创建草稿。</p>
        ) : null}

        <section aria-label="市集列表">
          {filteredMarkets.map((market) => (
            <article key={market.id}>
              <h3>{market.title}</h3>
              <p>
                {market.city} · {getMarketStatusLabel(market.status)}
              </p>
              <p>
                {formatDate(market.startsAt)} 至 {formatDate(market.endsAt)}
              </p>
              <nav aria-label={`${market.title} 管理入口`}>
                <Link
                  aria-label={`${market.title} 查看报名申请`}
                  href={buildOrganizerMarketsTargetHref({
                    pathname: "/organizer/applications",
                    marketId: market.id,
                    selectedStatus
                  })}
                >
                  查看报名申请
                </Link>
                <Link
                  aria-label={`${market.title} 摊位管理`}
                  href={buildOrganizerMarketsTargetHref({
                    pathname: "/organizer/stalls",
                    marketId: market.id,
                    selectedStatus
                  })}
                >
                  摊位管理
                </Link>
                <Link
                  aria-label={`${market.title} 查看市集看板`}
                  href={buildOrganizerDashboardHref({
                    marketId: market.id,
                    selectedStatus
                  })}
                >
                  查看市集看板
                </Link>
              </nav>
              {market.status === "draft" ? (
                <form action={publishMarketAction} aria-label={`${market.title} 发布表单`}>
                  <input name="marketId" type="hidden" value={market.id} />
                  <button type="submit">{`发布 ${market.title}`}</button>
                </form>
              ) : null}
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

function getSelectedMarketStatus(status: string | undefined) {
  if (status === "draft" || status === "published" || status === "completed") {
    return status;
  }

  return "all";
}

function buildMarketSummary(markets: Awaited<ReturnType<typeof listOrganizerMarkets>>) {
  return {
    all: markets.length,
    draft: markets.filter((market) => market.status === "draft").length,
    published: markets.filter((market) => market.status === "published").length,
    completed: markets.filter((market) => market.status === "completed").length
  };
}

function getPublishErrorMessage(code: string | undefined) {
  if (code === "NOT_FOUND") {
    return "发布失败：市集不存在。";
  }

  if (code === "FORBIDDEN") {
    return "发布失败：无权操作该市集。";
  }

  if (code === "INVALID_STATUS") {
    return "发布失败：市集当前状态无法发布，请确保市集包含至少一个摊位。";
  }

  return null;
}

function normalizeDateTimeInput(value: string) {
  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime()) ? value : normalized.toISOString();
}

function getFirstFieldError(error: ZodError, field: string) {
  return error.flatten().fieldErrors[field]?.[0];
}

function buildCreateMarketErrorHref(input: {
  titleError?: string;
  cityError?: string;
  startsAtError?: string;
  endsAtError?: string;
}) {
  const params = new URLSearchParams();

  if (input.titleError) {
    params.set("titleError", input.titleError);
  }

  if (input.cityError) {
    params.set("cityError", input.cityError);
  }

  if (input.startsAtError) {
    params.set("startsAtError", input.startsAtError);
  }

  if (input.endsAtError) {
    params.set("endsAtError", input.endsAtError);
  }

  return `/organizer/markets?${params.toString()}`;
}

function getCreateMarketErrors(searchParams: {
  titleError?: string;
  cityError?: string;
  startsAtError?: string;
  endsAtError?: string;
}) {
  const errors = {
    title: searchParams.titleError,
    city: searchParams.cityError,
    startsAt: searchParams.startsAtError,
    endsAt: searchParams.endsAtError
  };

  return {
    ...errors,
    formError:
      errors.title || errors.city || errors.startsAt || errors.endsAt
        ? "创建市集失败，请修正后重试。"
        : null
  };
}

function buildOrganizerMarketsTargetHref(input: {
  pathname: "/organizer/applications" | "/organizer/stalls";
  marketId: string;
  selectedStatus: "all" | "draft" | "published" | "completed";
}) {
  const params = new URLSearchParams({
    marketId: input.marketId,
    from: "markets"
  });

  if (input.selectedStatus !== "all") {
    params.set("marketStatus", input.selectedStatus);
  }

  return `${input.pathname}?${params.toString()}`;
}

function buildOrganizerDashboardHref(input: {
  marketId: string;
  selectedStatus: "all" | "draft" | "published" | "completed";
}) {
  const params = new URLSearchParams({
    from: "markets"
  });

  if (input.selectedStatus !== "all") {
    params.set("marketStatus", input.selectedStatus);
  }

  return `/organizer/dashboard/${input.marketId}?${params.toString()}`;
}
