import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Tag as TagIcon,
  Trash2,
  Plus,
  Users,
  Star,
  Store,
} from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR, formatCompactINR } from "../lib/money";
import { Skeleton, TableSkeleton } from "../components/Loaders";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";

// Correct enum values from API spec
const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

const PRODUCT_KINDS = [
  "EATABLE", "STATIONERY", "ELECTRONIC", "CLOTHING", "SHOE", "BAG", "ACCESSORY",
  "JEWELLERY", "BEAUTY", "HEALTH", "SPORT", "HOME", "KITCHEN", "GARDEN", "PET",
  "BABY", "TOY", "STAMP", "BOARD", "OTHER"
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asList(payload, key) {
  return payload?.[key] ?? payload ?? [];
}

export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");
  const user = useAuthStore((s) => s.user);

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "products", label: "Products", icon: Package },
    { key: "categories", label: "Categories", icon: FolderTree },
    { key: "orders", label: "Orders", icon: ClipboardList },
    { key: "coupons", label: "Coupons", icon: TagIcon },
    { key: "stores", label: "Stores", icon: Store },
    ...(user?.role === "ADMIN" ? [{ key: "users", label: "Users", icon: Users }] : []),
  ];

  return (
    <div className="admin-page">
      <h1>{user?.role === "MANAGER" ? "Manager" : "Admin"} Dashboard</h1>
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
      {tab === "dashboard" && <DashboardTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      { tab === "orders" && <OrdersTab /> }
      { tab === "coupons" && <CouponsTab /> }
      { tab === "stores" && <StoresTab /> }
      { tab === "users" && user?.role === "ADMIN" && <UsersTab /> }
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
// Correct endpoint: GET /admin/dashboard (not /admin/stats)
function DashboardTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  if (!stats) return (
    <div>
      <div className="stat-cards">
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
      </div>
      <div style={{marginTop: 24}}>
        <Skeleton width={150} height={24} style={{marginBottom: 16}} />
        <Skeleton width="100%" height={200} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card"><span>Total Revenue</span><strong>{formatCompactINR(stats.stats?.totalRevenue ?? 0)}</strong></div>
        <div className="stat-card"><span>Orders</span><strong>{stats.stats?.totalOrders ?? 0}</strong></div>
        <div className="stat-card"><span>Customers</span><strong>{stats.stats?.totalUsers ?? 0}</strong></div>
        <div className="stat-card"><span>Products</span><strong>{stats.stats?.totalProducts ?? 0}</strong></div>
      </div>
      {stats.recentOrders?.length > 0 && (
        <>
          <h3>Recent Orders</h3>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(-8).toUpperCase()}</td>
                  <td>{o.user?.name ?? o.userName}</td>
                  <td>{formatINR(o.total)}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

// ── Products ──────────────────────────────────────────────────────────────
// GET /admin/products   POST /admin/products
// PATCH /admin/products/:id/toggle  (activate/deactivate)
// PATCH /admin/products/:id/featured
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", basePrice: "", stock: 50,
    brand: "UrbanRanchi", categoryId: "", imageUrl: "", isFeatured: false, kind: "OTHER",
  });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/admin/products", { params: { limit: 50 } }),
        api.get("/categories"),        // public endpoint for categories list
      ]);
      // prodRes.data = { products: [...], total, page, limit }
      setProducts(asList(prodRes.data, "products"));
      const cats = catRes.data.categories ?? catRes.data ?? [];
      setCategories(cats);
      if (!form.categoryId && cats[0]) {
        setForm((f) => ({ ...f, categoryId: cats[0].id }));
      }
    } catch (err) {
      console.error("Failed to load products/categories", err);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createProduct(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/products", {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        basePrice: Math.round(Number(form.basePrice) * 100),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        kind: form.kind,
        imageUrl: form.imageUrl,
        isFeatured: form.isFeatured,
        specifications: { brand: form.brand },
      });
      showToast("Product created");
      setShowForm(false);
      setForm((f) => ({ ...f, name: "", slug: "", description: "", basePrice: "", imageUrl: "" }));
      if (data.product) setProducts((prev) => [data.product, ...prev]);
    } catch (err) {
      showToast(extractError(err, "Could not create product"), "error");
    }
  }

  async function toggleProduct(id) {
    try {
      const { data } = await api.patch(`/admin/products/${id}/toggle`);
      showToast("Product status toggled");
      if (data.product) setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...data.product } : p));
    } catch (err) {
      showToast(extractError(err, "Could not toggle product"), "error");
    }
  }

  async function toggleFeatured(id) {
    try {
      const { data } = await api.patch(`/admin/products/${id}/featured`);
      showToast("Featured status toggled");
      if (data.product) setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...data.product } : p));
    } catch (err) {
      showToast(extractError(err, "Could not update featured"), "error");
    }
  }

  async function deleteProduct(id) {
    try {
      await api.delete(`/admin/products/${id}`);
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
        {useAuthStore.getState().user?.role === "ADMIN" && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> New Product
          </button>
        )}
      </div>

      {showForm && (
        <form className="admin-form" onSubmit={createProduct}>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug ? f.slug : slugify(e.target.value) }))} />
          <input placeholder="Slug (auto-generated if blank)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input required type="number" min="0" placeholder="Base Price (₹)" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
          <input type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          <input placeholder="Brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
          <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            {PRODUCT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
            Featured
          </label>
          <button className="btn btn-primary btn-sm" type="submit">Save Product</button>
        </form>
      )}
      {loading ? <TableSkeleton /> :

      <div className="table-wrapper">
          <table className="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th>Featured</th><th></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category?.name}</td>
              <td>{formatINR(p.basePrice)}</td>
              <td>{p.stock}</td>
              <td>
                <button className={`btn btn-sm ${p.isActive ? "btn-outline" : ""}`} onClick={() => toggleProduct(p.id)}>
                  {p.isActive ? "Active" : "Inactive"}
                </button>
              </td>
              <td>
                <button className="btn btn-outline btn-sm" onClick={() => toggleFeatured(p.id)}>
                  <Star
                    size={16}
                    className={`featured-star ${p.isFeatured ? "active" : ""}`}
                    fill={p.isFeatured ? "currentColor" : "none"}
                  />
                </button>
              </td>
              <td>
                {useAuthStore.getState().user?.role === "ADMIN" && (
                  <button className="icon-btn danger-icon-btn" onClick={() => deleteProduct(p.id)} title="Delete product">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      }
    </div>
  );
}

