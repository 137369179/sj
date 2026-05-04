import { db } from "../../lib/db";

export async function getAdminMarketById(marketId: string) {
  return db.market.findUnique({
    where: { id: marketId },
    include: {
      organizer: { select: { name: true, phone: true } }
    }
  });
}

export async function listAdminMarkets() {
  return db.market.findMany({
    include: {
      organizer: { select: { name: true } },
      _count: { select: { stalls: true, applications: true } }
    },
    orderBy: { startsAt: "desc" }
  });
}

export async function approveMarket(marketId: string) {
  const market = await db.market.findUnique({ where: { id: marketId } });
  if (!market) throw new Error("Market not found");
  if (market.status !== "published") throw new Error("Only published markets can be approved");

  return db.market.update({
    where: { id: marketId },
    data: { isPlatformApproved: true }
  });
}

export async function rejectMarket(marketId: string) {
  const market = await db.market.findUnique({ where: { id: marketId } });
  if (!market) throw new Error("Market not found");

  return db.market.update({
    where: { id: marketId },
    data: { status: "draft", isPlatformApproved: false }
  });
}