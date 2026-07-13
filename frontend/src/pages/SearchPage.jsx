import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await api.get("/products", { params: { q, limit: 24 } });
      setProducts(data.products);
      setLoading(false);
    }
    load();
  }, [q]);

  return (
    <div className="category-page">
      <div className="category-header">
        <h1>{q ? `Search results for "${q}"` : "All products"}</h1>
      </div>
      {loading ? (
        <div className="loading-block">Searching…</div>
      ) : products.length === 0 ? (
        <div className="empty-block">No products matched your search.</div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
