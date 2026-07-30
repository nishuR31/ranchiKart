import { PrismaClient } from "../prisma/generated/client/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@31", 10);
  const managerPassword = await bcrypt.hash("Manager@31", 10);

  console.log("Upserting Admin...");
  await prisma.user.upsert({
    where: { email: "nishanadmin@gmail.com" },
    update: {
      username: "admin@31",
      passwordHash: adminPassword,
      role: "ADMIN",
      isEmailVerified: true,
      coins: 1000
    },
    create: {
      email: "nishanadmin@gmail.com",
      username: "admin@31",
      name: "Nishan Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      isEmailVerified: true,
      coins: 1000
    }
  });

  console.log("Upserting Manager...");
  await prisma.user.upsert({
    where: { email: "nishanmanager@gmail.com" },
    update: {
      username: "manager@31",
      passwordHash: managerPassword,
      role: "MANAGER",
      isEmailVerified: true
    },
    create: {
      email: "nishanmanager@gmail.com",
      username: "manager@31",
      name: "Nishan Manager",
      passwordHash: managerPassword,
      role: "MANAGER",
      isEmailVerified: true
    }
  });

  console.log("Success! You can now log in with the new credentials.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
