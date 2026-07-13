import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
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
} from "lucide-react";

const ICONS = {
  Smartphone,
  Tv,
  Shirt,
  ShoppingBasket,
  Sofa,
  Sparkles,
  BookOpen,
  Dumbbell,
  Package,
};

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [catRes, featRes, trendRes] = await Promise.all([
        api.get("/categories"),
        api.get("/products", { params: { featured: true, limit: 8 } }),
        api.get("/products", { params: { sort: "rating", limit: 8 } }),
      ]);
      setCategories(catRes.data.categories);
      setFeatured(featRes.data.products);
      setTrending(trendRes.data.products);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-text">
          <h1>Ranchi's Own Online Store</h1>
          <p>Mobiles, fashion, grocery, home essentials &amp; more — delivered fast across every locality in Ranchi.</p>
          <Link to="/category/mobiles" className="btn btn-primary">Shop Now</Link>
        </div>
        <div className="hero-badges">
          <div><Truck size={20} /> Same-day delivery in central Ranchi</div>
          <div><ShieldCheck size={20} /> Secure UPI / Card / COD payments</div>
          <div><RotateCcw size={20} /> 7-day easy replacement</div>
        </div>
      </section>

      <section className="category-grid">
        {categories.map((cat) => {
          const Icon = ICONS[cat.icon] || Package;
          return (
            <Link key={cat.id} to={`/category/${cat.slug}`} className="category-tile">
              <Icon size={26} />
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </section>

      {loading ? (
        <div className="loading-block">Loading products…</div>
      ) : (
        <>
          <section className="product-section">
            <div className="section-header">
              <h2>Featured for Ranchi</h2>
              <Link to="/search?q=">View all</Link>
            </div>
            <div className="product-grid">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>

          <section className="product-section">
            <div className="section-header">
              <h2>Trending Near You</h2>
            </div>
            <div className="product-grid">
              {trending.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
