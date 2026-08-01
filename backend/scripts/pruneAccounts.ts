import "dotenv/config";
import { PrismaClient } from "../prisma/generated/client/index.js";

const prisma = new PrismaClient();

const KEEP_EMAILS = [
  "nishantubuntu@gmail.com",
  "nishanicfai@gmail.com",
  "adityakumarj277@gmail.com",
] as const;

async function main() {
  const keepEmails = KEEP_EMAILS.map((email) => email.toLowerCase());
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: { notIn: keepEmails },
    },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  const keptUsers = await prisma.user.findMany({
    where: { email: { in: keepEmails } },
    select: { id: true, email: true, role: true, isBanned: true, isDeleted: true },
    orderBy: { email: "asc" },
  });

  console.log(`Keeping ${keptUsers.length} account(s):`);
  for (const user of keptUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }

  const missingKeepEmails = keepEmails.filter((email) => !keptUsers.some((user) => user.email.toLowerCase() === email));
  if (missingKeepEmails.length) {
    console.warn(`Missing keep account(s): ${missingKeepEmails.join(", ")}`);
  }

  if (!usersToDelete.length) {
    console.log("No extra accounts found. Nothing to delete.");
    return;
  }

  const deleteIds = usersToDelete.map((user) => user.id);
  const orders = await prisma.order.findMany({
    where: { userId: { in: deleteIds } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  console.log(`Deleting ${usersToDelete.length} account(s) and ${orderIds.length} order(s).`);

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.wishlist.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.savedAddress.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.passkeyCredential.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.adminLog.deleteMany({
      where: {
        OR: [
          { adminId: { in: deleteIds } },
          { entity: { in: ["User", "USER"] }, entityId: { in: deleteIds } },
        ],
      },
    });

    if (orderIds.length) {
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.review.updateMany({
        where: { orderId: { in: orderIds } },
        data: { orderId: null },
      });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    await tx.user.deleteMany({ where: { id: { in: deleteIds } } });
  });

  console.log("Account pruning complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
