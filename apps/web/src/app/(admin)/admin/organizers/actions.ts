"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "../../../../lib/auth";
import { verifyOrganizer } from "../../../../server/admin/service";

export async function verifyOrganizerAction(organizerId: string) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await verifyOrganizer(organizerId);

  revalidatePath("/admin/organizers");
}