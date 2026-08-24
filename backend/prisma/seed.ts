import "dotenv/config";
import { PrismaClient, ProductKind, Role } from "./generated/client/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding genuine sellers and managers...");
  const passwordHash = await bcrypt.hash("Seller@2026", 10);

  // 1. Create Managers
  const managers = [
    { email: "manager1@ranchikart.com", name: "Amit Manager", role: Role.MANAGER, username: "manager_amit" },
    { email: "manager2@ranchikart.com", name: "Priya Manager", role: Role.MANAGER, username: "manager_priya" }
  ];

  for (const m of managers) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: { role: m.role },
      create: { ...m, passwordHash, isEmailVerified: true }
    });
  }
  console.log("✅ Managers seeded.");

  // 2. Create Sellers and their Stores
  const sellersData = [
    { email: "seller_electronics@ranchikart.com", name: "Rahul Electronics", storeName: "Rahul Tech Hub", slug: "rahul-tech-hub" },
    { email: "seller_fashion@ranchikart.com", name: "Sneha Boutique", storeName: "Sneha Fashion", slug: "sneha-fashion" },
    { email: "seller_grocery@ranchikart.com", name: "Kisan Mart", storeName: "Kisan Groceries", slug: "kisan-groceries" }
  ];

  for (const s of sellersData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { role: Role.SELLER },
      create: { email: s.email, name: s.name, username: s.slug.replace(/-/g, "_"), role: Role.SELLER, passwordHash, isEmailVerified: true }
    });

    await prisma.store.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        ownerId: user.id,
        name: s.storeName,
        slug: s.slug,
        description: `Official store of ${s.name}`,
        isActive: true,
        isVerified: true
      }
    });
  }
  console.log("✅ Sellers and stores seeded.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
