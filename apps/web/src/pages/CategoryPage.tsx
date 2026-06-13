import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import ProductGrid from "../components/ProductGrid";
import type { Category, Product } from "../types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" }
];

export default function CategoryPage() {
  const { slug = "" } = useParams();
  const { categories } = useOutletContext<{ categories: Category[] }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [minRating, setMinRating] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  const category = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
  const children = useMemo(() => categories.filter((c) => c.parentId === category?.id), [categories, category]);

  // Debounce API call by 120ms to prevent rapid re-fetches on filter change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.getProducts({ category: slug, sort, minRating })
        .then((r) => { setProducts(r.products); setTotal(r.total); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 120);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [slug, sort, minRating]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--text-1)] transition-colors">Home</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text-2)]">{category?.name ?? "Products"}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1.5">Category</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)]">{category?.name ?? "Products"}</h1>
        {category?.description && (
          <p className="text-[var(--text-muted)] text-sm mt-2 max-w-2xl">{category.description}</p>
        )}
      </div>

      {/* Subcategory pills */}
      {children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {children.map((child) => (
            <Link key={child.id} to={`/category/${child.slug}`}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-indigo-500/40 hover:bg-indigo-500/8 transition-all">
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm text-[var(--text-muted)] mr-auto">
          {loading ? "Loading…" : `${total} product${total !== 1 ? "s" : ""}`}
        </span>

        {/* Active filter chips */}
        {minRating && (
          <button onClick={() => setMinRating(undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-400 transition-all">
            {minRating}★+ <X size={11} />
          </button>
        )}

        {/* Sort */}
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 transition-colors cursor-pointer">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Filters toggle */}
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 h-9 rounded-xl border text-sm font-medium transition-all ${
            showFilters ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                       : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-2)]"
          }`}>
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filter */}
        {showFilters && (
          <aside className="hidden md:block w-52 shrink-0">
            <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-1)]">Filters</h3>
                <button onClick={() => setMinRating(undefined)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-1)] transition-colors">Clear all</button>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Rating</p>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((r) => (
                    <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="radio" name="rating" checked={minRating === r}
                        onChange={() => setMinRating(r)}
                        className="accent-indigo-500" />
                      <span className="text-sm text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                        {"★".repeat(r)} &amp; above
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {children.length > 0 && (
                <div className="mt-5 pt-5 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Subcategory</p>
                  <div className="space-y-1.5">
                    {children.map((child) => (
                      <Link key={child.id} to={`/category/${child.slug}`}
                        className="block px-3 py-2 rounded-lg text-sm text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors">
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          <ProductGrid products={products} loading={loading} skeletonCount={12} />
        </div>
      </div>
    </div>
  );
}
