import "dotenv/config";
import { PrismaClient, ProductKind, PaymentMethod, OrderStatus, type Prisma } from "./generated/client/index.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Utility for randomness
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const pickMultiple = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const randDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Data Dictionaries for Procedural Generation
const adjectives = ["Premium", "Essential", "Deluxe", "Classic", "Modern", "Vintage", "Sleek", "Rugged", "Elegant", "Basic", "Pro", "Ultra", "Max", "Compact", "Heavy-Duty", "Smart", "Eco-Friendly", "Luxury", "Handcrafted", "Minimalist"];
const colors = ["Black", "White", "Silver", "Gold", "Blue", "Red", "Green", "Yellow", "Grey", "Navy", "Pink", "Purple", "Multicolor"];
const materials = ["Cotton", "Leather", "Steel", "Aluminum", "Plastic", "Wood", "Glass", "Ceramic", "Silicone", "Nylon", "Carbon Fiber", "Bamboo"];

const kindToNames: Record<string, string[]> = {
  EATABLE: ["Snack Pack", "Organic Coffee", "Green Tea", "Chocolate Box", "Protein Bars", "Dry Fruits", "Spices Set", "Honey", "Cookies", "Oats"],
  STATIONERY: ["Notebook", "Pen Set", "Desk Organizer", "Stapler", "Highlighters", "Sticky Notes", "File Folder", "Marker Pen", "Eraser", "Calculator"],
  ELECTRONIC: ["Wireless Mouse", "Keyboard", "Headphones", "Earbuds", "Power Bank", "Charger", "Smart Watch", "Speaker", "Webcam", "Tablet Stand"],
  CLOTHING: ["T-Shirt", "Jeans", "Jacket", "Sweater", "Hoodie", "Socks", "Cap", "Shirt", "Trousers", "Shorts"],
  SHOE: ["Running Shoes", "Sneakers", "Formal Shoes", "Sandals", "Boots", "Slippers", "Loafers", "Trekking Shoes", "Sports Shoes"],
  BAG: ["Backpack", "Messenger Bag", "Tote Bag", "Duffel Bag", "Laptop Bag", "Sling Bag", "Wallet", "Travel Pouch", "Gym Bag"],
  ACCESSORY: ["Sunglasses", "Belt", "Scarf", "Gloves", "Tie", "Watch", "Umbrella", "Keychain", "Cap", "Bandana"],
  JEWELLERY: ["Necklace", "Ring", "Bracelet", "Earrings", "Pendant", "Anklet", "Brooch", "Chain", "Cufflinks"],
  BEAUTY: ["Face Wash", "Moisturizer", "Lipstick", "Perfume", "Shampoo", "Hair Oil", "Sunscreen", "Body Lotion", "Serum", "Face Mask"],
  HEALTH: ["Vitamins", "Protein Powder", "Yoga Mat", "Fitness Band", "Massager", "First Aid Kit", "Thermometer", "Knee Support", "Weight Scale"],
  SPORT: ["Football", "Tennis Racket", "Cricket Bat", "Dumbbells", "Skipping Rope", "Water Bottle", "Gym Gloves", "Basketball", "Badminton Racket"],
  HOME: ["Cushion Cover", "Bedsheet", "Curtains", "Vase", "Wall Clock", "Lamp", "Rug", "Towel", "Candle", "Photo Frame"],
  KITCHEN: ["Knife Set", "Frying Pan", "Storage Containers", "Blender", "Coffee Mug", "Cutting Board", "Cutlery Set", "Spatula", "Water Jug"],
  GARDEN: ["Planter", "Watering Can", "Garden Tools", "Seeds Pack", "Fertilizer", "Hose Pipe", "Bird Feeder", "Pruning Shears", "Garden Gloves"],
  PET: ["Dog Food", "Cat Litter", "Pet Bed", "Chew Toy", "Leash", "Collar", "Grooming Brush", "Pet Bowl", "Aquarium Filter"],
  BABY: ["Diapers", "Baby Wipes", "Romper", "Feeding Bottle", "Pacifier", "Baby Lotion", "Rattle", "Baby Blanket", "Bibs"],
  TOY: ["Action Figure", "Puzzle", "Board Game", "Building Blocks", "Remote Car", "Doll", "Plush Toy", "Yo-Yo", "Rubik's Cube"],
  STAMP: ["Self-Inking Stamp", "Rubber Stamp", "Date Stamp", "Pocket Stamp", "Seal Stamp", "Number Stamp", "Wax Seal", "Custom Stamp"],
  BOARD: ["Whiteboard", "Notice Board", "Chalkboard", "LED Sign Board", "Name Board", "Canvas Board", "Menu Board", "Direction Board"],
  OTHER: ["Gift Card", "Mystery Box", "Assorted Pack", "Cleaning Kit", "Tool Kit", "Storage Box", "Party Supplies", "Gift Wrap"]
};

