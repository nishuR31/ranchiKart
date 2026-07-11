import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Tag as TagIcon,
  Trash2,
  Plus,
} from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "coupons", label: "Coupons", icon: TagIcon },
];

const ORDER_STATUSES = ["PLACED", "CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
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
      {tab === "orders" && <OrdersTab />}
      {tab === "coupons" && <CouponsTab />}
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <div className="loading-block">Loading stats…</div>;

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card"><span>Total Revenue</span><strong>{formatINR(stats.revenue)}</strong></div>
        <div className="stat-card"><span>Orders</span><strong>{stats.orderCount}</strong></div>
        <div className="stat-card"><span>Customers</span><strong>{stats.userCount}</strong></div>
        <div className="stat-card"><span>Products</span><strong>{stats.productCount}</strong></div>
      </div>
      <h3>Recent Orders</h3>
      <table className="admin-table">
        <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {stats.recentOrders.map((o) => (
            <tr key={o.id}>
              <td>{o.orderNumber}</td>
              <td>{o.user.name}</td>
              <td>{formatINR(o.total)}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", description: "", price: "", mrp: "", stock: 50,
    brand: "RanchiKart", categoryId: "", images: "", isFeatured: false,
  });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    const [prodRes, catRes] = await Promise.all([api.get("/admin/products"), api.get("/admin/categories")]);
    setProducts(prodRes.data.products);
    setCategories(catRes.data.categories);
    if (!form.categoryId && catRes.data.categories[0]) {
      setForm((f) => ({ ...f, categoryId: catRes.data.categories[0].id }));
    }
  }

  useEffect(() => { load(); }, []);

  async function createProduct(e) {
    e.preventDefault();
    try {
      const images = form.images.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post("/admin/products", { ...form, images });
      showToast("Product created");
      setShowForm(false);
      setForm((f) => ({ ...f, title: "", slug: "", description: "", price: "", mrp: "", images: "" }));
      load();
    } catch (err) {
      showToast(extractError(err, "Could not create product"), "error");
    }
  }

  async function deleteProduct(id) {
    try {
      await api.delete(`/admin/products/${id}`);
      showToast("Product deleted");
      load();
    } catch (err) {
      showToast(extractError(err, "Could not delete product"), "error");
    }
  }

  return (
    <div>
      <div className="admin-section-header">
        <h3>Products ({products.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> New Product
        </button>
      </div>

      {showForm && (
        <form className="admin-form" onSubmit={createProduct}>
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input required placeholder="Slug (unique)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input required type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          <input type="number" placeholder="MRP" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          <input placeholder="Brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
          <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Image URLs, comma-separated" value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
            Featured
          </label>
          <button className="btn btn-primary btn-sm" type="submit">Save Product</button>
        </form>
      )}

      <table className="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.category?.name}</td>
              <td>{formatINR(p.price)}</td>
              <td>{p.stock}</td>
              <td><button className="icon-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", icon: "Package" });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    const { data } = await api.get("/admin/categories");
    setCategories(data.categories);
  }
  useEffect(() => { load(); }, []);

  async function createCategory(e) {
    e.preventDefault();
    try {
      await api.post("/admin/categories", form);
      showToast("Category created");
      setForm({ name: "", slug: "", icon: "Package" });
      load();
    } catch (err) {
      showToast(extractError(err, "Could not create category"), "error");
    }
  }

  async function deleteCategory(id) {
    try {
      await api.delete(`/admin/categories/${id}`);
      showToast("Category deleted");
      load();
    } catch (err) {
      showToast(extractError(err, "Could not delete category (it may still have products)"), "error");
    }
  }

  return (
    <div>
      <h3>Categories</h3>
      <form className="admin-form inline" onSubmit={createCategory}>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input required placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
        <input placeholder="Lucide icon name (e.g. Package)" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
        <button className="btn btn-primary btn-sm" type="submit">Add</button>
      </form>
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
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    const { data } = await api.get("/admin/orders");
    setOrders(data.orders);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      showToast("Order status updated");
      load();
    } catch (err) {
      showToast(extractError(err, "Could not update status"), "error");
    }
  }

  return (
    <div>
      <h3>Orders ({orders.length})</h3>
      <table className="admin-table">
        <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.orderNumber}</td>
              <td>{o.user.name}<br /><small>{o.addressSnapshot.locality}, {o.addressSnapshot.city}</small></td>
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
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", type: "PERCENT", value: 10, minOrder: 0 });
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    const { data } = await api.get("/admin/coupons");
    setCoupons(data.coupons);
  }
  useEffect(() => { load(); }, []);

  async function createCoupon(e) {
    e.preventDefault();
    try {
      await api.post("/admin/coupons", form);
      showToast("Coupon created");
      setForm({ code: "", type: "PERCENT", value: 10, minOrder: 0 });
      load();
    } catch (err) {
      showToast(extractError(err, "Could not create coupon"), "error");
    }
  }

  async function toggleActive(c) {
    await api.put(`/admin/coupons/${c.id}`, { active: !c.active });
    load();
  }

  async function deleteCoupon(id) {
    await api.delete(`/admin/coupons/${id}`);
    load();
  }

  return (
    <div>
      <h3>Coupons</h3>
      <form className="admin-form inline" onSubmit={createCoupon}>
        <input required placeholder="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          <option value="PERCENT">Percent</option>
          <option value="FLAT">Flat (₹)</option>
        </select>
        <input required type="number" placeholder="Value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
        <input type="number" placeholder="Min Order" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} />
        <button className="btn btn-primary btn-sm" type="submit">Add</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.type}</td>
              <td>{c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)}</td>
              <td>{formatINR(c.minOrder)}</td>
              <td><button className="btn btn-outline btn-sm" onClick={() => toggleActive(c)}>{c.active ? "Active" : "Inactive"}</button></td>
              <td><button className="icon-btn" onClick={() => deleteCoupon(c.id)}><Trash2 size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
