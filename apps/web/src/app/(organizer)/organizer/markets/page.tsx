import { revalidatePath } from "next/cache";
import Link from "next/link";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import {
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

  await createOrganizerMarket({
    organizerId: sessionUser.userId,
    title: String(formData.get("title") ?? ""),
    city: String(formData.get("city") ?? ""),
    startsAt: normalizeDateTimeInput(String(formData.get("startsAt") ?? "")),
    endsAt: normalizeDateTimeInput(String(formData.get("endsAt") ?? ""))
  });
  revalidatePath("/organizer/markets");
}

async function publishMarketAction(formData: FormData) {
  "use server";

  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "organizer") {
    return;
  }

  await publishOrganizerMarket({
    marketId: String(formData.get("marketId") ?? ""),
    organizerId: sessionUser.userId
  });
  revalidatePath("/organizer/markets");
}

export default async function OrganizerMarketsPage() {
  const sessionUser = await getSessionUser();
  const isOrganizerSession = sessionUser?.role === "organizer";
  const markets = isOrganizerSession
    ? await listOrganizerMarkets(sessionUser.userId)
    : [];

  return (
    <AppShell>
      <main aria-labelledby="organizer-markets-title">
        <h2 id="organizer-markets-title">我的市集</h2>
        <p>创建草稿、编辑信息，并在准备完成后发布市集。</p>

        {!isOrganizerSession ? <p>请先以主办方身份登录后管理市集。</p> : null}

        <form action={createMarketAction} aria-label="市集表单">
          <label>
            市集标题
            <input name="title" type="text" />
          </label>
          <label>
            城市
            <input name="city" type="text" />
          </label>
          <label>
            开始时间
            <input aria-label="开始时间" name="startsAt" type="datetime-local" />
          </label>
          <label>
            结束时间
            <input aria-label="结束时间" name="endsAt" type="datetime-local" />
          </label>
          <button type="submit">创建草稿</button>
        </form>

        {isOrganizerSession && markets.length === 0 ? (
          <p>当前还没有市集，请先创建草稿。</p>
        ) : null}

        <section aria-label="市集列表">
          {markets.map((market) => (
            <article key={market.id}>
              <h3>{market.title}</h3>
              <p>
                {market.city} · {getMarketStatusLabel(market.status)}
              </p>
              <p>
                {formatDate(market.startsAt)} 至 {formatDate(market.endsAt)}
              </p>
              <nav aria-label={`${market.title} 管理入口`}>
                <Link aria-label={`${market.title} 查看报名`} href="/organizer/applications">
                  查看报名
                </Link>
                <Link aria-label={`${market.title} 摊位管理`} href="/organizer/stalls">
                  摊位管理
                </Link>
                <Link aria-label={`${market.title} 查看看板`} href={`/organizer/dashboard/${market.id}`}>
                  查看看板
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

function getMarketStatusLabel(status: string) {
  if (status === "draft") {
    return "草稿";
  }

  if (status === "published") {
    return "已发布";
  }

  if (status === "recruiting") {
    return "招募中";
  }

  if (status === "reviewing") {
    return "审核中";
  }

  if (status === "confirmed") {
    return "已确认";
  }

  if (status === "ongoing") {
    return "进行中";
  }

  if (status === "completed") {
    return "已完成";
  }

  return status;
}

function normalizeDateTimeInput(value: string) {
  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime()) ? value : normalized.toISOString();
}
