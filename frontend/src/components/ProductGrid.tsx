import ProductCard from "./ProductCard";
import type { Product } from "../types";

interface Props {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-[var(--surface-2)]" />
      <div className="p-4 space-y-3">
        <div className="h-2.5 bg-[var(--surface-2)] rounded w-1/3" />
        <div className="h-4 bg-[var(--surface-2)] rounded w-5/6" />
        <div className="h-3 bg-[var(--surface-2)] rounded w-1/2" />
        <div className="h-5 bg-[var(--surface-2)] rounded w-1/3 mt-4" />
      </div>
    </div>
  );
}

export default function ProductGrid({ products, loading, skeletonCount = 8 }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-[var(--surface-2)] rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <p className="text-[var(--text-2)] font-semibold">No products found</p>
        <p className="text-[var(--text-muted)] text-sm mt-1">Try a different search or browse categories</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