// ── Categories ─────────────────────────────────────────────────────────────
// POST /admin/categories   PUT /admin/categories/:id   DELETE /admin/categories/:id
// GET /categories  (public)
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", description: "", imageUrl: "", kind: "OTHER" });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/categories");
      setCategories(data.categories ?? data ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function createCategory(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/categories", {
        ...form,
        slug: form.slug || slugify(form.name),
      });
      showToast("Category created");
      setForm({ name: "", slug: "", description: "", imageUrl: "", kind: "OTHER" });
      if (data.category) setCategories((prev) => [data.category, ...prev]);
    } catch (err) {
      showToast(extractError(err, "Could not create category"), "error");
    }
  }

  async function deleteCategory(id) {
    try {
      await api.delete(`/admin/categories/${id}`);
      showToast("Category deleted");
      await load();
    } catch (err) {
      if (err?.response?.status === 404) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        showToast("Category was already deleted");
        return;
      }
      showToast(extractError(err, "Could not delete category"), "error");
    }
  }

  return (
    <div>
      <h3>Categories</h3>
      {useAuthStore.getState().user?.role === "ADMIN" && (
        <form className="admin-form inline" onSubmit={createCategory}>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug ? f.slug : slugify(e.target.value) }))} />
          <input placeholder="Slug (auto)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
          <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            {PRODUCT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" type="submit">Add</button>
        </form>
      )}
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td><button className="icon-btn" onClick={() => deleteCategory(c.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Orders ─────────────────────────────────────────────────────────────────
// GET /admin/orders   PUT /admin/orders/:id/status
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", { params: { limit: 50 } });
      setOrders(asList(data, "orders"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      const { data } = await api.put(`/admin/orders/${id}/status`, { status });
      showToast("Order status updated");
      if (data.order) setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...data.order } : o));
    } catch (err) {
      showToast(extractError(err, "Could not update status"), "error");
    }
  }

  return (
    <div>
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(-8).toUpperCase()}</td>
                  <td>{o.user?.name}<br /><small>{o.address?.line1}, {o.address?.city}</small></td>
                  <td>{formatINR(o.total)}</td>
                  <td>{o.paymentMethod} · {o.paymentStatus}</td>
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

