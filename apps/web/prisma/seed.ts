import { PrismaClient, UserRole, MarketStatus, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureRoleMembership(userId: string, role: UserRole) {
  await prisma.userRoleMembership.upsert({
    where: {
      userId_role: {
        userId,
        role,
      },
    },
    update: {
      status: "active",
    },
    create: {
      userId,
      role,
      status: "active",
    },
  });
}

async function main() {
  console.log("Start seeding...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      phone: "13800000000",
      role: UserRole.admin,
      name: "Platform Admin",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "admin@example.com",
      phone: "13800000000",
      role: UserRole.admin,
      name: "Platform Admin",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(admin.id, UserRole.admin);
  console.log(`Created admin user: ${admin.name}`);

  const organizer1 = await prisma.user.upsert({
    where: { email: "organizer1@example.com" },
    update: {
      phone: "13800000001",
      role: UserRole.organizer,
      name: "Coffee Culture Org",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "organizer1@example.com",
      phone: "13800000001",
      role: UserRole.organizer,
      name: "Coffee Culture Org",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(organizer1.id, UserRole.organizer);

  const organizer2 = await prisma.user.upsert({
    where: { email: "organizer2@example.com" },
    update: {
      phone: "13800000002",
      role: UserRole.organizer,
      name: "Artisan Weekend Org",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "organizer2@example.com",
      phone: "13800000002",
      role: UserRole.organizer,
      name: "Artisan Weekend Org",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(organizer2.id, UserRole.organizer);
  console.log(`Created organizers: ${organizer1.name}, ${organizer2.name}`);

  const vendor1 = await prisma.user.upsert({
    where: { email: "vendor1@example.com" },
    update: {
      phone: "13800000003",
      role: UserRole.vendor,
      name: "Vendor - Sunset Bakery",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "vendor1@example.com",
      phone: "13800000003",
      role: UserRole.vendor,
      name: "Vendor - Sunset Bakery",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(vendor1.id, UserRole.vendor);

  const vendor2 = await prisma.user.upsert({
    where: { email: "vendor2@example.com" },
    update: {
      phone: "13800000004",
      role: UserRole.vendor,
      name: "Vendor - Retro Vintage",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "vendor2@example.com",
      phone: "13800000004",
      role: UserRole.vendor,
      name: "Vendor - Retro Vintage",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(vendor2.id, UserRole.vendor);

  const vendor3 = await prisma.user.upsert({
    where: { email: "vendor3@example.com" },
    update: {
      phone: "13800000005",
      role: UserRole.vendor,
      name: "Vendor - Craft Brews",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
    create: {
      email: "vendor3@example.com",
      phone: "13800000005",
      role: UserRole.vendor,
      name: "Vendor - Craft Brews",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isVerified: true,
    },
  });
  await ensureRoleMembership(vendor3.id, UserRole.vendor);
  console.log(`Created vendors: ${vendor1.name}, ${vendor2.name}, ${vendor3.name}`);

  const market1 = await prisma.market.create({
    data: {
      title: "杭州西湖咖啡生活节",
      city: "杭州",
      startsAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(new Date().getTime() + 9 * 24 * 60 * 60 * 1000),
      status: MarketStatus.published,
      isPlatformApproved: true,
      organizerId: organizer1.id,
      stalls: {
        create: [
          { code: "A01", name: "主入口特展区", isActive: true, price: 800 },
          { code: "A02", name: "精品咖啡区", isActive: true, price: 500 },
          { code: "B01", name: "文创周边区", isActive: true, price: 300 },
        ],
      },
    },
    include: { stalls: true },
  });

  const market2 = await prisma.market.create({
    data: {
      title: "上海秋日手作市集 (草稿)",
      city: "上海",
      startsAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
      endsAt: new Date(new Date().getTime() + 32 * 24 * 60 * 60 * 1000),
      status: MarketStatus.draft,
      organizerId: organizer2.id,
    },
  });
  console.log(`Created markets: ${market1.title}, ${market2.title}`);

  const application1 = await prisma.application.create({
    data: {
      marketId: market1.id,
      vendorId: vendor1.id,
      status: ApplicationStatus.submitted,
      boothPreference: "靠走道",
      applicationNote: "希望能提供大功率电源接口",
    },
  });

  const application2 = await prisma.application.create({
    data: {
      marketId: market1.id,
      vendorId: vendor2.id,
      status: ApplicationStatus.approved,
      boothPreference: "任何位置都可以",
      applicationNote: "我们是做复古服装的",
    },
  });

  const application3 = await prisma.application.create({
    data: {
      marketId: market1.id,
      vendorId: vendor3.id,
      status: ApplicationStatus.paid,
      boothPreference: "人流密集处",
      applicationNote: "需要大功率用电",
      order: {
        create: {
          vendorId: vendor3.id,
          amount: 800,
          status: "paid",
          paymentMethod: "wechat",
          paidAt: new Date(),
        },
      },
    },
  });

  console.log("Created applications for vendors");

  await prisma.stall.update({
    where: { id: market1.stalls[0].id },
    data: { assignedApplicationId: application3.id },
  });
  await prisma.stall.update({
    where: { id: market1.stalls[1].id },
    data: { assignedApplicationId: application2.id },
  });
  await prisma.application.update({
    where: { id: application2.id },
    data: { status: ApplicationStatus.stall_assigned },
  });
  console.log("Assigned stall to application");

  console.log("Seeding finished.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
