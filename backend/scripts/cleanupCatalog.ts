import "dotenv/config";
import { PrismaClient, ProductKind } from "../prisma/generated/client/index.js";
import AdminService from "../src/services/adminService.js";

const prisma = new PrismaClient();
const adminService = new AdminService();

const BAD_TERMS = [
  "test",
  "dummy",
  "sample",
  "fdg",
  "asdf",
  "qwerty",
  "invoice",
  "payment test",
  "order test",
  "lorem ipsum",
];

const PRICE_RANGES: Record<ProductKind, [number, number]> = {
  EATABLE: [59, 899],
  STATIONERY: [39, 799],
  ELECTRONIC: [299, 8999],
  CLOTHING: [249, 2499],
  SHOE: [399, 3999],
  BAG: [299, 4999],
  ACCESSORY: [79, 1999],
  JEWELLERY: [199, 9999],
  BEAUTY: [89, 2499],
  HEALTH: [149, 4999],
  SPORT: [149, 6999],
  HOME: [149, 6999],
  KITCHEN: [89, 4999],
  GARDEN: [49, 1999],
  PET: [99, 2999],
  BABY: [99, 2499],
  TOY: [99, 2999],
  STAMP: [149, 1499],
  BOARD: [299, 9999],
  OTHER: [99, 1999],
};

function badTextWhere(field: "name" | "slug" | "description") {
  return BAD_TERMS.map((term) => ({ [field]: { contains: term, mode: "insensitive" as const } }));
}

function qualityPrice(kind: ProductKind, seed: string) {
  const [min, max] = PRICE_RANGES[kind] ?? PRICE_RANGES.OTHER;
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rupees = min + (hash % Math.max(1, max - min));
  return (Math.max(39, Math.round(rupees / 10) * 10 - 1)) * 100;
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isBanned: false, isDeleted: false },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No active admin account found. Run admin:bootstrap first.");

  const badCategories = await prisma.category.findMany({
    where: {
      slug: { not: "archived-products" },
      OR: [...badTextWhere("name"), ...badTextWhere("slug"), ...badTextWhere("description")],
    },
    select: { id: true, name: true, slug: true },
  });

  let deletedCategories = 0;
  for (const category of badCategories) {
    try {
      await adminService.deleteCategory(admin.id, category.id);
      deletedCategories += 1;
      console.log(`Deleted category tree: ${category.name} (${category.slug})`);
    } catch (error: any) {
      console.warn(`Skipped category ${category.slug}: ${error?.message ?? error}`);
    }
  }

  const badProducts = await prisma.product.findMany({
    where: {
      slug: { not: "deleted-product-placeholder" },
      OR: [...badTextWhere("name"), ...badTextWhere("slug"), ...badTextWhere("description")],
    },
    select: { id: true, name: true, slug: true },
  });

  let deletedProducts = 0;
  for (const product of badProducts) {
    try {
      await adminService.deleteProduct(admin.id, product.id);
      deletedProducts += 1;
      console.log(`Deleted product: ${product.name} (${product.slug})`);
    } catch (error: any) {
      console.warn(`Skipped product ${product.slug}: ${error?.message ?? error}`);
    }
  }

  const poorlyPriced = await prisma.product.findMany({
    where: {
      slug: { not: "deleted-product-placeholder" },
    },
    select: { id: true, slug: true, kind: true, basePrice: true },
  });

  let updatedPrices = 0;
  for (const product of poorlyPriced) {
    if (product.basePrice >= 3900 && product.basePrice <= 999900 && product.basePrice % 100 === 0) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { basePrice: qualityPrice(product.kind, product.slug) },
    });
    updatedPrices += 1;
  }

  console.log("Catalog cleanup complete.");
  console.log(`Admin: ${admin.email}`);
  console.log(`Category trees deleted: ${deletedCategories}`);
  console.log(`Products deleted: ${deletedProducts}`);
  console.log(`Prices normalized: ${updatedPrices}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
