import "dotenv/config";
import { PrismaClient, ProductKind, PaymentMethod, OrderStatus, type Prisma } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

// Curated Unsplash images — stamp/office/signage/stationery themed
const IMAGES = {
  stamps: {
    // Rubber stamp on paper — actual stamp impression
    selfInking: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=600&q=80",
    // Red wax seal / official stamp
    officeSeal: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&q=80",
    // Date stamp / paid stamp on invoice
    dateStamp: "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=600&q=80",
    // Pocket/handy stamp size
    pocket: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80",
    // Classic rubber stamp on wooden desk
    rubber: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&q=80",
    // Round official seal impression
    round: "https://images.unsplash.com/photo-1625225233840-695456021cde?w=600&q=80"
  },
  stationery: {
    // Organized office files/binders
    files: "https://images.unsplash.com/photo-1603796846097-bee99e4a601f?w=600&q=80",
    // Stack of registers/notebooks
    register: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=600&q=80",
    // Neat office desk with stationery
    desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80",
    // Pen collection in holder
    pens: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80",
    // Open notebook on desk
    notebook: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",
    // Colorful sticky notes
    sticky: "https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&q=80"
  },
  boards: {
    // Illuminated acrylic office name board
    acrylic: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
    // Neon/LED signage board storefront
    led: "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&q=80",
    // Professional office building entrance signage
    official: "https://images.unsplash.com/photo-1524813686514-a57563d77965?w=600&q=80",
    // Emergency exit / safety sign board
    safety: "https://images.unsplash.com/photo-1587459374703-4e1db9b7e9da?w=600&q=80",
    // Chalkboard menu in cafe
    menu: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80",
    // Doctor clinic door/plate sign
    clinic: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&q=80"
  },
  categories: {
    stamps: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80",
    stationery: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
    boards: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
  }
};


type VariantInput = {
  name: string;
  sku: string;
  priceDelta: number;
  attributes: Prisma.InputJsonObject;
};

type ProductInput = {
  slug: string;
  name: string;
  categorySlug: string;
  description: string;
  kind: ProductKind;
  imageUrl: string;
  gallery: string[];
  basePrice: number;
  minWidthMm?: number;
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
  defaultWidthMm?: number;
  defaultHeightMm?: number;
  options: Prisma.InputJsonObject;
  variants: VariantInput[];
  tags: string[];
  highlights: string[];
  specifications: Record<string, string>;
  replacementDays?: number;
  returnEligible?: boolean;
  warrantyText?: string;
  dispatchDays?: number;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
};

async function upsertCategory(
  slug: string,
  name: string,
  description: string,
  kind: ProductKind,
  imageUrl: string,
  parentSlug?: string
) {
  const parent = parentSlug
    ? await prisma.category.findUnique({ where: { slug: parentSlug } })
    : null;
  return prisma.category.upsert({
    where: { slug },
    update: { name, description, kind, parentId: parent?.id ?? null, imageUrl },
    create: { slug, name, description, kind, imageUrl, parentId: parent?.id ?? null }
  });
}

async function upsertProduct(input: ProductInput) {
  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: input.categorySlug }
  });
  const common = {
    name: input.name,
    description: input.description,
    kind: input.kind,
    categoryId: category.id,
    imageUrl: input.imageUrl,
    gallery: input.gallery,
    basePrice: input.basePrice,
    minWidthMm: input.minWidthMm,
    maxWidthMm: input.maxWidthMm,
    minHeightMm: input.minHeightMm,
    maxHeightMm: input.maxHeightMm,
    defaultWidthMm: input.defaultWidthMm,
    defaultHeightMm: input.defaultHeightMm,
    options: input.options,
    tags: input.tags,
    highlights: input.highlights,
    specifications: input.specifications,
    replacementDays: input.replacementDays ?? 7,
    returnEligible: input.returnEligible ?? false,
    warrantyText: input.warrantyText ?? "Manufacturing defects covered as per seller policy.",
    dispatchDays: input.dispatchDays ?? 3,
    rating: input.rating ?? 4.4,
    reviewCount: input.reviewCount ?? 18,
    isFeatured: input.isFeatured ?? false
  };

  const product = await prisma.product.upsert({
    where: { slug: input.slug },
    update: common,
    create: { slug: input.slug, ...common }
  });

  for (const variant of input.variants) {
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {
        name: variant.name,
        priceDelta: variant.priceDelta,
        attributes: variant.attributes,
        productId: product.id
      },
      create: { ...variant, productId: product.id }
    });
  }

  return product;
}

const stampOptions = {
  inkColors: ["Blue", "Black", "Red", "Green", "Violet", "Purple"],
  layouts: ["Single line", "Logo + text", "Address block", "Round seal", "Date + text", "Multi-line"],
  handleTypes: ["Pocket", "Desktop", "Heavy duty", "Wall mount"]
};

const boardOptions = {
  materials: ["Acrylic", "ACP", "Steel", "Wood", "Sunboard", "Vinyl", "PVC"],
  finishes: ["Matte", "Glossy", "Brushed", "Reflective", "Satin"],
  boardTypes: ["Home", "Shop", "Clinic", "Office", "Official", "Warning", "Direction", "Menu"],
  lightModes: ["None", "Warm", "Cool", "RGB", "Backlit"]
};

