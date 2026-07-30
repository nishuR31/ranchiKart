import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import useSEO from "../lib/useSEO";
import { ProductGridSkeleton } from "../components/Loaders";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: q ? `Search: ${q}` : "All Products",
    description: q ? `Search results for ${q} at RanchiKart.` : "Browse all products at RanchiKart.",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Use the dedicated /search endpoint when there's a query
      const endpoint = q ? "/search" : "/products";
      const params = q ? { q, limit: 24 } : { limit: 24 };
      const { data } = await api.get(endpoint, { params });
      // /search returns { results: [...] } or { products: [...] }
      setProducts(data.results ?? data.products ?? data ?? []);
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
        <ProductGridSkeleton n={12} />
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