// ── Coupons ────────────────────────────────────────────────────────────────
// GET /admin/coupons   POST /admin/coupons
// PUT /admin/coupons/:id  (update, incl. isActive)   DELETE /admin/coupons/:id
function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  // type must be "PERCENT" or "FIXED" (not "FLAT")
  const [form, setForm] = useState({ code: "", type: "PERCENT", value: 10, minOrderAmount: 0 });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/coupons", { params: { limit: 50 } });
      setCoupons(asList(data, "coupons"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function createCoupon(e) {
    e.preventDefault();
    if (form.type === "PERCENT" && Number(form.value) > 100) {
      showToast("Percent coupons cannot be more than 100%.", "error");
      setForm((f) => ({ ...f, value: 100 }));
      return;
    }
    try {
      const { data } = await api.post("/admin/coupons", {
        ...form,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount),
      });
      showToast("Coupon created");
      setForm({ code: "", type: "PERCENT", value: 10, minOrderAmount: 0 });
      if (data.coupon) setCoupons((prev) => [data.coupon, ...prev]);
    } catch (err) {
      showToast(extractError(err, "Could not create coupon"), "error");
    }
  }

  // Use PUT /admin/coupons/:id  with isActive field (not `active`)
  async function toggleActive(c) {
    try {
      const { data } = await api.put(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      if (data.coupon) setCoupons((prev) => prev.map((item) => item.id === c.id ? { ...item, ...data.coupon } : item));
    } catch (err) {
      showToast(extractError(err, "Could not toggle coupon"), "error");
    }
  }

  async function deleteCoupon(id) {
    try {
      await api.delete(`/admin/coupons/${id}`);
      showToast("Coupon deleted");
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast(extractError(err, "Could not delete coupon"), "error");
    }
  }

  return (
    <div>
      <h3>Coupons</h3>
      {useAuthStore.getState().user?.role === "ADMIN" && (
        <form className="admin-form inline" onSubmit={createCoupon}>
          <input required placeholder="Code (e.g. RANCHI10)" value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, value: e.target.value === "PERCENT" ? Math.min(100, Number(f.value || 1)) : f.value }))}>
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed (₹)</option>
          </select>
          <input required type="number" min="1" max={form.type === "PERCENT" ? 100 : undefined} placeholder={form.type === "PERCENT" ? "Percent (max 100)" : "Fixed amount"}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: f.type === "PERCENT" ? Math.min(100, Number(e.target.value || 0)) : e.target.value }))} />
          <input type="number" min="0" placeholder="Min Order Amount" value={form.minOrderAmount}
            onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))} />
          <button className="btn btn-primary btn-sm" type="submit">Add</button>
        </form>
      )}
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.type}</td>
                  <td>{c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)}</td>
                  <td>{c.minOrderAmount > 0 ? formatINR(c.minOrderAmount) : "—"}</td>
                  <td>
                    <button className={`btn btn-sm ${c.isActive ? "btn-primary" : "btn-outline"}`}
                      onClick={() => toggleActive(c)}>
                      {c.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td><button className="icon-btn" onClick={() => deleteCoupon(c.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────
// GET /admin/users   PATCH /admin/users/:id/ban   PATCH /admin/users/:id/role
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", { params: { limit: 100 } });
      setUsers(asList(data, "users"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function banUser(id, isBanned) {
    try {
      const { data } = await api.patch(`/admin/users/${id}/ban`, { isBanned });
      showToast(isBanned ? "User banned" : "User unbanned");
      if (data.user) setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data.user } : u));
    } catch (err) {
      showToast(extractError(err, "Could not update user"), "error");
    }
  }

  async function changeRole(id, role) {
    try {
      const { data } = await api.patch(`/admin/users/${id}/role`, { role });
      showToast("Role updated");
      if (data.user) setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data.user } : u));
    } catch (err) {
      showToast(extractError(err, "Could not change role"), "error");
    }
  }

  async function forceDeleteUser(id) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      showToast("Click delete again to permanently remove this user.", "info");
      window.setTimeout(() => {
        setPendingDeleteId((current) => (current === id ? null : current));
      }, 5000);
      return;
    }
    try {
      await api.delete(`/admin/users/${id}/force`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setPendingDeleteId(null);
      showToast("User permanently deleted");
    } catch (err) {
      showToast(extractError(err, "Could not delete user"), "error");
    }
  }

  return (
    <div>
      <h3>Users ({users.length})</h3>
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Banned</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="USER">USER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>{u.isBanned ? "Yes" : "No"}</td>
                  <td className="admin-action-cell">
                    <button className="btn btn-outline btn-sm" onClick={() => banUser(u.id, !u.isBanned)}>
                      {u.isBanned ? "Unban" : "Ban"}
                    </button>
                    <button className={`icon-btn danger-icon-btn ${pendingDeleteId === u.id ? "armed" : ""}`} onClick={() => forceDeleteUser(u.id)} title={pendingDeleteId === u.id ? "Click again to confirm" : "Force delete user"}>
                      <Trash2 size={16} />
                    </button>
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

// ── Stores ──────────────────────────────────────────────────────────────────
function StoresTab() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/stores");
      setStores(asList(data, "stores") || data);
    } catch (err) {
      console.error(err);
      showToast("Could not load stores", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function verifyStore(id, isVerified) {
    try {
      const { data } = await api.patch(`/admin/stores/${id}/verify`, { isVerified });
      showToast("Store verification updated");
      if (data.store) setStores((prev) => prev.map((s) => s.id === id ? { ...s, ...data.store } : s));
    } catch (err) {
      showToast(extractError(err, "Could not update store"), "error");
    }
  }

  async function deleteStore(id) {
    useShopStore.getState().showConfirmToast(
      "Are you sure you want to delete this store and all its products?",
      async () => {
        try {
          await api.delete(`/admin/stores/${id}`);
          showToast("Store deleted");
          setStores((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
          showToast(extractError(err, "Could not delete store"), "error");
        }
      }
    );
  }

  return (
    <div>
      <div className="admin-section-header">
        <h3>Stores ({stores.length})</h3>
      </div>
      {loading ? <TableSkeleton /> : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Store Name</th><th>Owner</th><th>Products</th><th>Orders</th><th>Verified</th><th></th></tr></thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong><br />
                    <small>{s.slug}</small>
                  </td>
                  <td>
                    {s.owner?.name}<br />
                    <small>{s.owner?.email}</small>
                  </td>
                  <td>{s._count?.products || 0}</td>
                  <td>{s._count?.orders || 0}</td>
                  <td>
                    <button className={`btn btn-sm ${s.isVerified ? "btn-primary" : "btn-outline"}`}
                      onClick={() => verifyStore(s.id, !s.isVerified)}>
                      {s.isVerified ? "Yes" : "No"}
                    </button>
                  </td>
                  <td>
                    {user?.role === "ADMIN" && (
                      <button className="icon-btn danger-icon-btn" onClick={() => deleteStore(s.id)} title="Delete Store">
                        <Trash2 size={16} />
                      </button>
                    )}
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