async function main() {
  console.log("Seeding database...");

  // ── Categories ─────────────────────────────────────────────────────────
  const cats: Array<[string, string, string, ProductKind, string, string?]> = [
    ["stamps", "Stamps", "Rubber, self-inking, date, official, pocket, and seal stamps.", "STAMP", IMAGES.categories.stamps],
    ["self-inking-stamps", "Self-Inking Stamps", "Ready-to-use stamps with inbuilt ink pads.", "STAMP", IMAGES.stamps.selfInking, "stamps"],
    ["rubber-stamps", "Rubber Stamps", "Classic rubber stamps for desks and offices.", "STAMP", IMAGES.stamps.rubber, "stamps"],
    ["date-stamps", "Date Stamps", "Date, paid, received, and office workflow stamps.", "STAMP", IMAGES.stamps.dateStamp, "stamps"],
    ["official-seals", "Official Seals", "Institution, trust, society, and company round seals.", "STAMP", IMAGES.stamps.officeSeal, "stamps"],
    ["pocket-stamps", "Pocket Stamps", "Portable stamps for field and counter use.", "STAMP", IMAGES.stamps.pocket, "stamps"],
    ["stationery", "Stationery", "Office stationery, school supplies, files, paper, and desk essentials.", "STATIONERY", IMAGES.categories.stationery],
    ["files-folders", "Files & Folders", "Record files, certificate folders, and document organisers.", "STATIONERY", IMAGES.stationery.files, "stationery"],
    ["paper-registers", "Paper & Registers", "Registers, receipt books, copier paper, and notebooks.", "STATIONERY", IMAGES.stationery.register, "stationery"],
    ["desk-essentials", "Desk Essentials", "Pens, markers, staplers, tapes, and daily office supplies.", "STATIONERY", IMAGES.stationery.desk, "stationery"],
    ["boards", "Boards", "Official boards, name boards, glow boards, and custom display boards.", "BOARD", IMAGES.categories.boards],
    ["official-boards", "Official Boards", "Government, office, compliance, and notice boards.", "BOARD", IMAGES.boards.official, "boards"],
    ["name-boards", "Name Boards", "Personalized home, clinic, shop, and office name boards.", "BOARD", IMAGES.boards.acrylic, "boards"],
    ["light-boards", "Light Boards", "LED, acrylic, backlit, and glow signage boards.", "BOARD", IMAGES.boards.led, "boards"],
    ["safety-boards", "Safety Boards", "Warning, direction, fire safety, and floor instruction boards.", "BOARD", IMAGES.boards.safety, "boards"],
    ["menu-rate-boards", "Menu & Rate Boards", "Restaurant menu boards, rate lists, and counter displays.", "BOARD", IMAGES.boards.menu, "boards"]
  ];

  for (const cat of cats) await upsertCategory(...cat);
  console.log("Categories seeded");

  // ── Products ──────────────────────────────────────────────────────────
  const products: ProductInput[] = [
    // STAMPS
    {
      slug: "self-inking-address-stamp",
      name: "Self-Inking Address Stamp",
      categorySlug: "self-inking-stamps",
      description: "Compact self-inking stamp for addresses, billing desks, and office counters. Features an inbuilt replaceable ink pad for thousands of clean impressions without re-inking.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.selfInking,
      gallery: [IMAGES.stamps.selfInking, IMAGES.stamps.rubber, IMAGES.stamps.dateStamp],
      basePrice: 34900,
      minWidthMm: 20, maxWidthMm: 90, minHeightMm: 10, maxHeightMm: 55,
      defaultWidthMm: 50, defaultHeightMm: 20,
      options: stampOptions,
      variants: [
        { name: "Small (20–40mm)", sku: "STAMP-SI-ADDRESS-S", priceDelta: 0, attributes: { size: "small", maxImpressions: 5000 } },
        { name: "Large (40–70mm)", sku: "STAMP-SI-ADDRESS-L", priceDelta: 18000, attributes: { size: "large", maxImpressions: 7000 } },
        { name: "Heavy Duty (70–90mm)", sku: "STAMP-SI-ADDRESS-HD", priceDelta: 39000, attributes: { size: "heavy-duty", maxImpressions: 10000 } }
      ],
      tags: ["self inking", "address stamp", "office stamp", "custom stamp", "rubber stamp"],
      highlights: ["Built-in replaceable ink pad — 5,000+ impressions", "Custom text and logo support", "Sharp, clean impression for daily office use", "Eco-friendly water-based ink"],
      specifications: { Body: "ABS plastic", "Ink Type": "Water-based stamp ink", "Ideal For": "Address and counter stamping", Impressions: "5,000–10,000 per pad" },
      replacementDays: 7, dispatchDays: 2, rating: 4.6, reviewCount: 84, isFeatured: true
    },
    {
      slug: "round-official-seal-stamp",
      name: "Round Official Seal Stamp",
      categorySlug: "official-seals",
      description: "Round official seal stamp for institutions, societies, firms, trust organizations, and company documents. Comes with digital proof before production.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.officeSeal,
      gallery: [IMAGES.stamps.officeSeal, IMAGES.stamps.round, IMAGES.stamps.selfInking],
      basePrice: 49900,
      minWidthMm: 25, maxWidthMm: 70, minHeightMm: 25, maxHeightMm: 70,
      defaultWidthMm: 40, defaultHeightMm: 40,
      options: stampOptions,
      variants: [
        { name: "40mm Round Seal", sku: "STAMP-SEAL-40", priceDelta: 0, attributes: { diameter: "40mm", type: "self-inking" } },
        { name: "55mm Round Seal", sku: "STAMP-SEAL-55", priceDelta: 22000, attributes: { diameter: "55mm", type: "self-inking" } },
        { name: "70mm Round Seal (Heavy Duty)", sku: "STAMP-SEAL-70", priceDelta: 45000, attributes: { diameter: "70mm", type: "heavy-duty" } }
      ],
      tags: ["official seal", "round seal", "trust seal", "company seal", "society stamp"],
      highlights: ["Perfect round seal layout", "Logo or emblem placement in centre", "Digital proof approval before production", "Suitable for institutions and firms"],
      specifications: { Shape: "Round", Proof: "Digital approval required", Use: "Official documents, certificates", Body: "Metal + ABS" },
      replacementDays: 7, dispatchDays: 3, rating: 4.7, reviewCount: 122, isFeatured: true
    },
    {
      slug: "paid-received-date-stamp",
      name: "Paid / Received Date Stamp",
      categorySlug: "date-stamps",
      description: "Professional date stamp for invoices, inward registers, and accounting workflow. Adjustable date band with custom word options.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.dateStamp,
      gallery: [IMAGES.stamps.dateStamp, IMAGES.stamps.selfInking, IMAGES.stamps.rubber],
      basePrice: 62900,
      minWidthMm: 35, maxWidthMm: 80, minHeightMm: 18, maxHeightMm: 45,
      defaultWidthMm: 55, defaultHeightMm: 28,
      options: { ...stampOptions, layouts: ["PAID + date", "RECEIVED + date", "APPROVED + date", "CUSTOM + date"] },
      variants: [
        { name: "PAID Stamp", sku: "STAMP-DATE-PAID", priceDelta: 0, attributes: { text: "PAID", color: "blue" } },
        { name: "RECEIVED Stamp", sku: "STAMP-DATE-RECEIVED", priceDelta: 0, attributes: { text: "RECEIVED", color: "black" } },
        { name: "APPROVED Stamp", sku: "STAMP-DATE-APPROVED", priceDelta: 5000, attributes: { text: "APPROVED", color: "green" } },
        { name: "Custom Word Stamp", sku: "STAMP-DATE-CUSTOM", priceDelta: 15000, attributes: { text: "custom" } }
      ],
      tags: ["date stamp", "paid stamp", "received stamp", "accounts stamp", "office workflow"],
      highlights: ["Adjustable date band — set any date", "Accounting desk friendly design", "Custom word option available", "Available in Blue, Black, Green ink"],
      specifications: { "Date Band": "Manual adjustable", "Ink Colors": "Blue, Black, Green", Use: "Invoices, registers, accounting", Impressions: "8,000+ per pad" },
      replacementDays: 7, dispatchDays: 2, rating: 4.5, reviewCount: 67
    },
    {
      slug: "pocket-signature-stamp",
      name: "Pocket Signature Stamp",
      categorySlug: "pocket-stamps",
      description: "Ultra-portable stamp for field officers, delivery executives, approval workflows, and site visits. Travel-safe casing keeps it compact and clean.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.pocket,
      gallery: [IMAGES.stamps.pocket, IMAGES.stamps.selfInking, IMAGES.stamps.rubber],
      basePrice: 42900,
      minWidthMm: 20, maxWidthMm: 60, minHeightMm: 8, maxHeightMm: 30,
      defaultWidthMm: 45, defaultHeightMm: 15,
      options: stampOptions,
      variants: [
        { name: "Mini Pocket (up to 45mm)", sku: "STAMP-POCKET-MINI", priceDelta: 0, attributes: { size: "mini", carry: "pocket" } },
        { name: "Wide Pocket (45–60mm)", sku: "STAMP-POCKET-WIDE", priceDelta: 12000, attributes: { size: "wide", carry: "pocket" } }
      ],
      tags: ["signature stamp", "pocket stamp", "portable stamp", "field stamp", "delivery stamp"],
      highlights: ["Travel-safe clicking closure", "Pre-inked — no separate pad needed", "Supports signature and short text", "Used by delivery teams and field officers"],
      specifications: { Body: "Compact pocket case", "Ink Type": "Pre-inked pad", Use: "Outdoor, counter, field work", "Carry Format": "Pocket / bag" },
      replacementDays: 7, dispatchDays: 2, rating: 4.4, reviewCount: 39
    },
    {
      slug: "classic-rubber-stamp-custom",
      name: "Classic Custom Rubber Stamp",
      categorySlug: "rubber-stamps",
      description: "Traditional rubber stamp with wooden handle for all-purpose office use. Customizable with any text, logo, or design. Separate ink pad included.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.rubber,
      gallery: [IMAGES.stamps.rubber, IMAGES.stamps.selfInking, IMAGES.stamps.dateStamp],
      basePrice: 24900,
      minWidthMm: 20, maxWidthMm: 100, minHeightMm: 10, maxHeightMm: 60,
      defaultWidthMm: 50, defaultHeightMm: 25,
      options: stampOptions,
      variants: [
        { name: "Small (up to 40mm)", sku: "STAMP-RUBBER-S", priceDelta: 0, attributes: { handle: "wooden", inkPad: "included" } },
        { name: "Medium (40–70mm)", sku: "STAMP-RUBBER-M", priceDelta: 10000, attributes: { handle: "wooden", inkPad: "included" } },
        { name: "Large (70–100mm)", sku: "STAMP-RUBBER-L", priceDelta: 22000, attributes: { handle: "wooden", inkPad: "included" } }
      ],
      tags: ["rubber stamp", "wooden stamp", "classic stamp", "custom rubber stamp"],
      highlights: ["Traditional wooden handle design", "Separate ink pad included", "Any custom text or logo", "Suitable for all inks"],
      specifications: { Handle: "Wooden", Rubber: "Eco-friendly polymer", "Ink Pad": "Included (replaceable)", Use: "General office stamping" },
      replacementDays: 7, dispatchDays: 2, rating: 4.3, reviewCount: 58
    },
    // STATIONERY
    {
      slug: "premium-office-file-pack",
      name: "Premium Office File Pack",
      categorySlug: "files-folders",
      description: "Heavy-duty office-grade files for invoices, certificates, HR records, and daily document storage. Board file construction for long-term durability.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.files,
      gallery: [IMAGES.stationery.files, IMAGES.stationery.register, IMAGES.stationery.desk],
      basePrice: 19900,
      options: { colors: ["Blue", "Green", "Black", "Red", "Yellow"], packSizes: ["5", "10", "25", "50"] },
      variants: [
        { name: "Pack of 5", sku: "STAT-FILE-5", priceDelta: 0, attributes: { packSize: 5, color: "assorted" } },
        { name: "Pack of 10", sku: "STAT-FILE-10", priceDelta: 29000, attributes: { packSize: 10, color: "assorted" } },
        { name: "Pack of 25", sku: "STAT-FILE-25", priceDelta: 72000, attributes: { packSize: 25, color: "assorted" } },
        { name: "Pack of 50", sku: "STAT-FILE-50", priceDelta: 138000, attributes: { packSize: 50, color: "assorted" } }
      ],
      tags: ["office files", "document files", "file folders", "office stationery", "bulk files"],
      highlights: ["Thick board file construction", "Assorted colors or single color", "Legal / A4 compatible", "Bulk pack pricing for offices"],
      specifications: { Size: "Legal / A4 compatible", Material: "Board file (300 GSM)", Use: "Document storage", "Color Options": "Blue, Green, Black, Red" },
      replacementDays: 3, returnEligible: false, dispatchDays: 1, rating: 4.3, reviewCount: 45
    },
    {
      slug: "office-register-bundle",
      name: "Office Register Bundle",
      categorySlug: "paper-registers",
      description: "Complete register bundle for attendance, inward, outward, stock, and accounts management in office environments.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.register,
      gallery: [IMAGES.stationery.register, IMAGES.stationery.files, IMAGES.stationery.notebook],
      basePrice: 54900,
      options: { ruling: ["Plain", "Single line", "Ledger", "Attendance", "Stock"], packSizes: ["4", "8", "12"] },
      variants: [
        { name: "4 Registers Set", sku: "STAT-REG-4", priceDelta: 0, attributes: { count: 4, pages: 160 } },
        { name: "8 Registers Set", sku: "STAT-REG-8", priceDelta: 49000, attributes: { count: 8, pages: 160 } },
        { name: "12 Registers Set", sku: "STAT-REG-12", priceDelta: 99000, attributes: { count: 12, pages: 160 } }
      ],
      tags: ["office register", "attendance register", "stock register", "accounts register"],
      highlights: ["Hard-bound register set", "Multiple format types (attendance, stock, accounts)", "160 pages each on 70 GSM paper", "Ideal for new office setup"],
      specifications: { Pages: "160 pages each", Binding: "Hard bound", Paper: "70 GSM ruled paper", Format: "Multiple ruling options" },
      replacementDays: 3, dispatchDays: 1, rating: 4.4, reviewCount: 31, isFeatured: true
    },
    {
      slug: "desk-starter-kit",
      name: "Premium Desk Starter Kit",
      categorySlug: "desk-essentials",
      description: "All-in-one desk kit with pens, markers, stapler, tape, clips, sticky notes, scissors, and more. Perfect for new office setups.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.desk,
      gallery: [IMAGES.stationery.desk, IMAGES.stationery.pens, IMAGES.stationery.sticky],
      basePrice: 79900,
      options: { kitTypes: ["Basic", "Accounts", "Front Desk", "Executive"], colors: ["Mixed", "Blue", "Black"] },
      variants: [
        { name: "Basic Kit (12 items)", sku: "STAT-DESK-BASIC", priceDelta: 0, attributes: { items: 12, kit: "basic" } },
        { name: "Front Desk Kit (18 items)", sku: "STAT-DESK-FRONT", priceDelta: 26000, attributes: { items: 18, kit: "front-desk" } },
        { name: "Executive Kit (24 items)", sku: "STAT-DESK-EXEC", priceDelta: 55000, attributes: { items: 24, kit: "executive" } }
      ],
      tags: ["desk kit", "office starter kit", "stationery bundle", "office essentials"],
      highlights: ["12–24 daily desk essentials included", "Ready for new office or branch setup", "Packed in branded gift box", "Bulk order pricing available"],
      specifications: { Items: "12–24 essentials", Packaging: "Branded box pack", Contents: "Pens, stapler, tape, clips, sticky notes", Use: "Office desk setup" },
      replacementDays: 3, dispatchDays: 1, rating: 4.5, reviewCount: 72, isFeatured: true
    },
    {
      slug: "premium-ball-pen-pack",
      name: "Premium Ball Pen Office Pack",
      categorySlug: "desk-essentials",
      description: "Smooth-writing ball pens for daily office use. Available in bulk packs with multiple ink color options.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.pens,
      gallery: [IMAGES.stationery.pens, IMAGES.stationery.desk, IMAGES.stationery.sticky],
      basePrice: 14900,
      options: { colors: ["Blue", "Black", "Red", "Green"], packSizes: ["10", "20", "50", "100"] },
      variants: [
        { name: "Pack of 10", sku: "STAT-PEN-10", priceDelta: 0, attributes: { count: 10, color: "assorted" } },
        { name: "Pack of 20", sku: "STAT-PEN-20", priceDelta: 22000, attributes: { count: 20, color: "assorted" } },
        { name: "Pack of 50", sku: "STAT-PEN-50", priceDelta: 48000, attributes: { count: 50, color: "assorted" } },
        { name: "Pack of 100", sku: "STAT-PEN-100", priceDelta: 88000, attributes: { count: 100, color: "assorted" } }
      ],
      tags: ["ball pen", "office pen", "writing pen", "bulk pen", "stationery"],
      highlights: ["Smooth low-viscosity ink", "Comfortable grip design", "Available in 4 ink colors", "Bulk corporate packs"],
      specifications: { "Ink Type": "Oil-based ball point", Colors: "Blue, Black, Red, Green", "Tip Size": "0.7mm", Use: "Daily office writing" },
      replacementDays: 3, dispatchDays: 1, rating: 4.2, reviewCount: 108
    },
    // BOARDS
    {
      slug: "custom-acrylic-name-board",
      name: "Custom Acrylic Name Board",
      categorySlug: "name-boards",
      description: "Personalized premium acrylic board for home, clinic, shop, or office entrance. Available in 3mm and 5mm thickness with digital proof before production.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.acrylic,
      gallery: [IMAGES.boards.acrylic, IMAGES.boards.led, IMAGES.boards.clinic],
      basePrice: 89900,
      minWidthMm: 200, maxWidthMm: 1800, minHeightMm: 100, maxHeightMm: 900,
      defaultWidthMm: 600, defaultHeightMm: 300,
      options: boardOptions,
      variants: [
        { name: "Acrylic 3mm", sku: "BOARD-NAME-ACRYLIC-3", priceDelta: 0, attributes: { material: "Acrylic", thickness: "3mm", finish: "Glossy" } },
        { name: "Acrylic 5mm (Premium)", sku: "BOARD-NAME-ACRYLIC-5", priceDelta: 45000, attributes: { material: "Acrylic", thickness: "5mm", finish: "Glossy" } },
        { name: "Steel Letters on Acrylic", sku: "BOARD-NAME-STEEL", priceDelta: 95000, attributes: { material: "Steel+Acrylic", style: "3D letters" } }
      ],
      tags: ["name board", "acrylic board", "custom board", "clinic board", "shop name board"],
      highlights: ["UV-printed custom design", "Indoor and outdoor variants available", "Digital proof approval before manufacturing", "Size-based transparent pricing"],
      specifications: { Material: "Acrylic / Steel", Mounting: "Wall screws or double-sided tape", Proof: "Digital artwork approval provided", Thickness: "3mm or 5mm" },
      replacementDays: 7, dispatchDays: 4, rating: 4.8, reviewCount: 137, isFeatured: true
    },
    {
      slug: "led-light-shop-board",
      name: "LED Backlit Shop Sign Board",
      categorySlug: "light-boards",
      description: "Premium LED backlit sign board for storefronts, counters, and indoor/outdoor branding. Waterproof outdoor option available.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.led,
      gallery: [IMAGES.boards.led, IMAGES.boards.acrylic, IMAGES.boards.official],
      basePrice: 249900,
      minWidthMm: 300, maxWidthMm: 3000, minHeightMm: 150, maxHeightMm: 1200,
      defaultWidthMm: 900, defaultHeightMm: 450,
      options: boardOptions,
      variants: [
        { name: "Indoor LED Board", sku: "BOARD-LED-IN", priceDelta: 0, attributes: { placement: "Indoor", waterproof: false } },
        { name: "Outdoor Waterproof LED", sku: "BOARD-LED-OUT", priceDelta: 110000, attributes: { placement: "Outdoor", waterproof: true } },
        { name: "RGB Premium LED Board", sku: "BOARD-LED-RGB", priceDelta: 175000, attributes: { light: "RGB", placement: "Both" } }
      ],
      tags: ["LED board", "light board", "shop board", "glow sign", "backlit board", "shop sign"],
      highlights: ["Bright energy-efficient LED modules", "Outdoor IP65 waterproof option", "RGB color-change option available", "Custom size and full-color artwork"],
      specifications: { Lighting: "LED modules", Power: "Adapter included", Installation: "Wall mounted", Waterproof: "IP65 (outdoor model)" },
      replacementDays: 7, warrantyText: "6 months electrical warranty on LED modules and adapter.", dispatchDays: 6, rating: 4.7, reviewCount: 91, isFeatured: true
    },
    {
      slug: "official-office-board",
      name: "Official Office Signage Board",
      categorySlug: "official-boards",
      description: "Professional signage for office departments, government institutions, timings display, and compliance boards.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.official,
      gallery: [IMAGES.boards.official, IMAGES.boards.acrylic, IMAGES.boards.safety],
      basePrice: 69900,
      minWidthMm: 200, maxWidthMm: 1500, minHeightMm: 100, maxHeightMm: 800,
      defaultWidthMm: 450, defaultHeightMm: 300,
      options: boardOptions,
      variants: [
        { name: "Sunboard Print", sku: "BOARD-OFFICIAL-SUN", priceDelta: 0, attributes: { material: "Sunboard", thickness: "5mm" } },
        { name: "ACP Board", sku: "BOARD-OFFICIAL-ACP", priceDelta: 38000, attributes: { material: "ACP", thickness: "2mm" } },
        { name: "Reflective Finish", sku: "BOARD-OFFICIAL-REF", priceDelta: 65000, attributes: { finish: "Reflective", material: "ACP" } }
      ],
      tags: ["official board", "office board", "department board", "government board", "notice board"],
      highlights: ["Formal institutional layout", "Government and corporate office compatible", "Weather-resistant material choices", "UV-fade resistant print"],
      specifications: { Material: "Sunboard / ACP", Print: "UV or vinyl print", Use: "Office, dept, institution signage", Durability: "5+ years outdoor" },
      replacementDays: 7, dispatchDays: 3, rating: 4.5, reviewCount: 54
    },
    {
      slug: "fire-safety-direction-board",
      name: "Fire Safety & Direction Board",
      categorySlug: "safety-boards",
      description: "High-visibility safety boards for fire exits, extinguisher locations, warning signs, and directional guidance in buildings.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.safety,
      gallery: [IMAGES.boards.safety, IMAGES.boards.official, IMAGES.boards.acrylic],
      basePrice: 39900,
      minWidthMm: 150, maxWidthMm: 1200, minHeightMm: 100, maxHeightMm: 700,
      defaultWidthMm: 300, defaultHeightMm: 200,
      options: boardOptions,
      variants: [
        { name: "Fire Exit Sign", sku: "BOARD-SAFETY-EXIT", priceDelta: 0, attributes: { sign: "fire-exit", color: "green" } },
        { name: "Fire Extinguisher Sign", sku: "BOARD-SAFETY-FIRE", priceDelta: 0, attributes: { sign: "extinguisher", color: "red" } },
        { name: "Reflective Safety Board", sku: "BOARD-SAFETY-REF", priceDelta: 30000, attributes: { finish: "reflective" } }
      ],
      tags: ["safety board", "fire exit sign", "warning board", "direction board", "safety signage"],
      highlights: ["High-visibility color layouts", "Reflective night-visible option", "IS/ISO standard symbol support", "Suitable for factories, offices, hospitals"],
      specifications: { Material: "ACP / vinyl / sunboard", Finish: "Standard or Grade I reflective", Use: "Safety, fire, direction signage", Standard: "IS 2551 compliant" },
      replacementDays: 7, dispatchDays: 2, rating: 4.6, reviewCount: 43
    },
    {
      slug: "restaurant-menu-rate-board",
      name: "Restaurant Menu & Rate Board",
      categorySlug: "menu-rate-boards",
      description: "Custom menu boards, rate lists, and counter display boards for restaurants, cafes, and food counters. Writable and backlit options available.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.menu,
      gallery: [IMAGES.boards.menu, IMAGES.boards.led, IMAGES.boards.acrylic],
      basePrice: 119900,
      minWidthMm: 300, maxWidthMm: 2400, minHeightMm: 200, maxHeightMm: 1200,
      defaultWidthMm: 900, defaultHeightMm: 600,
      options: boardOptions,
      variants: [
        { name: "Printed Static Menu Board", sku: "BOARD-MENU-PRINT", priceDelta: 0, attributes: { type: "static-print" } },
        { name: "Writable Menu Board", sku: "BOARD-MENU-WRITE", priceDelta: 42000, attributes: { type: "writable", marker: "chalk" } },
        { name: "LED Backlit Menu Board", sku: "BOARD-MENU-LIGHT", priceDelta: 130000, attributes: { type: "backlit-led" } }
      ],
      tags: ["menu board", "rate board", "restaurant board", "cafe menu", "food counter board"],
      highlights: ["Custom menu & rate list layouts", "Writable surface with chalk marker", "Backlit LED option for premium look", "Full-color digital print included"],
      specifications: { Material: "ACP / acrylic", Use: "Restaurant and counter display", Proof: "Artwork approval required", Lighting: "LED backlit (premium variant)" },
      replacementDays: 7, dispatchDays: 5, rating: 4.7, reviewCount: 82, isFeatured: true
    },
    {
      slug: "clinic-doctor-name-board",
      name: "Doctor & Clinic Name Board",
      categorySlug: "name-boards",
      description: "Premium clinic signage for doctors, hospitals, diagnostic centers, and medical practices. Clean professional design with qualification display.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.clinic,
      gallery: [IMAGES.boards.clinic, IMAGES.boards.acrylic, IMAGES.boards.official],
      basePrice: 149900,
      minWidthMm: 300, maxWidthMm: 2000, minHeightMm: 150, maxHeightMm: 800,
      defaultWidthMm: 900, defaultHeightMm: 400,
      options: boardOptions,
      variants: [
        { name: "Acrylic 5mm (Standard)", sku: "BOARD-CLINIC-STD", priceDelta: 0, attributes: { material: "Acrylic", thickness: "5mm" } },
        { name: "Acrylic with LED Border", sku: "BOARD-CLINIC-LED", priceDelta: 75000, attributes: { material: "Acrylic", lighting: "LED-border" } },
        { name: "Stainless Steel Letters", sku: "BOARD-CLINIC-STEEL", priceDelta: 120000, attributes: { material: "SS-letters", style: "3D" } }
      ],
      tags: ["clinic board", "doctor board", "hospital signage", "medical name board"],
      highlights: ["Professional medical-grade design", "Qualification and timing display", "Illuminated border option", "Weather-resistant for outdoor use"],
      specifications: { Material: "Premium acrylic / SS", Use: "Clinics, hospitals, nursing homes", Proof: "Digital approval required", Lighting: "Optional LED border" },
      replacementDays: 7, dispatchDays: 5, rating: 4.9, reviewCount: 64, isFeatured: true
    },
    // ── MORE STAMPS ────────────────────────────────────────────────────────
    {
      slug: "pre-inked-notary-stamp",
      name: "Pre-Inked Notary Stamp",
      categorySlug: "official-seals",
      description: "Professional pre-inked notary stamp with fine detail reproduction. Ideal for advocates, notaries, chartered accountants, and legal professionals.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.round,
      gallery: [IMAGES.stamps.round, IMAGES.stamps.officeSeal, IMAGES.stamps.selfInking],
      basePrice: 74900,
      minWidthMm: 30, maxWidthMm: 65, minHeightMm: 30, maxHeightMm: 65,
      defaultWidthMm: 45, defaultHeightMm: 45,
      options: stampOptions,
      variants: [
        { name: "45mm Notary Seal", sku: "STAMP-NOTARY-45", priceDelta: 0, attributes: { size: "45mm", profession: "notary" } },
        { name: "55mm Notary Seal", sku: "STAMP-NOTARY-55", priceDelta: 18000, attributes: { size: "55mm", profession: "notary" } }
      ],
      tags: ["notary stamp", "legal stamp", "advocate stamp", "CA stamp", "professional seal"],
      highlights: ["Ultra-fine text reproduction", "Pre-inked — 15,000+ impressions", "Digital proof before dispatch", "Suitable for official and court documents"],
      specifications: { Profession: "Notary / Advocate / CA", Impressions: "15,000+ per refill", Shape: "Round or oval", Proof: "Digital approval required" },
      replacementDays: 7, dispatchDays: 3, rating: 4.8, reviewCount: 97
    },
    {
      slug: "bank-name-stamp",
      name: "Bank & Financial Institution Stamp",
      categorySlug: "official-seals",
      description: "Heavy-duty stamps for banks, cooperatives, financial institutions, and NBFCs. Custom branch name, account type, and regulatory text support.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.officeSeal,
      gallery: [IMAGES.stamps.officeSeal, IMAGES.stamps.selfInking, IMAGES.stamps.round],
      basePrice: 54900,
      minWidthMm: 35, maxWidthMm: 80, minHeightMm: 20, maxHeightMm: 60,
      defaultWidthMm: 60, defaultHeightMm: 30,
      options: stampOptions,
      variants: [
        { name: "Rectangular Bank Stamp", sku: "STAMP-BANK-RECT", priceDelta: 0, attributes: { shape: "rectangular", use: "banking" } },
        { name: "Round Bank Seal", sku: "STAMP-BANK-ROUND", priceDelta: 12000, attributes: { shape: "round", use: "banking" } }
      ],
      tags: ["bank stamp", "cooperative stamp", "NBFC stamp", "branch stamp", "financial stamp"],
      highlights: ["Supports bank name + branch + account types", "Sharp impression for document clarity", "Bulk pricing for branches", "Approved by bank compliance teams"],
      specifications: { Use: "Banks, cooperatives, NBFCs", Compliance: "RBI-compliant stamp layouts", Impressions: "10,000+", Body: "Heavy duty ABS" },
      replacementDays: 7, dispatchDays: 2, rating: 4.6, reviewCount: 53
    },
    {
      slug: "multi-line-text-stamp",
      name: "Multi-Line Custom Text Stamp",
      categorySlug: "self-inking-stamps",
      description: "Custom multi-line self-inking stamp. Fit up to 6 lines of text — perfect for delivery signatures, HR documents, hotel check-in, and warehouse returns.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.selfInking,
      gallery: [IMAGES.stamps.selfInking, IMAGES.stamps.rubber, IMAGES.stamps.pocket],
      basePrice: 28900,
      minWidthMm: 25, maxWidthMm: 80, minHeightMm: 15, maxHeightMm: 50,
      defaultWidthMm: 55, defaultHeightMm: 30,
      options: stampOptions,
      variants: [
        { name: "3 Lines (up to 55mm)", sku: "STAMP-MULTI-3L", priceDelta: 0, attributes: { lines: 3 } },
        { name: "4 Lines (up to 65mm)", sku: "STAMP-MULTI-4L", priceDelta: 8000, attributes: { lines: 4 } },
        { name: "6 Lines (up to 80mm)", sku: "STAMP-MULTI-6L", priceDelta: 16000, attributes: { lines: 6 } }
      ],
      tags: ["multi line stamp", "text stamp", "address stamp", "6 line stamp", "custom text"],
      highlights: ["Up to 6 lines of text", "Compact self-inking design", "Blue, black, red, green ink", "Fast 48-hour dispatch"],
      specifications: { Lines: "3–6 text lines", "Ink Type": "Replaceable water-based pad", Use: "Offices, hotels, warehouses, HR", Impressions: "7,000+" },
      replacementDays: 7, dispatchDays: 2, rating: 4.5, reviewCount: 76, isFeatured: true
    },
    {
      slug: "logo-company-stamp",
      name: "Company Logo + Text Stamp",
      categorySlug: "rubber-stamps",
      description: "Premium stamp with your company logo and contact information. Upload your logo artwork — we'll reproduce it with fine clarity on a custom rubber die.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.rubber,
      gallery: [IMAGES.stamps.rubber, IMAGES.stamps.selfInking, IMAGES.stamps.officeSeal],
      basePrice: 45900,
      minWidthMm: 30, maxWidthMm: 100, minHeightMm: 15, maxHeightMm: 60,
      defaultWidthMm: 60, defaultHeightMm: 30,
      options: { ...stampOptions, logoFormats: ["PNG (300 dpi+)", "SVG", "PDF", "AI"] },
      variants: [
        { name: "Small Logo Stamp (≤50mm)", sku: "STAMP-LOGO-S", priceDelta: 0, attributes: { size: "small", handle: "wooden" } },
        { name: "Medium Logo Stamp (≤70mm)", sku: "STAMP-LOGO-M", priceDelta: 14000, attributes: { size: "medium", handle: "wooden" } },
        { name: "Large Logo Stamp (≤100mm)", sku: "STAMP-LOGO-L", priceDelta: 28000, attributes: { size: "large", handle: "heavy-duty" } }
      ],
      tags: ["logo stamp", "company stamp", "brand stamp", "custom logo stamp", "business stamp"],
      highlights: ["Upload your logo for exact reproduction", "300 DPI minimum for clean impression", "Digital proof provided before manufacturing", "Wooden or heavy-duty handle options"],
      specifications: { "Logo Format": "PNG/SVG/PDF/AI", Handle: "Wooden or heavy duty", Proof: "Digital artwork approval", Use: "Company branding, packaging, invoices" },
      replacementDays: 7, dispatchDays: 3, rating: 4.7, reviewCount: 112, isFeatured: true
    },
    {
      slug: "wax-seal-stamp-kit",
      name: "Wax Seal Stamp Kit",
      categorySlug: "official-seals",
      description: "Premium wax seal stamp kit for wedding invitations, certificates, letter embossing, and premium packaging. Custom monogram, logo, or design.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.officeSeal,
      gallery: [IMAGES.stamps.officeSeal, IMAGES.stamps.round, IMAGES.stamps.rubber],
      basePrice: 89900,
      minWidthMm: 20, maxWidthMm: 40, minHeightMm: 20, maxHeightMm: 40,
      defaultWidthMm: 30, defaultHeightMm: 30,
      options: { designs: ["Monogram", "Floral", "Custom logo", "Initial letters", "Crest"] },
      variants: [
        { name: "Wax Seal Stamp Only", sku: "STAMP-WAX-HEAD", priceDelta: 0, attributes: { kit: "stamp-only" } },
        { name: "Stamp + 5 Wax Sticks Kit", sku: "STAMP-WAX-KIT5", priceDelta: 22000, attributes: { kit: "with-wax", sticks: 5 } },
        { name: "Full Kit (Stamp + Heater + 10 Sticks)", sku: "STAMP-WAX-FULL", priceDelta: 55000, attributes: { kit: "full", sticks: 10, heater: true } }
      ],
      tags: ["wax seal", "wax stamp", "wedding stamp", "invitation stamp", "emboss stamp", "monogram stamp"],
      highlights: ["Brass stamp head for crisp wax impression", "Works with glue gun or spoon melting method", "Custom monogram, logo or initials", "Premium gift packaging included"],
      specifications: { Material: "Brass + wooden handle", "Wax Type": "Compatible with any sealing wax", Use: "Wedding, cards, certificates, packaging", "Seal Size": "20–40mm" },
      replacementDays: 7, dispatchDays: 5, rating: 4.9, reviewCount: 148, isFeatured: true
    },
    {
      slug: "received-paid-two-color-stamp",
      name: "Two-Color Paid / Received Stamp",
      categorySlug: "date-stamps",
      description: "Dual-color self-inking stamp — prints your company name in blue and PAID/RECEIVED in red in a single impression. Professional accounts desk stamp.",
      kind: "STAMP",
      imageUrl: IMAGES.stamps.dateStamp,
      gallery: [IMAGES.stamps.dateStamp, IMAGES.stamps.selfInking, IMAGES.stamps.rubber],
      basePrice: 79900,
      minWidthMm: 40, maxWidthMm: 75, minHeightMm: 18, maxHeightMm: 40,
      defaultWidthMm: 58, defaultHeightMm: 25,
      options: { ...stampOptions, colorCombinations: ["Blue + Red", "Black + Red", "Blue + Green"] },
      variants: [
        { name: "2-Color Paid Stamp", sku: "STAMP-2C-PAID", priceDelta: 0, attributes: { word: "PAID", colors: "blue+red" } },
        { name: "2-Color Received Stamp", sku: "STAMP-2C-RECV", priceDelta: 0, attributes: { word: "RECEIVED", colors: "blue+red" } }
      ],
      tags: ["two color stamp", "dual color stamp", "paid stamp", "accounts stamp", "two-tone stamp"],
      highlights: ["Two colors in a single impression", "Company name + status word", "Ideal for accounts, billing, invoices", "Replaceable dual ink pads"],
      specifications: { Colors: "2-color print", "Ink Pads": "Dual replaceable pads", Impressions: "8,000+ per pad", Use: "Accounts, billing, store counters" },
      replacementDays: 7, dispatchDays: 3, rating: 4.6, reviewCount: 41
    },
    // ── MORE STATIONERY ────────────────────────────────────────────────────
    {
      slug: "a4-copier-paper-ream",
      name: "Premium A4 Copier Paper — 75 GSM",
      categorySlug: "paper-registers",
      description: "Premium 75 GSM A4 copier paper for laser, inkjet, and photocopier use. Superior brightness, smooth finish, jam-free performance.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.register,
      gallery: [IMAGES.stationery.register, IMAGES.stationery.files, IMAGES.stationery.desk],
      basePrice: 38900,
      options: { gsm: ["75 GSM", "80 GSM", "90 GSM"], brightness: ["92 ISO", "96 ISO", "98 ISO"] },
      variants: [
        { name: "1 Ream (500 sheets)", sku: "PAPER-A4-1R", priceDelta: 0, attributes: { reams: 1, sheets: 500, gsm: 75 } },
        { name: "5 Reams (2500 sheets)", sku: "PAPER-A4-5R", priceDelta: 175000, attributes: { reams: 5, sheets: 2500, gsm: 75 } },
        { name: "10 Reams (5000 sheets)", sku: "PAPER-A4-10R", priceDelta: 335000, attributes: { reams: 10, sheets: 5000, gsm: 75 } }
      ],
      tags: ["A4 paper", "copier paper", "office paper", "75 GSM", "printer paper", "bulk paper"],
      highlights: ["75 GSM smooth bright white surface", "Compatible with all laser & inkjet printers", "Jam-free certified performance", "Forest-friendly FSC certification"],
      specifications: { Size: "A4 (210 × 297mm)", GSM: "75 / 80 / 90", Brightness: "92–98 ISO", Sheets: "500 per ream" },
      replacementDays: 0, returnEligible: false, dispatchDays: 1, rating: 4.4, reviewCount: 213
    },
    {
      slug: "legal-document-envelope-pack",
      name: "Kraft Legal Document Envelopes",
      categorySlug: "files-folders",
      description: "Brown kraft document envelopes for legal files, tender submissions, account statements, and official correspondence. Available in multiple sizes.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.files,
      gallery: [IMAGES.stationery.files, IMAGES.stationery.register, IMAGES.stationery.desk],
      basePrice: 24900,
      options: { sizes: ["A4 / FS", "A3 / DL", "Long envelope"], styles: ["With string", "Self-seal", "Button-string"] },
      variants: [
        { name: "Pack of 25 (A4/FS)", sku: "ENV-LEGAL-25", priceDelta: 0, attributes: { pack: 25, size: "A4/FS" } },
        { name: "Pack of 50 (A4/FS)", sku: "ENV-LEGAL-50", priceDelta: 22000, attributes: { pack: 50, size: "A4/FS" } },
        { name: "Pack of 100 Mixed Sizes", sku: "ENV-LEGAL-100M", priceDelta: 48000, attributes: { pack: 100, size: "mixed" } }
      ],
      tags: ["document envelope", "legal envelope", "kraft envelope", "office envelope", "filing envelope"],
      highlights: ["100 GSM kraft brown paper", "Button-string or self-seal options", "Multiple sizes for all document types", "Bulk pack savings for offices"],
      specifications: { Material: "Kraft 100 GSM", Sizes: "A4/FS, A3, Long", Closure: "String, self-seal, or button", Use: "Legal, official, commercial documents" },
      replacementDays: 3, returnEligible: false, dispatchDays: 1, rating: 4.2, reviewCount: 89
    },
    {
      slug: "whiteboard-markers-pack",
      name: "Whiteboard Marker Set",
      categorySlug: "desk-essentials",
      description: "High-quality erasable whiteboard markers with low odour ink. Clean dry-erase performance on all whiteboards and glass surfaces.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.pens,
      gallery: [IMAGES.stationery.pens, IMAGES.stationery.desk, IMAGES.stationery.sticky],
      basePrice: 16900,
      options: { colors: ["Black", "Blue", "Red", "Green", "Assorted"], tipSizes: ["Thin", "Medium", "Thick"] },
      variants: [
        { name: "Pack of 6 Assorted", sku: "MARKER-WB-6", priceDelta: 0, attributes: { count: 6, type: "assorted" } },
        { name: "Pack of 12 Assorted", sku: "MARKER-WB-12", priceDelta: 14000, attributes: { count: 12, type: "assorted" } },
        { name: "Pack of 24 (Office Pack)", sku: "MARKER-WB-24", priceDelta: 26000, attributes: { count: 24, type: "office-pack" } }
      ],
      tags: ["whiteboard marker", "dry erase marker", "board marker", "office marker", "class marker"],
      highlights: ["Low-odour erasable ink formula", "Clean erase on any whiteboard", "Chisel tip for fine or broad strokes", "Refillable nib design"],
      specifications: { "Ink Type": "Water-based erasable", Tip: "Chisel tip (medium)", Erase: "Dry erase cloth", Compatible: "Whiteboard, glass, tile" },
      replacementDays: 3, returnEligible: false, dispatchDays: 1, rating: 4.3, reviewCount: 127
    },
    {
      slug: "carbon-copy-receipt-book",
      name: "Carbon Copy Receipt Book",
      categorySlug: "paper-registers",
      description: "Carbonless 2-ply receipt books for retail billing, parking receipts, workshop job cards, and service acknowledgements. Custom printing available.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.register,
      gallery: [IMAGES.stationery.register, IMAGES.stationery.files, IMAGES.stationery.notebook],
      basePrice: 18900,
      options: { formats: ["Plain (blank)", "Numbered 001–50", "Pre-printed header", "Fully custom"], sizes: ["A6 (bill size)", "A5", "A4"] },
      variants: [
        { name: "Book of 50 (A6 bill size)", sku: "RECEIPT-50", priceDelta: 0, attributes: { pages: 50, size: "A6", copies: 2 } },
        { name: "Book of 100 (A5)", sku: "RECEIPT-100", priceDelta: 12000, attributes: { pages: 100, size: "A5", copies: 2 } },
        { name: "Pack of 10 Books (500 sets)", sku: "RECEIPT-500", priceDelta: 155000, attributes: { books: 10, total: 500, copies: 2 } }
      ],
      tags: ["receipt book", "carbon copy", "bill book", "duplicate receipt", "carbonless book"],
      highlights: ["No carbon paper needed — carbonless 2-ply", "Sequential numbering support", "Custom header printing available", "Used by retailers, service providers, hospitals"],
      specifications: { Copies: "2-ply (original + duplicate)", Size: "A6 / A5 / A4", Paper: "Carbonless NCR", Numbering: "Pre-numbered or blank" },
      replacementDays: 3, dispatchDays: 2, rating: 4.4, reviewCount: 74
    },
    {
      slug: "premium-sticky-notes-set",
      name: "Premium Sticky Notes Mega Set",
      categorySlug: "desk-essentials",
      description: "Bright neon and pastel sticky notes for task boards, reminders, and desk organisation. Strong repositionable adhesive stays in place.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.sticky,
      gallery: [IMAGES.stationery.sticky, IMAGES.stationery.desk, IMAGES.stationery.pens],
      basePrice: 12900,
      options: { colors: ["Neon assorted", "Pastel assorted", "Single color", "Mixed pack"], sizes: ["3×3 inch", "4×4 inch", "4×6 inch"] },
      variants: [
        { name: "3×3 Neon Pack (200 sheets)", sku: "STICKY-3X3-200", priceDelta: 0, attributes: { size: "3x3", sheets: 200, style: "neon" } },
        { name: "4×4 Pastel Pack (150 sheets)", sku: "STICKY-4X4-150", priceDelta: 8000, attributes: { size: "4x4", sheets: 150, style: "pastel" } },
        { name: "Mega Desk Set (500 sheets)", sku: "STICKY-MEGA", priceDelta: 19000, attributes: { sheets: 500, style: "mixed", sizes: "multiple" } }
      ],
      tags: ["sticky notes", "post-it notes", "memo pad", "neon notes", "task board", "reminder notes"],
      highlights: ["Strong repositionable adhesive", "Neon and pastel color varieties", "Does not leave residue on surfaces", "Eco-friendly water-based coating"],
      specifications: { Adhesive: "Repositionable acrylic", Colors: "Neon + Pastel", Sizes: "3×3, 4×4, 4×6 inch", Sheets: "150–500 per set" },
      replacementDays: 3, returnEligible: false, dispatchDays: 1, rating: 4.5, reviewCount: 183
    },
    {
      slug: "heavy-duty-stapler-set",
      name: "Heavy-Duty Office Stapler Set",
      categorySlug: "desk-essentials",
      description: "Professional heavy-duty stapler with 1000-staple magazine. Handles up to 40 sheets. Includes staple remover and 3 packs of staples.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.desk,
      gallery: [IMAGES.stationery.desk, IMAGES.stationery.pens, IMAGES.stationery.files],
      basePrice: 32900,
      options: { capacity: ["20 sheets", "40 sheets", "80 sheets"], colors: ["Black", "Metallic grey", "Blue"] },
      variants: [
        { name: "Standard 20-Sheet Stapler", sku: "STAPLER-20", priceDelta: 0, attributes: { sheets: 20, staples: "26/6" } },
        { name: "Heavy Duty 40-Sheet + Staples", sku: "STAPLER-40", priceDelta: 18000, attributes: { sheets: 40, staples: "24/6", extras: "3 packs" } },
        { name: "Electric Stapler 80-Sheet", sku: "STAPLER-ELEC", priceDelta: 64900, attributes: { type: "electric", sheets: 80 } }
      ],
      tags: ["stapler", "heavy duty stapler", "office stapler", "electric stapler", "staple remover"],
      highlights: ["Heavy-duty metal body", "Jams less — staple straight through", "Includes remover and extra staple packs", "Available in electric version for bulk stapling"],
      specifications: { Capacity: "20–80 sheets", Staples: "26/6 or 24/6", Body: "Metal + ABS grip", Use: "General office, accounts, HR" },
      replacementDays: 7, dispatchDays: 1, rating: 4.3, reviewCount: 96
    },
    {
      slug: "attendance-muster-roll-book",
      name: "Attendance & Muster Roll Register",
      categorySlug: "paper-registers",
      description: "Hard-bound attendance and muster roll registers for factories, offices, schools, and government institutions. Pre-ruled with date and signature columns.",
      kind: "STATIONERY",
      imageUrl: IMAGES.stationery.register,
      gallery: [IMAGES.stationery.register, IMAGES.stationery.files, IMAGES.stationery.notebook],
      basePrice: 29900,
      options: { formats: ["Daily attendance", "Weekly muster", "Monthly register", "Biometric backup"], sizes: ["50 employees", "100 employees", "200+ employees"] },
      variants: [
        { name: "50 Employee Attendance (3 months)", sku: "ATT-50-3M", priceDelta: 0, attributes: { employees: 50, months: 3 } },
        { name: "100 Employee Register", sku: "ATT-100", priceDelta: 22000, attributes: { employees: 100, months: 3 } },
        { name: "Factory Muster Roll (200+)", sku: "ATT-200-MUSTER", priceDelta: 55000, attributes: { employees: 200, format: "muster" } }
      ],
      tags: ["attendance register", "muster roll", "employee attendance", "factory register", "HR register"],
      highlights: ["Hard-bound cover with durable spine", "Pre-ruled date + signature columns", "Labour law compliant format", "Available for 50–200+ employees"],
      specifications: { Format: "Daily / Monthly attendance", Columns: "Date, Name, Sign, Remarks", Binding: "Hard bound", Compliance: "Labour law format" },
      replacementDays: 3, dispatchDays: 1, rating: 4.2, reviewCount: 61
    },
    // ── MORE BOARDS ────────────────────────────────────────────────────────
    {
      slug: "society-apartment-directory-board",
      name: "Society & Apartment Directory Board",
      categorySlug: "official-boards",
      description: "Multi-flat directory board for housing societies, apartments, and complexes. Shows flat number, owner name, and floor. Interchangeable name strips.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.official,
      gallery: [IMAGES.boards.official, IMAGES.boards.acrylic, IMAGES.boards.led],
      basePrice: 189900,
      minWidthMm: 400, maxWidthMm: 1200, minHeightMm: 500, maxHeightMm: 2000,
      defaultWidthMm: 600, defaultHeightMm: 900,
      options: boardOptions,
      variants: [
        { name: "20 Flat Board", sku: "BOARD-SOC-20", priceDelta: 0, attributes: { flats: 20, material: "Acrylic" } },
        { name: "50 Flat Board", sku: "BOARD-SOC-50", priceDelta: 95000, attributes: { flats: 50, material: "Acrylic" } },
        { name: "100 Flat Board (with LED)", sku: "BOARD-SOC-100", priceDelta: 225000, attributes: { flats: 100, lighting: "LED" } }
      ],
      tags: ["society board", "apartment directory", "flat directory", "housing board", "complex board"],
      highlights: ["Interchangeable name strips for easy updates", "20 to 100+ flat capacity", "LED backlit option for lobby visibility", "Stainless steel frame finish available"],
      specifications: { Capacity: "20–100+ flats", Material: "Acrylic + SS frame", Lighting: "Optional LED", Installation: "Wall mounted with stand option" },
      replacementDays: 7, dispatchDays: 7, rating: 4.7, reviewCount: 38
    },
    {
      slug: "office-floor-plan-board",
      name: "Office Floor Plan & Department Board",
      categorySlug: "official-boards",
      description: "Large format office floor plan board showing department names, cabin numbers, and room allocations. Professional wayfinding for corporate offices.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.official,
      gallery: [IMAGES.boards.official, IMAGES.boards.acrylic, IMAGES.boards.safety],
      basePrice: 149900,
      minWidthMm: 600, maxWidthMm: 2400, minHeightMm: 400, maxHeightMm: 1200,
      defaultWidthMm: 1200, defaultHeightMm: 600,
      options: boardOptions,
      variants: [
        { name: "Printed ACP Board", sku: "BOARD-FLOOR-ACP", priceDelta: 0, attributes: { material: "ACP", type: "printed" } },
        { name: "Acrylic Backlit Plan Board", sku: "BOARD-FLOOR-LIT", priceDelta: 110000, attributes: { material: "Acrylic", lighting: "backlit" } }
      ],
      tags: ["floor plan board", "office layout board", "department board", "wayfinding board", "corporate board"],
      highlights: ["Custom floor plan artwork included", "Department color coding", "Mounted with standoffs for premium look", "Digital proof before production"],
      specifications: { Content: "Floor plan + departments", Material: "ACP / Acrylic", Print: "UV or vinyl", Mounting: "Wall standoffs" },
      replacementDays: 7, dispatchDays: 5, rating: 4.6, reviewCount: 29
    },
    {
      slug: "school-classroom-name-board",
      name: "School Classroom Name Board",
      categorySlug: "name-boards",
      description: "Durable classroom door and corridor boards for schools. Shows class name, teacher name, and section number. Bright colors, UV-fade resistant.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.acrylic,
      gallery: [IMAGES.boards.acrylic, IMAGES.boards.official, IMAGES.boards.safety],
      basePrice: 34900,
      minWidthMm: 200, maxWidthMm: 600, minHeightMm: 100, maxHeightMm: 300,
      defaultWidthMm: 300, defaultHeightMm: 150,
      options: boardOptions,
      variants: [
        { name: "Single Classroom Board", sku: "BOARD-SCHOOL-1", priceDelta: 0, attributes: { quantity: 1, material: "Acrylic" } },
        { name: "Pack of 10 Boards", sku: "BOARD-SCHOOL-10", priceDelta: 299000, attributes: { quantity: 10, material: "Acrylic" } },
        { name: "Full School Set (20+ boards)", sku: "BOARD-SCHOOL-20", priceDelta: 549000, attributes: { quantity: 20, material: "Acrylic" } }
      ],
      tags: ["school board", "classroom board", "class name board", "teacher board", "school signage"],
      highlights: ["Class name + teacher name display", "UV-fade resistant colours", "Screw mount for corridor walls", "Bulk school pricing available"],
      specifications: { Material: "Acrylic 3mm", Colors: "Bright custom colors", UV: "Fade-resistant print", Mount: "Wall screws included" },
      replacementDays: 7, dispatchDays: 3, rating: 4.5, reviewCount: 78, isFeatured: true
    },
    {
      slug: "outdoor-shop-flex-banner",
      name: "Outdoor Flex Shop Banner",
      categorySlug: "light-boards",
      description: "High-quality outdoor flex banners for grand openings, events, sales, and promotions. Available in backlit and frontlit options with full-color print.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.led,
      gallery: [IMAGES.boards.led, IMAGES.boards.official, IMAGES.boards.menu],
      basePrice: 49900,
      minWidthMm: 600, maxWidthMm: 10000, minHeightMm: 300, maxHeightMm: 5000,
      defaultWidthMm: 2400, defaultHeightMm: 1200,
      options: boardOptions,
      variants: [
        { name: "Frontlit Flex (per sqft)", sku: "BANNER-FRONT", priceDelta: 0, attributes: { type: "frontlit", gsm: 440 } },
        { name: "Backlit Flex (per sqft)", sku: "BANNER-BACK", priceDelta: 15000, attributes: { type: "backlit", gsm: 500 } },
        { name: "Vinyl Sticker (per sqft)", sku: "BANNER-VINYL", priceDelta: 8000, attributes: { type: "vinyl", use: "glass/wall" } }
      ],
      tags: ["flex banner", "shop banner", "outdoor banner", "backlit banner", "event banner", "promotional banner"],
      highlights: ["Solvent UV print for outdoor durability", "Frontlit and backlit material options", "Any custom size — priced per sqft", "Hemming + eyelets included"],
      specifications: { Material: "440 GSM / 500 GSM Flex", Print: "Solvent UV full color", Durability: "3–5 years outdoor", Finish: "Hemmed + eyelets" },
      replacementDays: 7, dispatchDays: 3, rating: 4.4, reviewCount: 157
    },
    {
      slug: "vehicle-branding-sticker",
      name: "Vehicle Branding Sticker / Wrap",
      categorySlug: "light-boards",
      description: "Custom vehicle branding stickers and partial wraps for cars, vans, bikes, and delivery vehicles. One-way vision and opaque options.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.official,
      gallery: [IMAGES.boards.official, IMAGES.boards.led, IMAGES.boards.acrylic],
      basePrice: 79900,
      minWidthMm: 300, maxWidthMm: 5000, minHeightMm: 200, maxHeightMm: 3000,
      defaultWidthMm: 1000, defaultHeightMm: 500,
      options: { finishes: ["Matte", "Glossy", "Chrome", "One-way vision"], vehicles: ["Car", "Van", "Truck", "Bike", "Auto"] },
      variants: [
        { name: "Door Panel Sticker", sku: "VEHICLE-DOOR", priceDelta: 0, attributes: { area: "door", type: "standard" } },
        { name: "Full Side Wrap", sku: "VEHICLE-SIDE", priceDelta: 110000, attributes: { area: "full-side", type: "wrap" } },
        { name: "Full Vehicle Wrap", sku: "VEHICLE-FULL", priceDelta: 350000, attributes: { area: "full-vehicle", type: "premium-wrap" } }
      ],
      tags: ["vehicle sticker", "car branding", "van wrap", "delivery van sticker", "vehicle wrap"],
      highlights: ["Outdoor UV-resistant solvent vinyl", "Easy removal without residue", "Custom design included in price", "Works on cars, vans, trucks, autos"],
      specifications: { Material: "Calendered / Cast vinyl", Finish: "Matte / Glossy / Chrome", Durability: "3+ years outdoor", Application: "Professional installation" },
      replacementDays: 7, dispatchDays: 4, rating: 4.6, reviewCount: 44
    },
    {
      slug: "welcome-home-name-board",
      name: "Welcome Home Name & Door Plate",
      categorySlug: "name-boards",
      description: "Elegant personalised home name plates and door boards for apartments, villas, bungalows, and independent houses. Multiple materials and styles.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.clinic,
      gallery: [IMAGES.boards.clinic, IMAGES.boards.acrylic, IMAGES.boards.official],
      basePrice: 29900,
      minWidthMm: 150, maxWidthMm: 600, minHeightMm: 80, maxHeightMm: 300,
      defaultWidthMm: 300, defaultHeightMm: 120,
      options: { ...boardOptions, fonts: ["Modern sans", "Classic serif", "Script", "Devanagari", "Tamil"] },
      variants: [
        { name: "Acrylic 3D Letters", sku: "BOARD-HOME-3D", priceDelta: 0, attributes: { style: "3D-letters", material: "Acrylic" } },
        { name: "Wooden Name Plate", sku: "BOARD-HOME-WOOD", priceDelta: 14000, attributes: { material: "Teak wood", style: "engraved" } },
        { name: "Stainless Steel Plate", sku: "BOARD-HOME-SS", priceDelta: 29000, attributes: { material: "SS304", style: "etched" } }
      ],
      tags: ["home name plate", "door plate", "house name board", "apartment nameplate", "villa board"],
      highlights: ["Personalised family/house name", "Multiple material choices", "Multilingual font support (Hindi, Tamil)", "Pre-drilled holes for easy mounting"],
      specifications: { Materials: "Acrylic / Wood / Stainless steel", Languages: "English, Hindi, Tamil, etc.", Mounting: "Screws / Double-tape", Size: "Custom" },
      replacementDays: 7, dispatchDays: 4, rating: 4.8, reviewCount: 204, isFeatured: true
    },
    {
      slug: "hospital-ward-room-number-board",
      name: "Hospital Ward & Room Number Board",
      categorySlug: "official-boards",
      description: "Durable room number and ward identification boards for hospitals, nursing homes, and clinics. High contrast for easy visibility, meets hospital standards.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.clinic,
      gallery: [IMAGES.boards.clinic, IMAGES.boards.official, IMAGES.boards.safety],
      basePrice: 19900,
      minWidthMm: 150, maxWidthMm: 500, minHeightMm: 80, maxHeightMm: 250,
      defaultWidthMm: 250, defaultHeightMm: 120,
      options: boardOptions,
      variants: [
        { name: "Single Room Board (Acrylic)", sku: "BOARD-HOSP-1", priceDelta: 0, attributes: { quantity: 1, material: "Acrylic" } },
        { name: "Pack of 10 Room Boards", sku: "BOARD-HOSP-10", priceDelta: 169000, attributes: { quantity: 10, material: "Acrylic" } },
        { name: "Pack of 25 (Hospital Set)", sku: "BOARD-HOSP-25", priceDelta: 399000, attributes: { quantity: 25, material: "Acrylic" } }
      ],
      tags: ["hospital board", "ward board", "room number board", "clinic board", "nursing home board"],
      highlights: ["High contrast colors for medical readability", "Infection-resistant acrylic surface", "Custom ward names and room numbers", "Bulk pricing for hospitals"],
      specifications: { Material: "Acrylic 3mm", Contrast: "High visibility colors", Use: "Hospitals, nursing homes", Bulk: "Discounts for 10+ boards" },
      replacementDays: 7, dispatchDays: 3, rating: 4.5, reviewCount: 31
    },
    {
      slug: "neon-glow-sign-board",
      name: "Custom LED Neon Glow Sign Board",
      categorySlug: "light-boards",
      description: "Trendy LED neon flex signs for cafes, restaurants, studios, salons, and home décor. Energy-efficient, customizable text or logo.",
      kind: "BOARD",
      imageUrl: IMAGES.boards.led,
      gallery: [IMAGES.boards.led, IMAGES.boards.menu, IMAGES.boards.acrylic],
      basePrice: 299900,
      minWidthMm: 200, maxWidthMm: 2000, minHeightMm: 150, maxHeightMm: 1000,
      defaultWidthMm: 600, defaultHeightMm: 300,
      options: { colors: ["White", "Warm White", "Red", "Blue", "Green", "Pink", "Purple", "RGB"], backings: ["Acrylic clear", "Black acrylic", "Frosted"] },
      variants: [
        { name: "Small Neon (up to 40cm wide)", sku: "NEON-S", priceDelta: 0, attributes: { width: "40cm", power: "adapter" } },
        { name: "Medium Neon (up to 80cm wide)", sku: "NEON-M", priceDelta: 120000, attributes: { width: "80cm", power: "adapter" } },
        { name: "Large Custom Neon (80cm+)", sku: "NEON-L", priceDelta: 280000, attributes: { width: "80cm+", power: "adapter", dimmer: true } }
      ],
      tags: ["neon sign", "LED neon", "glow sign", "cafe neon", "custom neon", "neon decor"],
      highlights: ["LED flex neon (not glass) — safe & durable", "5-year lifespan, low energy consumption", "Remote dimmer control (large size)", "Acrylic backing with standoff mounting"],
      specifications: { Technology: "LED flex neon strip", Colors: "7+ solid + RGB", Power: "12V adapter (included)", Lifespan: "50,000 hours" },
      replacementDays: 7, warrantyText: "1-year warranty on LED neon strip and driver.", dispatchDays: 7, rating: 4.9, reviewCount: 182, isFeatured: true
    }
  ];

  const productRecords: Record<string, string> = {};
  for (const product of products) {
    const p = await upsertProduct(product);
    productRecords[product.slug] = p.id;
  }
  console.log(`✅ ${products.length} Products seeded`);

  // ── Users ──────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mudrakart.in" },
    update: {},
    create: {
      email: "admin@mudrakart.in",
      name: "Arjun Sharma",
      role: "ADMIN",
      phone: "+91-9876543210",
      isEmailVerified: true,
      passwordHash: await argon2.hash("Admin@MudraKart#2025")
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@mudrakart.in" },
    update: {},
    create: {
      email: "manager@mudrakart.in",
      name: "Priya Menon",
      role: "MANAGER",
      phone: "+91-9123456789",
      isEmailVerified: true,
      passwordHash: await argon2.hash("Manager@MudraKart#2025")
    }
  });

  const regularUser = await prisma.user.upsert({
    where: { email: "user@mudrakart.in" },
    update: {},
    create: {
      email: "user@mudrakart.in",
      name: "Rahul Kumar",
      role: "USER",
      phone: "+91-9988776655",
      isEmailVerified: true,
      passwordHash: await argon2.hash("User@MudraKart#2025")
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: "test@mudrakart.in" },
    update: {},
    create: {
      email: "test@mudrakart.in",
      name: "Sneha Patel",
      role: "USER",
      phone: "+91-8877665544",
      isEmailVerified: false,
      passwordHash: await argon2.hash("Test@MudraKart#2025")
    }
  });

  console.log("✅ Users seeded");

  // ── Saved Addresses ────────────────────────────────────────────────────
  await prisma.savedAddress.upsert({
    where: { id: "addr-rahul-home" },
    update: {},
    create: {
      id: "addr-rahul-home",
      userId: regularUser.id,
      label: "Home",
      fullName: "Rahul Kumar",
      phone: "+91-9988776655",
      line1: "Flat 4B, Sunrise Apartments",
      line2: "MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      isDefault: true
    }
  });

  await prisma.savedAddress.upsert({
    where: { id: "addr-rahul-office" },
    update: {},
    create: {
      id: "addr-rahul-office",
      userId: regularUser.id,
      label: "Office",
      fullName: "Rahul Kumar",
      phone: "+91-9988776655",
      line1: "302, Tech Park Tower B",
      line2: "Outer Ring Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      isDefault: false
    }
  });

  console.log("✅ Addresses seeded");

  // ── Coupons ────────────────────────────────────────────────────────────
  const coupons = [
    { code: "WELCOME10", description: "10% off on your first order", type: "PERCENT" as const, value: 10, minOrderAmount: 50000, maxUses: 1000 },
    { code: "SAVE200", description: "Flat ₹200 off on orders above ₹999", type: "FIXED" as const, value: 20000, minOrderAmount: 99900, maxUses: 500 },
    { code: "BULK15", description: "15% off on bulk orders above ₹2000", type: "PERCENT" as const, value: 15, minOrderAmount: 200000, maxUses: 200 },
    { code: "BOARDS20", description: "20% off on all board orders", type: "PERCENT" as const, value: 20, minOrderAmount: 100000, maxUses: 100, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { code: "STAMPS5", description: "₹50 off on stamp orders", type: "FIXED" as const, value: 5000, minOrderAmount: 30000, maxUses: 300 }
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon
    });
  }
  console.log("✅ Coupons seeded");

  // ── Sample Orders ──────────────────────────────────────────────────────
  const sampleProductIds = Object.values(productRecords);

  const orderAddress = {
    fullName: "Rahul Kumar",
    phone: "+91-9988776655",
    line1: "Flat 4B, Sunrise Apartments, MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001"
  };

  // Order 1 - Delivered
  const order1 = await prisma.order.create({
    data: {
      userId: regularUser.id,
      status: OrderStatus.DELIVERED,
      paymentMethod: PaymentMethod.UPI,
      subtotal: 34900 + 89900,
      shippingFee: 0,
      discountAmount: 0,
      total: 124800,
      address: orderAddress,
      trackingId: "DTDC123456789IN",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: productRecords["self-inking-address-stamp"],
            quantity: 1,
            unitPrice: 34900,
            total: 34900,
            customWidthMm: 50,
            customHeightMm: 20,
            customText: "RAHUL ENTERPRISES, MG Road, Bengaluru",
            customization: {}
          },
          {
            productId: productRecords["custom-acrylic-name-board"],
            quantity: 1,
            unitPrice: 89900,
            total: 89900,
            customWidthMm: 600,
            customHeightMm: 300,
            customText: "Rahul Enterprises",
            customization: { material: "Acrylic", thickness: "3mm" }
          }
        ]
      }
    }
  });

  // Order 2 - Processing
  const order2 = await prisma.order.create({
    data: {
      userId: regularUser.id,
      status: OrderStatus.PROCESSING,
      paymentMethod: PaymentMethod.CARD,
      subtotal: 249900,
      shippingFee: 6900,
      discountAmount: 24990,
      total: 231810,
      address: orderAddress,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: productRecords["led-light-shop-board"],
            quantity: 1,
            unitPrice: 249900,
            total: 249900,
            customWidthMm: 900,
            customHeightMm: 450,
            customText: "Rahul's Restaurant",
            customization: { placement: "Indoor", lighting: "warm-white" }
          }
        ]
      }
    }
  });

  // Order 3 - Pending payment (user2)
  await prisma.order.create({
    data: {
      userId: user2.id,
      status: OrderStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethod.UPI,
      subtotal: 62900,
      shippingFee: 6900,
      discountAmount: 0,
      total: 69800,
      address: {
        fullName: "Sneha Patel",
        phone: "+91-8877665544",
        line1: "12 Gandhi Nagar, Satellite Road",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380015"
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: productRecords["paid-received-date-stamp"],
            quantity: 1,
            unitPrice: 62900,
            total: 62900,
            customText: "PAID",
            customization: { inkColor: "Blue" }
          }
        ]
      }
    }
  });

  console.log("✅ Sample orders seeded");

  // ── Reviews ────────────────────────────────────────────────────────────
  const reviewsData = [
    {
      productId: productRecords["self-inking-address-stamp"],
      userId: regularUser.id,
      orderId: order1.id,
      rating: 5,
      title: "Excellent quality stamp!",
      body: "Really happy with the quality. The impression is sharp and clear. Fast delivery too — got it in 2 days. Would definitely order again for our office.",
      isVerified: true,
      helpfulCount: 24
    },
    {
      productId: productRecords["custom-acrylic-name-board"],
      userId: regularUser.id,
      orderId: order1.id,
      rating: 5,
      title: "Board looks premium and professional",
      body: "The acrylic board for our office looks stunning. The print quality is top notch, colors are vibrant. The mounting was easy. Very satisfied with MudraKart's service.",
      isVerified: true,
      helpfulCount: 41
    },
    {
      productId: productRecords["led-light-shop-board"],
      userId: user2.id,
      rating: 4,
      title: "Great backlit board, minor delay in delivery",
      body: "The LED board looks amazing at night! The illumination is very bright and even. Only downside was delivery took 8 days instead of the promised 6. But overall very happy.",
      isVerified: false,
      helpfulCount: 12
    }
  ];

  for (const review of reviewsData) {
    const existing = await prisma.review.findFirst({
      where: { productId: review.productId, userId: review.userId }
    });
    if (!existing) {
      await prisma.review.create({ data: review });
    }
  }
  console.log("✅ Reviews seeded");

  // ── Admin Logs ─────────────────────────────────────────────────────────
  const logsData = [
    {
      adminId: adminUser.id,
      action: "CREATE_COUPON",
      entity: "Coupon",
      meta: { code: "WELCOME10", type: "PERCENT", value: 10 }
    },
    {
      adminId: managerUser.id,
      action: "UPDATE_ORDER_STATUS",
      entity: "Order",
      entityId: order1.id,
      meta: { oldStatus: "PAID", newStatus: "DELIVERED" }
    },
    {
      adminId: managerUser.id,
      action: "UPDATE_ORDER_STATUS",
      entity: "Order",
      entityId: order2.id,
      meta: { oldStatus: "PAID", newStatus: "PROCESSING" }
    },
    {
      adminId: adminUser.id,
      action: "FEATURE_PRODUCT",
      entity: "Product",
      entityId: productRecords["led-light-shop-board"],
      meta: { name: "LED Backlit Shop Sign Board" }
    }
  ];

  for (const log of logsData) {
    await prisma.adminLog.create({ data: log });
  }
  console.log("✅ Admin logs seeded");

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("👤 Admin:   admin@mudrakart.in   / Admin@MudraKart#2025");
  console.log("👤 Manager: manager@mudrakart.in / Manager@MudraKart#2025");
  console.log("👤 User:    user@mudrakart.in    / User@MudraKart#2025");
  console.log("─────────────────────────────────────");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
