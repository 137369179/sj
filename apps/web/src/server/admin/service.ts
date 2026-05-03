import { db } from "../../lib/db";

export type OrganizerListItem = {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  marketCount: number;
};

export async function listOrganizers(): Promise<OrganizerListItem[]> {
  const organizers = await db.user.findMany({
    where: {
      role: "organizer"
    },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      _count: {
        select: { organizedMarkets: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return organizers.map((org) => ({
    id: org.id,
    name: org.name,
    phone: org.phone,
    createdAt: org.createdAt,
    marketCount: org._count.organizedMarkets
  }));
}