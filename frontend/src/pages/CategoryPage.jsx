import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import useSEO from "../lib/useSEO";
import { ProductGridSkeleton } from "../components/Loaders";

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const title = slug
    .split("-")
    // Remove the trailing number if it exists (e.g. fashion-core-1234 -> Fashion Core)
    .filter(w => !/^\d+$/.test(w))
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" & ");

  useSEO({
    title: title,
    description: `Shop products in ${title} at UrbanRanchi.`,
  });

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/products", {
          params: { category: slug, sort, page, limit: 8 },
        });
        setProducts(data.products ?? data ?? []);
        setTotalPages(data.totalPages ?? data.pages ?? 1);
      } catch {
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, sort, page]);

  return (
    <div className="category-page">
      <div className="category-header">
        <h1>{title}</h1>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setSearchParams({ sort: e.target.value });
          }}
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Customer Rating</option>
        </select>
      </div>

      {loading ? (
        <ProductGridSkeleton n={8} />
      ) : products.length === 0 ? (
        <div className="empty-block">No products found in this category yet.</div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} setPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}
