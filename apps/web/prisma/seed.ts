import { PrismaClient, UserRole, MarketStatus, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { phone: "13800000000" },
    update: {},
    create: {
      phone: "13800000000",
      name: "Platform Admin",
      role: UserRole.admin
    }
  });
  console.log(`Created admin user: ${admin.name}`);

  // 2. Create Organizers
  const organizer1 = await prisma.user.upsert({
    where: { phone: "13800000001" },
    update: {},
    create: {
      phone: "13800000001",
      name: "Coffee Culture Org",
      role: UserRole.organizer
    }
  });

  const organizer2 = await prisma.user.upsert({
    where: { phone: "13800000002" },
    update: {},
    create: {
      phone: "13800000002",
      name: "Artisan Weekend Org",
      role: UserRole.organizer
    }
  });
  console.log(`Created organizers: ${organizer1.name}, ${organizer2.name}`);

  // 3. Create Vendors
  const vendor1 = await prisma.user.upsert({
    where: { phone: "13800000003" },
    update: {},
    create: {
      phone: "13800000003",
      name: "Vendor - Sunset Bakery",
      role: UserRole.vendor
    }
  });

  const vendor2 = await prisma.user.upsert({
    where: { phone: "13800000004" },
    update: {},
    create: {
      phone: "13800000004",
      name: "Vendor - Retro Vintage",
      role: UserRole.vendor
    }
  });
  console.log(`Created vendors: ${vendor1.name}, ${vendor2.name}`);

  // 4. Create Markets
  const market1 = await prisma.market.create({
    data: {
      title: "杭州西湖咖啡生活节",
      city: "杭州",
      startsAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
      endsAt: new Date(new Date().getTime() + 9 * 24 * 60 * 60 * 1000),
      status: MarketStatus.published,
      isPlatformApproved: true,
      organizerId: organizer1.id,
      stalls: {
        create: [
          { code: "A01", name: "主入口特展区", isActive: true },
          { code: "A02", name: "精品咖啡区", isActive: true },
          { code: "B01", name: "文创周边区", isActive: true }
        ]
      }
    },
    include: { stalls: true }
  });

  const market2 = await prisma.market.create({
    data: {
      title: "上海秋日手作市集 (草稿)",
      city: "上海",
      startsAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // Next month
      endsAt: new Date(new Date().getTime() + 32 * 24 * 60 * 60 * 1000),
      status: MarketStatus.draft,
      organizerId: organizer2.id
    }
  });
  console.log(`Created markets: ${market1.title}, ${market2.title}`);

  // 5. Create Applications
  const application1 = await prisma.application.create({
    data: {
      marketId: market1.id,
      vendorId: vendor1.id,
      status: ApplicationStatus.submitted,
      boothPreference: "靠走道",
      applicationNote: "希望能提供大功率电源接口"
    }
  });

  const application2 = await prisma.application.create({
    data: {
      marketId: market1.id,
      vendorId: vendor2.id,
      status: ApplicationStatus.approved,
      boothPreference: "任何位置都可以",
      applicationNote: "我们是做复古服装的"
    }
  });
  console.log(`Created applications for vendors`);

  // 6. Assign Stall
  await prisma.stall.update({
    where: { id: market1.stalls[0].id },
    data: { assignedApplicationId: application2.id }
  });
  await prisma.application.update({
    where: { id: application2.id },
    data: { status: ApplicationStatus.stall_assigned }
  });
  console.log(`Assigned stall to application`);

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });