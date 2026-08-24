import "dotenv/config";
import { PrismaClient, ProductKind, Role, type Prisma } from "./generated/client/index.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// ── Utilities ──────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const pickMultiple = <T>(arr: T[], count: number): T[] =>
  [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ── Static Data ────────────────────────────────────────────────────────────
const adjectives = ["Premium", "Essential", "Deluxe", "Classic", "Modern", "Vintage", "Sleek", "Rugged", "Elegant", "Basic", "Pro", "Ultra", "Max", "Compact", "Heavy-Duty", "Smart", "Eco-Friendly", "Luxury", "Handcrafted", "Minimalist"];
const colors = ["Black", "White", "Silver", "Gold", "Blue", "Red", "Green", "Grey", "Navy", "Pink", "Purple"];
const materials = ["Cotton", "Leather", "Steel", "Aluminum", "Plastic", "Wood", "Glass", "Ceramic", "Silicone", "Nylon", "Bamboo"];

const kindToNames: Record<string, string[]> = {
  EATABLE: ["Snack Pack", "Organic Coffee", "Green Tea", "Chocolate Box", "Protein Bars", "Dry Fruits", "Spices Set", "Honey", "Cookies", "Oats"],
  STATIONERY: ["Notebook", "Pen Set", "Desk Organizer", "Stapler", "Highlighters", "Sticky Notes", "File Folder", "Marker Pen", "Eraser", "Calculator"],
  ELECTRONIC: ["Wireless Mouse", "Keyboard", "Headphones", "Earbuds", "Power Bank", "Charger", "Smart Watch", "Speaker", "Webcam", "Tablet Stand"],
  CLOTHING: ["T-Shirt", "Jeans", "Jacket", "Sweater", "Hoodie", "Socks", "Cap", "Shirt", "Trousers", "Shorts"],
  SHOE: ["Running Shoes", "Sneakers", "Formal Shoes", "Sandals", "Boots", "Slippers", "Loafers", "Trekking Shoes"],
  BAG: ["Backpack", "Messenger Bag", "Tote Bag", "Duffel Bag", "Laptop Bag", "Sling Bag", "Wallet", "Gym Bag"],
  ACCESSORY: ["Sunglasses", "Belt", "Scarf", "Gloves", "Tie", "Watch", "Umbrella", "Keychain", "Bandana"],
  JEWELLERY: ["Necklace", "Ring", "Bracelet", "Earrings", "Pendant", "Anklet", "Brooch", "Chain"],
  BEAUTY: ["Face Wash", "Moisturizer", "Lipstick", "Perfume", "Shampoo", "Hair Oil", "Sunscreen", "Body Lotion"],
  HEALTH: ["Vitamins", "Protein Powder", "Yoga Mat", "Fitness Band", "Massager", "First Aid Kit", "Thermometer"],
  SPORT: ["Football", "Tennis Racket", "Cricket Bat", "Dumbbells", "Skipping Rope", "Water Bottle", "Badminton Racket"],
  HOME: ["Cushion Cover", "Bedsheet", "Curtains", "Vase", "Wall Clock", "Lamp", "Rug", "Towel", "Candle"],
  KITCHEN: ["Knife Set", "Frying Pan", "Storage Containers", "Blender", "Coffee Mug", "Cutting Board", "Spatula"],
  GARDEN: ["Planter", "Watering Can", "Garden Tools", "Seeds Pack", "Fertilizer", "Bird Feeder"],
  PET: ["Dog Food", "Cat Litter", "Pet Bed", "Chew Toy", "Leash", "Collar", "Grooming Brush"],
  BABY: ["Diapers", "Baby Wipes", "Romper", "Feeding Bottle", "Pacifier", "Baby Lotion", "Rattle"],
  TOY: ["Action Figure", "Puzzle", "Board Game", "Building Blocks", "Remote Car", "Doll", "Plush Toy"],
  STAMP: ["Self-Inking Stamp", "Rubber Stamp", "Date Stamp", "Pocket Stamp", "Wax Seal", "Custom Stamp"],
  BOARD: ["Whiteboard", "Notice Board", "Chalkboard", "LED Sign Board", "Name Board", "Menu Board"],
  OTHER: ["Gift Card", "Mystery Box", "Assorted Pack", "Cleaning Kit", "Tool Kit", "Storage Box"],
};

const kindToPriceRange: Record<string, [number, number]> = {
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

const kindToCategoryName: Record<string, string> = {
  EATABLE: "Grocery & Gourmet Foods",
  STATIONERY: "Books & Stationery",
  ELECTRONIC: "Electronics & Gadgets",
  CLOTHING: "Fashion & Apparel",
  SHOE: "Footwear",
  BAG: "Bags & Luggage",
  ACCESSORY: "Accessories",
  JEWELLERY: "Jewellery",
  BEAUTY: "Beauty & Personal Care",
  HEALTH: "Health & Wellness",
  SPORT: "Sports & Fitness",
  HOME: "Home Decor",
  KITCHEN: "Kitchen & Dining",
  GARDEN: "Garden & Outdoors",
  PET: "Pet Supplies",
  BABY: "Baby Products",
  TOY: "Toys & Games",
  STAMP: "Stamps & Seals",
  BOARD: "Boards & Signs",
  OTHER: "Miscellaneous",
};

const kindToSubcategories: Record<string, string[]> = {
  EATABLE: ["Snacks & Sweets", "Beverages", "Cooking Essentials"],
  STATIONERY: ["Office Supplies", "Notebooks & Diaries", "Pens & Pencils"],
  ELECTRONIC: ["Mobile Accessories", "Computers & Laptops", "Audio & Video"],
  CLOTHING: ["Men's Clothing", "Women's Clothing", "Winter Wear"],
  SHOE: ["Sports Shoes", "Casual Shoes", "Formal Shoes"],
  BAG: ["Backpacks", "Handbags", "Travel Bags"],
  ACCESSORY: ["Sunglasses", "Watches", "Belts & Wallets"],
  JEWELLERY: ["Necklaces", "Rings", "Earrings"],
  BEAUTY: ["Skincare", "Makeup", "Haircare"],
  HEALTH: ["Supplements", "Fitness Equipment", "Medical Supplies"],
  SPORT: ["Cricket", "Football", "Yoga & Fitness"],
  HOME: ["Bedding", "Home Decor", "Lighting"],
  KITCHEN: ["Cookware", "Tableware", "Storage"],
  GARDEN: ["Plants & Seeds", "Gardening Tools", "Pots & Planters"],
  PET: ["Dog Supplies", "Cat Supplies", "Pet Grooming"],
  BABY: ["Baby Care", "Baby Clothing", "Diapering"],
  TOY: ["Action Figures", "Educational Toys", "Board Games"],
  STAMP: ["Rubber Stamps", "Custom Stamps", "Ink Pads"],
  BOARD: ["Whiteboards", "Notice Boards", "Chalkboards"],
  OTHER: ["Gift Cards", "Party Supplies", "Festive Needs"],
};

// Safe Flickr keywords to avoid NSFW
const safeKeywords: Record<string, string> = {
  CLOTHING: "clothes,fashion",
  ACCESSORY: "accessory,jewelry",
  ELECTRONIC: "gadget,electronics",
  HOME: "furniture,home",
  BEAUTY: "cosmetics,skincare",
  EATABLE: "food,grocery",
  BAG: "bag,backpack",
  SHOE: "shoes,sneakers",
  STATIONERY: "book,stationery",
  TOY: "toy,game",
  BOARD: "boardgame,chess",
  BABY: "babytoys,crib",
  GARDEN: "plant,garden",
  HEALTH: "vitamin,health",
  SPORT: "sport,fitness",
  KITCHEN: "kitchen,cookware",
  JEWELLERY: "jewelry,accessory",
  PET: "pet,supplies",
  STAMP: "stamp,office",
  OTHER: "product,box",
};

// Which kinds belong to which store slug
const kindToStoreSlug: Record<string, string> = {
  ELECTRONIC: "rahul-tech-hub",
  BOARD: "rahul-tech-hub",
  STAMP: "rahul-tech-hub",
  STATIONERY: "rahul-tech-hub",
  CLOTHING: "sneha-fashion",
  SHOE: "sneha-fashion",
  BAG: "sneha-fashion",
  JEWELLERY: "sneha-fashion",
  BEAUTY: "sneha-fashion",
  ACCESSORY: "sneha-fashion",
  EATABLE: "kisan-groceries",
  HEALTH: "kisan-groceries",
  KITCHEN: "kisan-groceries",
  GARDEN: "kisan-groceries",
  PET: "kisan-groceries",
  BABY: "kisan-groceries",
  SPORT: "kisan-groceries",
  HOME: "kisan-groceries",
  TOY: "kisan-groceries",
  OTHER: "kisan-groceries",
};

const realisticPrice = (kind: string): number => {
  const [min, max] = kindToPriceRange[kind] || kindToPriceRange.OTHER;
  const rupees = rand(min, max);
  return Math.max(39, Math.round(rupees / 10) * 10 - 1) * 100;
};

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting UrbanRanchi full seed...");
  const startTime = Date.now();

  // ── 0. CLEAR OLD DATA ──────────────────────────────────────────────
  console.log("🧹 Clearing old seed data...");
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.storeOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  // Keep existing users — only upsert the ones we need
  console.log("✅ Cleared.");

  // ── 1. SELLERS & STORES ────────────────────────────────────────────
  console.log("👤 Creating sellers, managers, and stores...");
  const defaultHash = await bcrypt.hash("Seller@2026", 10);
  const adminHash = await bcrypt.hash("Nishanr31@", 10);

  // ── Purge any stale username conflicts left from previous seed runs ──
  const seedUsernames = [
    "nishant320", "ranchikart_admin",
    "manager_amit", "manager_priya",
    "rahul_tech_hub", "sneha_fashion", "kisan_groceries",
  ];
  const seedEmails = [
    "nishantubuntu@gmail.com", "ranchikartecom@gmail.com",
    "manager1@urbanranchi.com", "manager2@urbanranchi.com",
    "seller_electronics@urbanranchi.com", "seller_fashion@urbanranchi.com", "seller_grocery@urbanranchi.com",
  ];
  // Delete users that own a reserved username but are NOT one of our seed emails
  await prisma.user.deleteMany({
    where: {
      username:  { in: seedUsernames },
      email:     { notIn: seedEmails },
    },
  });

  // Admins
  const admins = [
    { email: "nishantubuntu@gmail.com",  username: "nishant320",       name: "Nishant Admin"    },
    { email: "ranchikartecom@gmail.com", username: "ranchikart_admin",  name: "RanchiKart Admin" },
  ];
  for (const a of admins) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      await prisma.user.update({ where: { email: a.email }, data: { role: Role.ADMIN, passwordHash: adminHash, coins: 1000 } });
    } else {
      await prisma.user.create({ data: { ...a, role: Role.ADMIN, passwordHash: adminHash, isEmailVerified: true, coins: 1000 } });
    }
  }

  // Managers
  for (const m of [
    { email: "manager1@urbanranchi.com", username: "manager_amit",  name: "Amit Manager"  },
    { email: "manager2@urbanranchi.com", username: "manager_priya", name: "Priya Manager" },
  ]) {
    const existing = await prisma.user.findUnique({ where: { email: m.email } });
    if (existing) {
      await prisma.user.update({ where: { email: m.email }, data: { role: Role.MANAGER, passwordHash: defaultHash } });
    } else {
      await prisma.user.create({ data: { ...m, role: Role.MANAGER, passwordHash: defaultHash, isEmailVerified: true } });
    }
  }

  // Sellers + Stores
  const sellersData = [
    {
      email:     "seller_electronics@urbanranchi.com",
      username:  "rahul_tech_hub",
      name:      "Rahul Electronics",
      storeName: "Rahul Tech Hub",
      slug:      "rahul-tech-hub",
      desc:      "Your one-stop shop for gadgets, electronics, and stationery.",
    },
    {
      email:     "seller_fashion@urbanranchi.com",
      username:  "sneha_fashion",
      name:      "Sneha Boutique",
      storeName: "Sneha Fashion",
      slug:      "sneha-fashion",
      desc:      "Trendy clothing, footwear, bags, accessories, jewellery & beauty products.",
    },
    {
      email:     "seller_grocery@urbanranchi.com",
      username:  "kisan_groceries",
      name:      "Kisan Mart",
      storeName: "Kisan Groceries",
      slug:      "kisan-groceries",
      desc:      "Fresh groceries, health, kitchen, garden, pet, baby, toys, home & more.",
    },
  ];

  const storeIdMap = new Map<string, string>(); // slug -> store.id

  for (const s of sellersData) {
    let user = await prisma.user.findUnique({ where: { email: s.email } });
    if (user) {
      user = await prisma.user.update({ where: { email: s.email }, data: { role: Role.SELLER, passwordHash: defaultHash } });
    } else {
      user = await prisma.user.create({ data: { email: s.email, username: s.username, name: s.name, role: Role.SELLER, passwordHash: defaultHash, isEmailVerified: true } });
    }

    const store = await prisma.store.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        ownerId: user.id,
        name: s.storeName,
        slug: s.slug,
        description: s.desc,
        isActive: true,
        isVerified: true,
      },
    });
    storeIdMap.set(s.slug, store.id);
  }
  console.log(`✅ 3 sellers + 3 stores created.`);

  // ── 2. CATEGORIES ──────────────────────────────────────────────────
  console.log("📦 Creating categories...");
  const kinds = Object.values(ProductKind);
  // categoryId map: slug -> id
  const categoryIdMap = new Map<string, string>();
  // kind -> array of sub-category ids
  const kindSubCatIds = new Map<string, string[]>();

  for (const kind of kinds) {
    const parentName = kindToCategoryName[kind] || kind;
    const parentSlug = generateSlug(parentName);
    const safeKey = safeKeywords[kind] || "product";

    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {},
      create: {
        slug: parentSlug,
        name: parentName,
        description: `All ${parentName.toLowerCase()}`,
        imageUrl: `https://loremflickr.com/800/800/${safeKey}?random=${rand(1, 9999)}`,
        kind: kind as ProductKind,
      },
    });
    categoryIdMap.set(parentSlug, parent.id);

    const subIds: string[] = [];
    for (const subName of (kindToSubcategories[kind] || ["Essentials", "Premium", "Basic"])) {
      const subSlug = generateSlug(`${parentName} ${subName}`);
      const sub = await prisma.category.upsert({
        where: { slug: subSlug },
        update: {},
        create: {
          slug: subSlug,
          name: subName,
          description: `Premium selection of ${subName.toLowerCase()}`,
          imageUrl: `https://loremflickr.com/800/800/${safeKey},${subName.split(" ")[0].toLowerCase()}?random=${rand(1, 9999)}`,
          kind: kind as ProductKind,
          parentId: parent.id,
        },
      });
      subIds.push(sub.id);
    }
    kindSubCatIds.set(kind, subIds);
  }
  const totalCats = [...categoryIdMap.values()].length + [...kindSubCatIds.values()].flat().length;
  console.log(`✅ ~${totalCats} categories created (20 parent + 60 sub).`);

  // ── 3. PRODUCTS + VARIANTS ─────────────────────────────────────────
  console.log("🛍️ Generating products (25 per kind = 500 total)...");
  const productsToInsert: any[] = [];

  for (const kind of kinds) {
    const names = kindToNames[kind] || kindToNames["OTHER"];
    const storeSlug = kindToStoreSlug[kind] || "kisan-groceries";
    const storeId = storeIdMap.get(storeSlug)!;
    const subCatIds = kindSubCatIds.get(kind) || [];
    const safeKey = safeKeywords[kind] || "product";

    for (let i = 0; i < 25; i++) {
      const adj = pick(adjectives);
      const color = pick(colors);
      const material = pick(materials);
      const baseName = pick(names);
      const name = `${adj} ${color} ${baseName}`;
      const slug = generateSlug(`${name}-${kind.toLowerCase()}-${i + 1}`);
      const basePrice = realisticPrice(kind);
      const categoryId = pick(subCatIds.length > 0 ? subCatIds : [categoryIdMap.get(generateSlug(kindToCategoryName[kind]))!]);

      productsToInsert.push({
        storeId,
        categoryId,
        slug,
        name,
        description: `This ${adj.toLowerCase()} ${baseName.toLowerCase()} is crafted from high-quality ${material.toLowerCase()}. Perfect for everyday use, offering great durability and style.`,
        kind: kind as ProductKind,
        imageUrl: `https://loremflickr.com/800/800/${safeKey}?random=${rand(1, 9999)}`,
        gallery: [`https://loremflickr.com/800/800/${safeKey}?random=${rand(1, 9999)}`, `https://loremflickr.com/800/800/${safeKey}?random=${rand(1, 9999)}`],
        basePrice,
        currency: "INR",
        stock: rand(10, 500),
        isActive: Math.random() > 0.05,
        isFeatured: Math.random() > 0.8,
        tags: [adj.toLowerCase(), baseName.toLowerCase().replace(/ /g, ""), kind.toLowerCase()],
        highlights: [`Made of premium ${material.toLowerCase()}`, "Available in multiple colors", "High durability", "Eco-friendly packaging"],
        specifications: { Material: material, Weight: `${rand(100, 2000)}g`, MRP: `₹${Math.ceil(basePrice * 1.2) / 100}` },
        rating: +(Math.random() * 1.5 + 3.5).toFixed(1),
        reviewCount: rand(0, 500),
        replacementDays: pick([0, 7, 10, 30]),
        returnEligible: Math.random() > 0.5,
        dispatchDays: rand(1, 5),
        options: { colors: pickMultiple(colors, 3), size: ["Small", "Medium", "Large"] },
      });
    }
  }

  // Batch insert
  const allVariants: any[] = [];
  for (let i = 0; i < productsToInsert.length; i += 100) {
    const batch = productsToInsert.slice(i, i + 100);
    await prisma.product.createMany({ data: batch, skipDuplicates: true });

    const slugs = batch.map(p => p.slug);
    const created = await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, name: true, basePrice: true } });

    for (const p of created) {
      const numV = rand(1, 4);
      for (let v = 0; v < numV; v++) {
        const vc = pick(colors);
        const vs = pick(["Small", "Medium", "Large"]);
        allVariants.push({
          productId: p.id,
          name: `${p.name} - ${vc} / ${vs}`,
          sku: `SKU-${p.slug.toUpperCase().substring(0, 8)}-${vc.substring(0, 3).toUpperCase()}-${vs.charAt(0)}-${rand(100, 999)}`,
          priceDelta: Math.round((p.basePrice * rand(0, 12)) / 10000) * 100,
          attributes: { color: vc, size: vs },
          stock: rand(0, 100),
        });
      }
    }
  }

  for (let i = 0; i < allVariants.length; i += 500) {
    await prisma.productVariant.createMany({ data: allVariants.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`✅ ${productsToInsert.length} products + ${allVariants.length} variants created.`);

  // ── 4. COUPONS ─────────────────────────────────────────────────────
  console.log("🎟️ Creating coupons...");
  const coupons: Prisma.CouponCreateManyInput[] = [
    { code: "WELCOME10", description: "10% off on first order", type: "PERCENT", value: 10, minOrderAmount: 50000, maxUses: 10000 },
    { code: "SAVE200", description: "Flat ₹200 off above ₹999", type: "FIXED", value: 20000, minOrderAmount: 99900, maxUses: 5000 },
    { code: "FESTIVE50", description: "Flat ₹500 off above ₹2000", type: "FIXED", value: 50000, minOrderAmount: 200000, maxUses: 1000 },
    { code: "FREESHIP", description: "Free shipping", type: "FIXED", value: 5000, minOrderAmount: 30000, maxUses: 2000 },
  ];
  for (let i = 0; i < 10; i++) {
    coupons.push({ code: `PROMO${rand(10, 99)}`, description: `${rand(5, 25)}% off promo`, type: "PERCENT", value: rand(5, 25), minOrderAmount: rand(1, 10) * 10000, maxUses: rand(50, 500) });
  }
  await prisma.coupon.createMany({ data: coupons, skipDuplicates: true });
  console.log(`✅ ${coupons.length} coupons created.`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Seed complete in ${elapsed}s`);
  console.log("─────────────────────────────────────────────────────────");
  console.log("🏪 Stores:");
  console.log("   rahul-tech-hub  → Electronics, Boards, Stamps, Stationery");
  console.log("   sneha-fashion   → Clothing, Shoes, Bags, Jewellery, Beauty, Accessories");
  console.log("   kisan-groceries → Grocery, Health, Kitchen, Garden, Pet, Baby, Toys, Home, Other");
  console.log("─────────────────────────────────────────────────────────");
  console.log("👤 Admin:   nishantubuntu@gmail.com      / Nishanr31@");
  console.log("👤 Admin:   ranchikartecom@gmail.com     / Nishanr31@");
  console.log("👤 Seller:  seller_electronics@urbanranchi.com / Seller@2026");
  console.log("👤 Seller:  seller_fashion@urbanranchi.com     / Seller@2026");
  console.log("👤 Seller:  seller_grocery@urbanranchi.com     / Seller@2026");
  console.log("─────────────────────────────────────────────────────────");
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
