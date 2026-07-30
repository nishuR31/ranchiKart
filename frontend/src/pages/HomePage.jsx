import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import useSEO from "../lib/useSEO";
import { ProductGridSkeleton, Skeleton } from "../components/Loaders";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import Snowfall from "react-snowfall";
import {
  Smartphone, Tv, Shirt, ShoppingBasket, Sofa, Sparkles,
  BookOpen, Dumbbell, Package, Truck, ShieldCheck, RotateCcw,
  Baby, PawPrint, Gem, Footprints, Leaf,
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

export default function HomePage() {
  useSEO(); // Default title and description
  const user = useAuthStore((s) => s.user);
  const showSnowfall = useShopStore((s) => s.showSnowfall);

  const [categories, setCategories] = useState([]);      // top-level (parentId == null)
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  // category-wise product sections: { [kind]: Product[] }
  const [kindSections, setKindSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [catRes, featRes] = await Promise.all([
          api.get("/categories"),
          api.get("/products/featured"),
        ]);

        const allCats = catRes.data.categories ?? catRes.data ?? [];

        // Fetch all top-level categories
        const topCats = allCats.filter((c) => !c.parentId);
        setCategories(topCats);

        const featured = featRes.data.products ?? featRes.data ?? [];
        setFeaturedProducts(featured.slice(0, 8));

        // Load trending
        const trendRes = await api.get("/products", { params: { sort: "rating", limit: 8 } });
        setTrendingProducts(trendRes.data.products ?? trendRes.data ?? []);

        // Load a few products for top 4 category kinds
        const topKinds = [...new Set(topCats.map((c) => c.kind))].slice(0, 4);
        const kindResults = await Promise.all(
          topKinds.map((kind) =>
            api.get("/products", { params: { kind, limit: 6, sort: "newest" } })
              .then((r) => ({ kind, products: r.data.products ?? r.data ?? [] }))
              .catch(() => ({ kind, products: [] }))
          )
        );
        const sections = {};
        kindResults.forEach(({ kind, products }) => {
          if (products.length > 0) sections[kind] = products;
        });
        setKindSections(sections);
      } catch (e) {
        console.error("HomePage load error", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="home-page">
      {showSnowfall && <Snowfall color="rgba(255, 255, 255, 0.4)" snowflakeCount={100} style={{ position: 'fixed', width: '100vw', height: '100vh', zIndex: 10, pointerEvents: 'none' }} />}

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-tag">Big Billion Style Deals</span>
          <h1>Up to 70% off — Ranchi's Own Online Store</h1>
          <p>Mobiles, fashion, grocery, home essentials &amp; more — delivered fast across every locality in Ranchi.</p>
          <div className="hero-cta-row">
            <Link to="/search?q=" className="btn btn-accent">Shop Now</Link>
            {!user && <Link to="/auth" className="btn btn-outline">Login / Sign Up</Link>}
          </div>
        </div>
        <div className="hero-badges">
          <div><Truck size={20} /> Same-day delivery in central Ranchi</div>
          <div><ShieldCheck size={20} /> Secure UPI / Card / COD payments</div>
          <div><RotateCcw size={20} /> 7-day easy replacement</div>
        </div>
      </section>

      {/* ── Offers Carousel ────────────────────────────────────────────── */}
      <section className="offers-carousel-section">
        {loading ? (
          <div className="offers-carousel">
            <Skeleton style={{ minWidth: "300px", height: "140px", borderRadius: "12px", flexShrink: 0 }} />
            <Skeleton style={{ minWidth: "300px", height: "140px", borderRadius: "12px", flexShrink: 0 }} />
            <Skeleton style={{ minWidth: "300px", height: "140px", borderRadius: "12px", flexShrink: 0 }} />
          </div>
        ) : (
          <div className="offers-carousel">
            <div className="offer-card" style={{ background: "linear-gradient(135deg, #ff9f1c, #ff6b6b)" }}>
              <h3>Super Saver Week!</h3>
              <p>Flat 50% off on all Fashion & Apparel</p>
              <Link to="/search?q=fashion" className="btn btn-sm">Shop Fashion</Link>
            </div>
            <div className="offer-card" style={{ background: "linear-gradient(135deg, #2b5fd9, #1e45a8)" }}>
              <h3>Tech Fest</h3>
              <p>Get up to ₹5000 off on Laptops & Mobiles</p>
              <Link to="/search?q=electronics" className="btn btn-sm">Shop Electronics</Link>
            </div>
            <div className="offer-card" style={{ background: "linear-gradient(135deg, #388e3c, #1b5e20)" }}>
              <h3>Fresh Groceries</h3>
              <p>Same-day delivery + 10% cashback on UPI</p>
              <Link to="/search?q=grocery" className="btn btn-sm">Shop Groceries</Link>
            </div>
          </div>
        )}
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
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} className="cat-img" />
                      : <Icon size={28} />
                    }
                    <span>{cat.name}</span>
                  </Link>
                );
              })
            : /* Skeleton placeholders while loading */
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="category-tile" style={{ border: 'none', background: 'transparent' }}>
                  <Skeleton width={48} height={48} style={{ borderRadius: '50%' }} />
                  <Skeleton width={70} height={14} style={{ marginTop: 8 }} />
                </div>
              ))
          }
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
                {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
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
                {trendingProducts.map((p) => <ProductCard key={p.id} product={p} />)}
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
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
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

      {/* ── About & Privacy (Compliance) ──────────────────────────────── */}
      <section className="about-compliance-section">
        <div className="about-compliance-content">
          <h2>About RanchiKart & Your Privacy</h2>
          <p>
            RanchiKart is a local e-commerce platform connecting residents of Ranchi to rapid delivery of groceries, fashion, and everyday essentials.
          </p>
          <p>
            We offer Google Login for quick, secure access. We only request your name and email address to create your account, personalize your shopping experience, and send important order updates. We do not sell your data.
          </p>
          <p>
            For more information, please read our <Link to="/privacy" style={{color: 'var(--brand)', textDecoration: 'underline'}}>Privacy Policy</Link> and <Link to="/terms" style={{color: 'var(--brand)', textDecoration: 'underline'}}>Terms of Service</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
