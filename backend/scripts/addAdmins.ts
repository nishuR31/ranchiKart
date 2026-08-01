import { PrismaClient } from "../prisma/generated/client/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const nishantAdminPassword = await bcrypt.hash("Admin@Password", 10);

  console.log("Upserting Nishant Admin...");
  await prisma.user.upsert({
    where: { email: "nishantubuntu@gmail.com" },
    update: {
      username: "nishant320",
      name: "Nishant Admin",
      passwordHash: nishantAdminPassword,
      role: "ADMIN",
      isEmailVerified: true,
      isBanned: false,
      banReason: null,
      isDeleted: false,
      deletedAt: null,
      scheduledHardDeleteAt: null,
      coins: 1000
    },
    create: {
      email: "nishantubuntu@gmail.com",
      username: "nishant320",
      name: "Nishant Admin",
      passwordHash: nishantAdminPassword,
      role: "ADMIN",
      isEmailVerified: true,
      coins: 1000
    }
  });

  console.log("Success! Nishant admin is ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