const indianFirstNames = ["Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Ananya", "Diya", "Saanvi", "Priya", "Neha", "Riya", "Aadhya", "Kavya", "Sneha", "Pooja", "Rahul", "Rohit", "Vikram", "Suresh", "Ramesh", "Kiran", "Amit", "Sumit"];
const indianLastNames = ["Sharma", "Patel", "Singh", "Kumar", "Das", "Kaur", "Gupta", "Reddy", "Nair", "Jain", "Menon", "Bose", "Chauhan", "Iyer", "Rao", "Pillai", "Verma", "Yadav", "Pandey"];
const indianCities = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam"];
const indianStates = ["Karnataka", "Maharashtra", "Delhi", "Telangana", "Tamil Nadu", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Andhra Pradesh"];

const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + rand(1000, 9999);

async function main() {
  console.log("🚀 Starting vast database seed...");
  const startTime = Date.now();

  // ── 1. GENERATE CATEGORIES ──────────────────────────────────────────
  console.log("📦 Generating Categories...");
  const kinds = Object.values(ProductKind);
  const categoriesMap = new Map<string, string>(); // slug -> id
  const categoryObjs: any[] = [];

  for (const kind of kinds) {
    // Parent category
    const parentSlug = generateSlug(`${kind} Core`);
    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {},
      create: {
        slug: parentSlug,
        name: `${kind} Core`,
        description: `All ${kind} products`,
        imageUrl: `https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80`,
        kind: kind,
      }
    });
    categoriesMap.set(parentSlug, parent.id);
    categoryObjs.push(parent);

    // Subcategories
    for (let i = 0; i < 3; i++) {
      const subSlug = generateSlug(`${kind} Sub ${i}`);
      const sub = await prisma.category.upsert({
        where: { slug: subSlug },
        update: {},
        create: {
          slug: subSlug,
          name: `${kind} Essentials ${i + 1}`,
          description: `Premium selection of ${kind} items`,
          imageUrl: `https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80`,
          kind: kind,
          parentId: parent.id
        }
      });
      categoriesMap.set(subSlug, sub.id);
      categoryObjs.push(sub);
    }
  }
  console.log(`✅ ${categoryObjs.length} Categories created.`);


  // ── 2. GENERATE PRODUCTS AND VARIANTS ───────────────────────────────
  console.log("🛍️ Generating 500+ Products and Variants...");
  const productsList: any[] = [];
  const allVariants: any[] = [];

  // Create 25 products per kind
  for (const kind of kinds) {
    const names = kindToNames[kind] || kindToNames["OTHER"];
    const subCategories = categoryObjs.filter(c => c.kind === kind && c.parentId !== null);

    for (let i = 0; i < 25; i++) {
      const adjective = pick(adjectives);
      const baseName = pick(names);
      const material = pick(materials);
      const name = `${adjective} ${baseName}`;
      const slug = generateSlug(name);
      const basePrice = rand(100, 10000) * 100; // 100 to 10000 INR in paisa
      const category = pick(subCategories) || categoryObjs.find(c => c.kind === kind);

      productsList.push({
        slug,
        name,
        description: `This ${adjective.toLowerCase()} ${baseName.toLowerCase()} is crafted from high-quality ${material.toLowerCase()}. Perfect for everyday use, offering great durability and style.`,
        kind,
        categoryId: category!.id,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", // generic product image
        gallery: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
        ],
        basePrice,
        currency: "INR",
        stock: rand(10, 500),
        isActive: Math.random() > 0.05,
        isFeatured: Math.random() > 0.8,
        tags: [adjective.toLowerCase(), baseName.toLowerCase().replace(" ", ""), kind.toLowerCase()],
        highlights: [
          `Made of premium ${material.toLowerCase()}`,
          `Available in multiple colors`,
          `High durability`,
          `Eco-friendly packaging`
        ],
        specifications: {
          "Material": material,
          "Weight": `${rand(100, 2000)}g`,
          "Brand": "RanchiKart Basics"
        },
        rating: +(Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        reviewCount: rand(0, 500),
        replacementDays: pick([0, 7, 10, 30]),
        returnEligible: Math.random() > 0.5,
        dispatchDays: rand(1, 5),
        options: { colors: pickMultiple(colors, 3), size: ["Small", "Medium", "Large"] }
      });
    }
  }

  // Insert products in batches
  const productIds = new Map<string, string>(); // slug -> id
  for (let i = 0; i < productsList.length; i += 100) {
    const batch = productsList.slice(i, i + 100);
    await prisma.product.createMany({ data: batch, skipDuplicates: true });

    // fetch back to get IDs
    const slugs = batch.map(p => p.slug);
    const created = await prisma.product.findMany({ where: { slug: { in: slugs } } });
    for (const p of created) {
      productIds.set(p.slug, p.id);

      // Generate variants for each created product
      const numVariants = rand(1, 4);
      for (let v = 0; v < numVariants; v++) {
        const color = pick(colors);
        const size = pick(["Small", "Medium", "Large"]);
        allVariants.push({
          productId: p.id,
          name: `${p.name} - ${color} / ${size}`,
          sku: `SKU-${p.slug.toUpperCase().substring(0, 8)}-${color.substring(0, 3).toUpperCase()}-${size.charAt(0)}-${rand(100, 999)}`,
          priceDelta: rand(0, 50) * 1000,
          attributes: { color, size },
          stock: rand(0, 100)
        });
      }
    }
  }

  // Insert variants
  for (let i = 0; i < allVariants.length; i += 500) {
    await prisma.productVariant.createMany({
      data: allVariants.slice(i, i + 500),
      skipDuplicates: true
    });
  }
  console.log(`✅ ${productsList.length} Products and ${allVariants.length} Variants created.`);


  // ── 3. GENERATE USERS AND SAVED ADDRESSES ─────────────────────────
  console.log("👥 Generating 300 Users and Addresses...");
  const usersList: any[] = [];
  const defaultPasswordHash = await bcrypt.hash("User@RanchiKart#2025", 10);

  // Specific users for testing
  usersList.push({ email: "admin@ranchikart.in", name: "Arjun Sharma", role: "ADMIN", isEmailVerified: true, passwordHash: await bcrypt.hash("Admin@RanchiKart#2025", 10), coins: 1000 });
  usersList.push({ email: "manager@ranchikart.in", name: "Priya Menon", role: "MANAGER", isEmailVerified: true, passwordHash: await bcrypt.hash("Manager@RanchiKart#2025", 10) });
  usersList.push({ email: "user@ranchikart.in", name: "Rahul Kumar", role: "USER", isEmailVerified: true, passwordHash: defaultPasswordHash, coins: 500 });

  for (let i = 0; i < 297; i++) {
    const first = pick(indianFirstNames);
    const last = pick(indianLastNames);
    usersList.push({
      email: `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 999)}@example.com`,
      name: `${first} ${last}`,
      role: "USER",
      gender: pick(["Male", "Female", "Other"]),
      phone: `+919${rand(100000000, 999999999)}`,
      isEmailVerified: Math.random() > 0.2,
      coins: rand(0, 2000),
      passwordHash: defaultPasswordHash,
      createdAt: randDate(new Date(2024, 0, 1), new Date())
    });
  }

  await prisma.user.createMany({ data: usersList, skipDuplicates: true });
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true, phone: true } });

  // Addresses
  const addressList: any[] = [];
  for (const u of allUsers) {
    const numAddr = rand(1, 3);
    for (let i = 0; i < numAddr; i++) {
      addressList.push({
        userId: u.id,
        label: i === 0 ? "Home" : pick(["Office", "Other"]),
        fullName: u.name || "Customer",
        phone: u.phone || "+919999999999",
        line1: `Flat ${rand(1, 100)}, Building ${pick(["A", "B", "C", "Tower"])}`,
        line2: `${pick(["MG Road", "Station Road", "Main Street", "Ring Road"])}`,
        city: pick(indianCities),
        state: pick(indianStates),
        pincode: `${rand(110000, 899999)}`,
        isDefault: i === 0
      });
    }
  }
  for (let i = 0; i < addressList.length; i += 500) {
    await prisma.savedAddress.createMany({ data: addressList.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`✅ ${allUsers.length} Users and ${addressList.length} Addresses created.`);


  // ── 4. GENERATE COUPONS ───────────────────────────────────────────
  console.log("🎟️ Generating Coupons...");
  const couponsData = [
    { code: "WELCOME10", description: "10% off on your first order", type: "PERCENT", value: 10, minOrderAmount: 50000, maxUses: 10000 },
    { code: "SAVE200", description: "Flat ₹200 off on orders above ₹999", type: "FIXED", value: 20000, minOrderAmount: 99900, maxUses: 5000 },
    { code: "FESTIVE50", description: "Flat ₹500 off", type: "FIXED", value: 50000, minOrderAmount: 200000, maxUses: 1000 },
    { code: "FREESHIP", description: "Free shipping value equivalent", type: "FIXED", value: 5000, minOrderAmount: 30000, maxUses: 2000 },
  ];
  for (let i = 0; i < 20; i++) {
    couponsData.push({
      code: `PROMO${rand(10, 99)}`,
      description: `Random promo ${rand(5, 25)}% off`,
      type: "PERCENT",
      value: rand(5, 25),
      minOrderAmount: rand(100, 1000) * 100,
      maxUses: rand(50, 500)
    });
  }
  await prisma.coupon.createMany({ data: couponsData, skipDuplicates: true });
  const allCoupons = await prisma.coupon.findMany();
  console.log(`✅ ${allCoupons.length} Coupons created.`);


  // ── 5. GENERATE ORDERS, PAYMENTS, ORDER ITEMS ─────────────────────
  console.log("🛒 Generating 1000+ Orders...");
  const allProductDocs = await prisma.product.findMany({ select: { id: true, basePrice: true, variants: { select: { id: true, priceDelta: true } } } });

  if (allProductDocs.length === 0 || allUsers.length === 0) {
    console.error("Not enough products or users to generate orders.");
    process.exit(1);
  }

  const orderStatuses = Object.values(OrderStatus);
  const paymentMethods = Object.values(PaymentMethod);

  // We will build arrays for mass insertion but since relations are complex, 
  // OrderItems and Payments depend on Order ID which is DB generated if we use createMany.
  // Instead we can generate UUIDs ourselves for Orders and use them!

  const ordersToInsert: any[] = [];
  const orderItemsToInsert: any[] = [];
  const paymentsToInsert: any[] = [];

  for (let i = 0; i < 1500; i++) {
    const orderId = crypto.randomUUID();
    const user = pick(allUsers);
    const numItems = rand(1, 5);
    const status = pick(orderStatuses);
    const method = pick(paymentMethods);
    const createdAt = randDate(new Date(2024, 0, 1), new Date());

    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const prod = pick(allProductDocs);
      const variant = prod.variants.length > 0 ? pick(prod.variants) : null;
      const unitPrice = prod.basePrice + (variant?.priceDelta || 0);
      const quantity = rand(1, 3);
      const total = unitPrice * quantity;
      subtotal += total;

      orderItemsToInsert.push({
        id: crypto.randomUUID(),
        orderId,
        productId: prod.id,
        variantId: variant?.id || null,
        quantity,
        unitPrice,
        total
      });
    }

    const shippingFee = subtotal > 100000 ? 0 : 5000;
    const applyCoupon = Math.random() > 0.7;
    const coupon = applyCoupon ? pick(allCoupons) : null;

    let discountAmount = 0;
    if (coupon && subtotal >= coupon.minOrderAmount) {
      if (coupon.type === "PERCENT") {
        discountAmount = Math.floor(subtotal * (coupon.value / 100));
      } else {
        discountAmount = coupon.value;
      }
    }

    const total = subtotal + shippingFee - discountAmount;

    ordersToInsert.push({
      id: orderId,
      userId: user.id,
      status,
      paymentMethod: method,
      subtotal,
      shippingFee,
      discountAmount,
      total,
      address: {
        fullName: user.name,
        phone: user.phone,
        line1: "Sample Line 1",
        city: "Sample City",
        state: "Sample State",
        pincode: "123456"
      },
      couponId: coupon?.id || null,
      createdAt,
      updatedAt: createdAt
    });

    // Create payment record if order is not pending
    if (status !== "PENDING_PAYMENT" && status !== "CANCELLED") {
      paymentsToInsert.push({
        id: crypto.randomUUID(),
        orderId,
        provider: "RAZORPAY",
        status: status === "REFUNDED" ? "REFUNDED" : "CAPTURED",
        amount: total,
        currency: "INR",
        providerOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        providerPaymentId: `pay_${crypto.randomBytes(8).toString('hex')}`,
        createdAt
      });
    }
  }

  console.log(`Writing ${ordersToInsert.length} Orders...`);
  for (let i = 0; i < ordersToInsert.length; i += 500) {
    await prisma.order.createMany({ data: ordersToInsert.slice(i, i + 500), skipDuplicates: true });
  }

  console.log(`Writing ${orderItemsToInsert.length} OrderItems...`);
  for (let i = 0; i < orderItemsToInsert.length; i += 500) {
    await prisma.orderItem.createMany({ data: orderItemsToInsert.slice(i, i + 500), skipDuplicates: true });
  }

  console.log(`Writing ${paymentsToInsert.length} Payments...`);
  for (let i = 0; i < paymentsToInsert.length; i += 500) {
    await prisma.payment.createMany({ data: paymentsToInsert.slice(i, i + 500), skipDuplicates: true });
  }


  // ── 6. GENERATE REVIEWS AND WISHLISTS ─────────────────────────────
  console.log("⭐ Generating Reviews and Wishlists...");
  const reviewsToInsert: any[] = [];
  const wishlistToInsert: any[] = [];
  const reviewTitles = ["Great product", "Worth the money", "Average quality", "Loved it!", "Not bad", "Highly recommended", "Disappointed"];
  const reviewBodies = [
    "I have been using this for a while and it works perfectly. No complaints.",
    "The quality could be better but for this price it's acceptable.",
    "Absolutely amazing! Matches the description completely and fast delivery.",
    "Will definitely buy again. Best purchase this month.",
    "It broke after 2 uses, very sad.",
    "Good, does the job. Might consider upgrading later."
  ];

  const userProductPairs = new Set<string>();

  for (let i = 0; i < 2000; i++) {
    const user = pick(allUsers);
    const prod = pick(allProductDocs);
    const key = `${user.id}_${prod.id}`;
    if (!userProductPairs.has(key)) {
      userProductPairs.add(key);
      const rating = rand(1, 5);
      reviewsToInsert.push({
        id: crypto.randomUUID(),
        productId: prod.id,
        userId: user.id,
        rating,
        title: pick(reviewTitles),
        body: pick(reviewBodies),
        isVerified: Math.random() > 0.3,
        helpfulCount: rand(0, 50),
        createdAt: randDate(new Date(2024, 0, 1), new Date())
      });

      // Random wishlist additions
      if (Math.random() > 0.8) {
        wishlistToInsert.push({
          id: crypto.randomUUID(),
          userId: user.id,
          productId: prod.id
        });
      }
    }
  }

  for (let i = 0; i < reviewsToInsert.length; i += 500) {
    await prisma.review.createMany({ data: reviewsToInsert.slice(i, i + 500), skipDuplicates: true });
  }
  for (let i = 0; i < wishlistToInsert.length; i += 500) {
    await prisma.wishlist.createMany({ data: wishlistToInsert.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`✅ ${reviewsToInsert.length} Reviews and ${wishlistToInsert.length} Wishlist items created.`);

  console.log("\n🎉 Vast Seed Complete! Total time:", ((Date.now() - startTime) / 1000).toFixed(2), "seconds.");
  console.log("─────────────────────────────────────");
  console.log("👤 Admin:   admin@ranchikart.in   / Admin@RanchiKart#2025");
  console.log("👤 Manager: manager@ranchikart.in / Manager@RanchiKart#2025");
  console.log("👤 User:    user@ranchikart.in    / User@RanchiKart#2025");
  console.log("─────────────────────────────────────");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Error during seeding:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
