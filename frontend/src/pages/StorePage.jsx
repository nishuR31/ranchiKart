import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { extractError } from "../lib/api";
import ProductCard from "../components/ProductCard";
import useSEO from "../lib/useSEO";
import { PageLoader, ErrorBlock } from "../components/Loaders";

export default function StorePage() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSEO({
    title: store ? `${store.name} on UrbanRanchi` : "Loading Store…",
    description: store?.description,
    image: store?.bannerUrl || store?.logoUrl,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/stores/${slug}`);
      setStore(data.store ?? data);
    } catch (err) {
      setError(extractError(err, "Store not found"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <PageLoader text="Loading store details…" />;
  if (error || !store) return <div style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}><ErrorBlock message={error || "Store not found"} retry={load} /></div>;

  return (
    <div className="store-page">
      {store.bannerUrl && (
        <div 
          className="store-banner"
          style={{ 
            width: "100%", 
            height: 250, 
            backgroundImage: `url(${store.bannerUrl})`, 
            backgroundSize: "cover", 
            backgroundPosition: "center" 
          }}
        />
      )}
      
      <div className="container" style={{ padding: "40px 20px" }}>
        <div className="store-header" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          {store.logoUrl ? (
            <img 
              src={store.logoUrl} 
              alt={store.name} 
              style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} 
            />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: "50%", backgroundColor: "var(--primary-color)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: "bold" }}>
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              {store.name} 
              {store.isVerified && <span title="Verified Store" style={{ fontSize: 20 }}>✅</span>}
            </h1>
            {store.description && <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{store.description}</p>}
          </div>
        </div>

        <div className="section-header">
          <h2>Products from {store.name}</h2>
        </div>
        
        {store.products?.length > 0 ? (
          <div className="product-grid">
            {store.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>This store doesn't have any products yet.</p>
        )}
      </div>
    </div>
  );
}
