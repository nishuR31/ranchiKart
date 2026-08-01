import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import useSEO from "../lib/useSEO";
import { ProductGridSkeleton, Skeleton } from "../components/Loaders";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import Snowfall from "react-snowfall";

// Filter out test/dummy categories before they reach customer-facing grids.
const isRealCategory = (cat) => {
  const name = (cat.name ?? "").trim();
  if (!name || /\d{7,}/.test(name)) return false;
  if (name.length > 28) return false;
  if (/^(test|demo|dummy|sample|invoice|payment|order)\b/i.test(name)) return false;
  if (/^[a-z]{10,}$/i.test(name) && !/[aeiou]/i.test(name)) return false;
  return true;
};
import {
  Smartphone,
  Tv,
  Shirt,
  ShoppingBasket,
  Sofa,
  Sparkles,
  BookOpen,
  Dumbbell,
  Package,
  Truck,
  ShieldCheck,
  RotateCcw,
  Baby,
  PawPrint,
  Gem,
  Footprints,
  Leaf,
} from "lucide-react";

// Map ProductKind → Lucide icon component
const KIND_ICONS = {
  ELECTRONIC: Tv,
  CLOTHING: Shirt,
  EATABLE: ShoppingBasket,
  HOME: Sofa,
  KITCHEN: Sofa,
  BEAUTY: Sparkles,
  HEALTH: Sparkles,
  STATIONERY: BookOpen,
  SPORT: Dumbbell,
  SHOE: Footprints,
  BAG: Package,
  JEWELLERY: Gem,
  ACCESSORY: Gem,
  TOY: Baby,
  PET: PawPrint,
  GARDEN: Leaf,
  BABY: Baby,
  STAMP: Package,
  BOARD: Package,
  OTHER: Package,
};

// Friendly label for ProductKind
const KIND_LABEL = {
  ELECTRONIC: "Electronics",
  CLOTHING: "Fashion & Clothing",
  EATABLE: "Grocery & Food",
  HOME: "Home Décor",
  KITCHEN: "Kitchen & Dining",
  BEAUTY: "Beauty & Personal Care",
  HEALTH: "Health & Wellness",
  STATIONERY: "Books & Stationery",
  SPORT: "Sports & Fitness",
  SHOE: "Footwear",
  BAG: "Bags & Luggage",
  JEWELLERY: "Jewellery",
  ACCESSORY: "Accessories",
  TOY: "Toys & Games",
  PET: "Pet Supplies",
  GARDEN: "Garden & Outdoors",
  BABY: "Baby & Kids",
  OTHER: "More",
};

const FALLBACK_CATEGORIES = [
  {
    id: "fallback-electronics",
    slug: "electronics",
    name: "Electronics & Gadgets",
    kind: "ELECTRONIC",
  },
  { id: "fallback-fashion", slug: "fashion", name: "Fashion & Apparel", kind: "CLOTHING" },
  { id: "fallback-grocery", slug: "grocery", name: "Grocery & Foods", kind: "EATABLE" },
  { id: "fallback-home", slug: "home-decor", name: "Home Decor", kind: "HOME" },
  { id: "fallback-beauty", slug: "beauty", name: "Beauty & Personal Care", kind: "BEAUTY" },
  {
    id: "fallback-books",
    slug: "books-stationery",
    name: "Books & Stationery",
    kind: "STATIONERY",
  },
  { id: "fallback-sports", slug: "sports-fitness", name: "Sports & Fitness", kind: "SPORT" },
  { id: "fallback-bags", slug: "bags-luggage", name: "Bags & Luggage", kind: "BAG" },
  { id: "fallback-footwear", slug: "footwear", name: "Footwear", kind: "SHOE" },
  { id: "fallback-garden", slug: "garden", name: "Garden & Outdoors", kind: "GARDEN" },
];

function normalizeCategories(apiCategories = []) {
  const real = apiCategories.filter((c) => !c.parentId && isRealCategory(c));
  return FALLBACK_CATEGORIES.map((fallback) => {
    const bySlug = real.find((c) => c.slug === fallback.slug);
    const byKind = real.find((c) => c.kind === fallback.kind);
    const byName = real.find((c) => c.name?.toLowerCase() === fallback.name.toLowerCase());
    const match = bySlug || byKind || byName;
    return {
      ...fallback,
      id: match?.id ?? fallback.id,
      slug: match?.slug ?? fallback.slug,
      imageUrl: match?.imageUrl,
    };
  });
}

