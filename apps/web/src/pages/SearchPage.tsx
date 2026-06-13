import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api/client";
import ProductGrid from "../components/ProductGrid";
import type { Product } from "../types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" }
];

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    setLoading(true);
    api.getProducts({ q: query, sort })
      .then((r) => setProducts(r.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1.5">Search</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)]">
          {query ? <>Results for "<span className="text-indigo-400">{query}</span>"</> : "All Products"}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Searches name, description, tags, category and specifications.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-[var(--text-muted)] mr-auto">
          {loading ? "Searching…" : `${products.length} product${products.length !== 1 ? "s" : ""}`}
        </span>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 transition-colors cursor-pointer">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-2xl flex items-center justify-center mb-4">
            <Search size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-1)] font-semibold text-lg">No products found</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Try a different search term or browse categories</p>
          <Link to="/" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Back to Home
          </Link>
        </div>
      )}

      <ProductGrid products={products} loading={loading} skeletonCount={12} />
    </div>
  );
}
