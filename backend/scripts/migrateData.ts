import "dotenv/config";
import { PrismaClient, ProductKind } from "../prisma/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migrating existing products to seeded sellers...");

  // Fetch the genuine sellers' stores we just seeded
  const stores = await prisma.store.findMany({
    where: {
      slug: {
        in: ["rahul-tech-hub", "sneha-fashion", "kisan-groceries"]
      }
    }
  });

  if (stores.length === 0) {
    console.log("⚠️ No seeded stores found. Please run seed.ts first.");
    return;
  }

  const storeMap = {
    "rahul-tech-hub": stores.find(s => s.slug === "rahul-tech-hub")?.id,
    "sneha-fashion": stores.find(s => s.slug === "sneha-fashion")?.id,
    "kisan-groceries": stores.find(s => s.slug === "kisan-groceries")?.id,
  };

  // Fetch all products
  const products = await prisma.product.findMany();
  console.log(`📦 Found ${products.length} products to migrate.`);

  let migratedCount = 0;

  for (const product of products) {
    let targetStoreId = null;

    // Categorize by kind to assign to proper store
    if ([ProductKind.ELECTRONIC, ProductKind.ACCESSORY, ProductKind.BOARD].includes(product.kind)) {
      targetStoreId = storeMap["rahul-tech-hub"];
    } else if ([ProductKind.CLOTHING, ProductKind.SHOE, ProductKind.BAG, ProductKind.JEWELLERY, ProductKind.BEAUTY].includes(product.kind)) {
      targetStoreId = storeMap["sneha-fashion"];
    } else {
      // Grocery and everything else
      targetStoreId = storeMap["kisan-groceries"];
    }

    if (targetStoreId && product.storeId !== targetStoreId) {
      await prisma.product.update({
        where: { id: product.id },
        data: { storeId: targetStoreId }
      });
      migratedCount++;
    }
  }

  console.log(`✅ Successfully migrated ${migratedCount} products to genuine sellers.`);
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