export default function HomePage() {
  useSEO(); // Default title and description
  const user = useAuthStore((s) => s.user);
  const showSnowfall = useShopStore((s) => s.showSnowfall);
  const seasonalEffect = useShopStore((s) => s.seasonalEffect);

  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [kindSections, setKindSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // ── All initial fetches in ONE parallel batch ─────────────────────
        const [catRes, featRes, trendRes] = await Promise.all([
          api.get("/categories"),
          api.get("/products/featured"),
          api.get("/products", { params: { sort: "rating", limit: 8 } }),
        ]);

        const allCats = catRes.data.categories ?? catRes.data ?? [];
        // Filter out test/dummy categories before displaying
        const topCats = normalizeCategories(allCats);
        setCategories(topCats);

        const featured = featRes.data.products ?? featRes.data ?? [];
        setFeaturedProducts(featured.slice(0, 8));

        setTrendingProducts(trendRes.data.products ?? trendRes.data ?? []);

        // ── Load category-kind sections in parallel (top 3 kinds only) ────
        const topKinds = [...new Set(topCats.map((c) => c.kind))].slice(0, 3);
        const kindResults = await Promise.all(
          topKinds.map((kind) =>
            api
              .get("/products", { params: { kind, limit: 6, sort: "newest" } })
              .then((r) => ({ kind, products: r.data.products ?? r.data ?? [] }))
              .catch(() => ({ kind, products: [] })),
          ),
        );
        const sections = {};
        kindResults.forEach(({ kind, products }) => {
          if (products.length > 0) sections[kind] = products;
        });
        setKindSections(sections);
      } catch (e) {
        console.error("HomePage load error", e);
        setCategories(FALLBACK_CATEGORIES);
        setFeaturedProducts([]);
        setTrendingProducts([]);
        setKindSections({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="home-page">
      {showSnowfall && seasonalEffect === "snow" && (
        <Snowfall
          color="rgba(255, 255, 255, 0.45)"
          snowflakeCount={80}
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />
      )}
      {showSnowfall && seasonalEffect === "sparkles" && (
        <div className={`seasonal-overlay seasonal-${seasonalEffect}`} aria-hidden="true" />
      )}

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-tag">Big Billion Style Deals</span>
          <h1>Up to 70% off — Ranchi's Own Online Store</h1>
          <p>
            Mobiles, fashion, grocery, home essentials &amp; more — delivered fast across every
            locality in Ranchi.
          </p>
          <div className="hero-cta-row">
            <Link to="/search?q=" className="btn btn-accent">
              Shop Now
            </Link>
            {!user && (
              <Link to="/auth" className="btn btn-outline">
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>
        <div className="hero-badges">
          <div>
            <Truck size={20} /> Same-day delivery in central Ranchi
          </div>
          <div>
            <ShieldCheck size={20} /> Secure UPI / Card / COD payments
          </div>
          <div>
            <RotateCcw size={20} /> 7-day easy replacement
          </div>
        </div>
      </section>

      {/* ── Category Grid (from API) ──────────────────────────────────── */}
      <section className="category-grid-section">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <Link to="/search?q=">View all</Link>
        </div>
        <div className="category-grid">
          {categories.length > 0
            ? categories.map((cat) => {
                const Icon = KIND_ICONS[cat.kind] ?? Package;
                return (
                  <Link key={cat.id} to={`/category/${cat.slug}`} className="category-tile">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="cat-img" loading="lazy" />
                    ) : (
                      <Icon size={28} />
                    )}
                    <span>{cat.name}</span>
                  </Link>
                );
              })
            : Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="category-tile"
                  style={{ border: "none", background: "transparent" }}
                >
                  <Skeleton width={48} height={48} style={{ borderRadius: "50%" }} />
                  <Skeleton width={70} height={14} style={{ marginTop: 8 }} />
                </div>
              ))}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────── */}
      {loading ? (
        <>
          <section className="product-section">
            <div className="section-header">
              <Skeleton width={200} height={28} />
              <Skeleton width={60} height={20} />
            </div>
            <ProductGridSkeleton n={8} />
          </section>
        </>
      ) : (
        <>
          {featuredProducts.length > 0 && (
            <section className="product-section">
              <div className="section-header">
                <h2>Featured for Ranchi</h2>
                <Link to="/search?q=">View all</Link>
              </div>
              <div className="product-grid">
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Trending ───────────────────────────────────────────────── */}
          {trendingProducts.length > 0 && (
            <section className="product-section">
              <div className="section-header">
                <h2>Trending Near You</h2>
                <Link to="/search?q=&sort=rating">View all</Link>
              </div>
              <div className="product-grid">
                {trendingProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Category-wise Sections ────────────────────────────────── */}
          {Object.entries(kindSections).map(([kind, products]) => (
            <section key={kind} className="product-section">
              <div className="section-header">
                <h2>{KIND_LABEL[kind] ?? kind}</h2>
                <Link to={`/search?q=&kind=${kind}`}>View all</Link>
              </div>
              <div className="product-grid">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {/* ── Trust Badges ──────────────────────────────────────────────── */}
      <section className="trust-section">
        <div className="trust-grid">
          <div className="trust-card">
            <Truck size={32} />
            <h3>Fast Local Delivery</h3>
            <p>Same-day delivery in central Ranchi. Next-day across Jharkhand.</p>
          </div>
          <div className="trust-card">
            <ShieldCheck size={32} />
            <h3>100% Secure Payments</h3>
            <p>UPI, Cards, Net Banking, COD — all payment methods accepted.</p>
          </div>
          <div className="trust-card">
            <RotateCcw size={32} />
            <h3>Easy Returns</h3>
            <p>7-day hassle-free replacement on all eligible products.</p>
          </div>
          <div className="trust-card">
            <ShoppingBasket size={32} />
            <h3>Local Ranchi Products</h3>
            <p>Support local sellers and get authentic products from Jharkhand.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
