"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "../../../../lib/auth";
import { approveMarket, rejectMarket } from "../../../../server/admin/market-service";

export async function approveMarketAction(marketId: string) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await approveMarket(marketId);
  revalidatePath("/admin/markets");
}

export async function rejectMarketAction(marketId: string) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await rejectMarket(marketId);
  revalidatePath("/admin/markets");
}