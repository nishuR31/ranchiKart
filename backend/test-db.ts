import { PrismaClient } from './prisma/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    _count: {
      id: true,
    },
  });
  console.log(counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
