import { db } from "../../lib/db";

export type OrganizerListItem = {
  id: string;
  name: string;
  phone: string | null;
  isVerified: boolean;
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
      isVerified: true,
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
    isVerified: org.isVerified,
    createdAt: org.createdAt,
    marketCount: org._count.organizedMarkets
  }));
}

export async function verifyOrganizer(organizerId: string) {
  const user = await db.user.findUnique({
    where: { id: organizerId }
  });

  if (!user || user.role !== "organizer") {
    throw new Error("Organizer not found");
  }

  return db.user.update({
    where: { id: organizerId },
    data: { isVerified: true }
  });
}
