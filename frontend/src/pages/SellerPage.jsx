import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  Store,
} from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import { Skeleton, TableSkeleton } from "../components/Loaders";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";

const PRODUCT_KINDS = [
  "EATABLE", "STATIONERY", "ELECTRONIC", "CLOTHING", "SHOE", "BAG", "ACCESSORY",
  "JEWELLERY", "BEAUTY", "HEALTH", "SPORT", "HOME", "KITCHEN", "GARDEN", "PET",
  "BABY", "TOY", "STAMP", "BOARD", "OTHER"
];
const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SellerPage() {
  const [storeStatus, setStoreStatus] = useState("loading"); // loading, has_store, no_store

  useEffect(() => {
    api.get("/vendor/store")
      .then(() => setStoreStatus("has_store"))
      .catch(() => setStoreStatus("no_store"));
  }, []);

  if (storeStatus === "loading") {
    return (
      <div className="container" style={{ padding: 40 }}>
        <Skeleton width="100%" height={200} />
      </div>
    );
  }

  if (storeStatus === "no_store") {
    return <SellerOnboarding onSuccess={() => setStoreStatus("has_store")} />;
  }

  return <SellerDashboard />;
}

function SellerOnboarding({ onSuccess }) {
  const [form, setForm] = useState({ name: "", description: "", logoUrl: "", bannerUrl: "" });
  const [loading, setLoading] = useState(false);
  const showToast = useShopStore((s) => s.showToast);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/vendor/register", form);
      showToast("Store created successfully! Welcome to the seller dashboard.");
      await fetchUser(); // Reload user to get the new SELLER role
      if (typeof onSuccess === "function") onSuccess();
    } catch (err) {
      showToast(extractError(err, "Failed to register store"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <div className="card" style={{ padding: 30, textAlign: "center" }}>
        <Store size={48} style={{ margin: "0 auto 20px" }} />
        <h2>Become a Seller</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
          Open your store on UrbanRanchi and reach thousands of customers.
        </p>
        <form className="admin-form" onSubmit={handleSubmit} style={{ textAlign: "left" }}>
          <label>Store Name *</label>
          <input required placeholder="e.g. Acme Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          
          <label>Description</label>
          <textarea placeholder="Tell customers about your store..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
          <label>Logo URL</label>
          <input placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          
          <label>Banner URL</label>
          <input placeholder="https://..." value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} />
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 10 }}>
            {loading ? "Registering..." : "Register Store"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SellerDashboard() {
  const [tab, setTab] = useState("dashboard");

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "products", label: "Products", icon: Package },
    { key: "orders", label: "Orders", icon: ClipboardList },
    { key: "settings", label: "Store Settings", icon: Settings },
  ];

  return (
    <div className="admin-page">
      <h1>Seller Dashboard</h1>
      <div className="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === "dashboard" && <OverviewTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function OverviewTab() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/vendor/store")
      .then(({ data }) => setStore(data.store ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton width="100%" height={200} />;

  if (!store) return <p>Could not load store data.</p>;

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card"><span>Total Products</span><strong>{store._count?.products ?? 0}</strong></div>
        <div className="stat-card"><span>Total Orders</span><strong>{store._count?.orders ?? 0}</strong></div>
      </div>
      
      <div className="card" style={{ marginTop: 24, padding: 20 }}>
        <h3>Your Store: {store.name}</h3>
        <p><strong>Status:</strong> {store.isVerified ? "Verified ✅" : "Unverified ⏳"}</p>
        <p><strong>URL Slug:</strong> /store/{store.slug}</p>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", basePrice: "", stock: 50,
    brand: "", categoryId: "", imageUrl: "", kind: "OTHER",
  });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const [storeRes, catRes] = await Promise.all([
        api.get("/vendor/store"),
        api.get("/categories")
      ]);
      setProducts(storeRes.data?.store?.products ?? storeRes.data?.products ?? []);
      const cats = catRes.data?.categories ?? [];
      setCategories(cats);
      if (cats.length > 0) {
        setForm(f => ({ ...f, categoryId: cats[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createProduct(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/vendor/products", {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        basePrice: Math.round(Number(form.basePrice) * 100),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        kind: form.kind,
        imageUrl: form.imageUrl,
        specifications: { brand: form.brand },
      });
      showToast("Product created");
      setShowForm(false);
      setProducts((prev) => [data.product, ...prev]);
      setForm((f) => ({ ...f, name: "", slug: "", description: "", basePrice: "", imageUrl: "" }));
    } catch (err) {
      showToast(extractError(err, "Could not create product"), "error");
    }
  }

  async function deleteProduct(id) {
    try {
      await api.delete(`/vendor/products/${id}`);
      showToast("Product deleted");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast(extractError(err, "Could not delete product"), "error");
    }
  }

  return (
    <div>
      <div className="admin-section-header">
        <h3>Products ({products.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          New Product
        </button>
      </div>

      {showForm && (
        <form className="admin-form" onSubmit={createProduct}>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} />
          <input placeholder="Slug (auto)" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input required type="number" min="0" placeholder="Base Price (₹)" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          <input type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {PRODUCT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <button className="btn btn-primary btn-sm" type="submit">Save Product</button>
        </form>
      )}

      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatINR(p.basePrice)}</td>
                  <td>{p.stock}</td>
                  <td>{p.isActive ? "Yes" : "No"}</td>
                  <td>
                    <button className="icon-btn danger-icon-btn" onClick={() => deleteProduct(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/vendor/orders");
      setOrders(data.orders ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      const { data } = await api.put(`/vendor/orders/${id}/status`, { status });
      showToast("Order status updated");
      if (data.order) setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...data.order } : o));
    } catch (err) {
      showToast(extractError(err, "Could not update status"), "error");
    }
  }

  async function updateTracking(id, trackingId) {
    try {
      const { data } = await api.put(`/vendor/orders/${id}/status`, { trackingId });
      showToast("Tracking ID updated");
      if (data.order) setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...data.order } : o));
    } catch (err) {
      showToast(extractError(err, "Could not update tracking ID"), "error");
    }
  }

  return (
    <div>
      <h3>Orders</h3>
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>StoreOrder ID</th><th>Customer Order ID</th><th>Total</th><th>Tracking ID</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(-8).toUpperCase()}</td>
                  <td>{o.orderId.slice(-8).toUpperCase()}</td>
                  <td>{formatINR(o.total)}</td>
                  <td>
                    <input 
                      type="text" 
                      defaultValue={o.trackingId || ""} 
                      placeholder="Tracking ID"
                      onBlur={(e) => { if (e.target.value !== o.trackingId) updateTracking(o.id, e.target.value); }}
                      style={{ padding: "4px 8px", border: "1px solid var(--border-color)", borderRadius: 4 }}
                    />
                  </td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  useEffect(() => {
    api.get("/vendor/store")
      .then(({ data }) => setStore(data.store ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.put("/vendor/store", {
        name: store.name,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
      });
      showToast("Store settings updated");
      setStore(data.store ?? data);
    } catch (err) {
      showToast(extractError(err, "Could not update settings"), "error");
    }
  }

  if (loading) return <Skeleton width="100%" height={300} />;
  if (!store) return <p>Store not found.</p>;

  return (
    <div>
      <h3>Store Settings</h3>
      <form className="admin-form" style={{ maxWidth: 600 }} onSubmit={handleSubmit}>
        <label>Store Name</label>
        <input required value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
        
        <label>Description</label>
        <textarea value={store.description || ""} onChange={(e) => setStore({ ...store, description: e.target.value })} />
        
        <label>Logo URL</label>
        <input value={store.logoUrl || ""} onChange={(e) => setStore({ ...store, logoUrl: e.target.value })} />
        
        <label>Banner URL</label>
        <input value={store.bannerUrl || ""} onChange={(e) => setStore({ ...store, bannerUrl: e.target.value })} />
        
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
