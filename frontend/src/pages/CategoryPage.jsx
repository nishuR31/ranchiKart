import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(searchParams.get("sort") || "popular");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await api.get("/products", {
        params: { category: slug, sort, page, pageSize: 12 },
      });
      setProducts(data.products);
      setTotalPages(data.totalPages);
      setLoading(false);
    }
    load();
  }, [slug, sort, page]);

  const title = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" & ");

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
          <option value="popular">Popularity</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Customer Rating</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-block">Loading products…</div>
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
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? "active" : ""} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
