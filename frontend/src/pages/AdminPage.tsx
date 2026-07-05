import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle, ChevronLeft,
  ChevronRight, Coins, Edit3, Eye, EyeOff, FileText, Gift, IndianRupee,
  Package, Plus, RefreshCw, Shield, ShoppingBag, Star, Tag, Trash2,
  TrendingUp, TrendingDown, Users, UserX, X, Zap, Ban, UserCheck,
  Clock, Search, Filter
} from "lucide-react";
import { api } from "../api/client";
import { useShopStore } from "../store/useShopStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const money = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const ORDER_STATUSES = ["PENDING_PAYMENT","PAID","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"];
const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  PAID:            "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PROCESSING:      "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  SHIPPED:         "bg-violet-500/15 text-violet-400 border-violet-500/30",
  DELIVERED:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CANCELLED:       "bg-rose-500/15 text-rose-400 border-rose-500/30",
  REFUNDED:        "bg-gray-500/15 text-gray-400 border-gray-500/30"
};
const PIE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#94a3b8"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_COLORS[status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
function RoleBadge({ role }: { role: string }) {
  const cls = role === "ADMIN" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : role === "MANAGER" ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
    : "bg-white/5 text-gray-400 border-white/10";
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cls}`}>{role}</span>;
}
function Card({ title, value, sub, icon: Icon, trend, color = "indigo" }: any) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/20 text-indigo-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
    rose: "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-400"
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <Icon size={18} className={(colors[color] ?? "").split(" ")[3] ?? ""} />
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-[var(--text-1)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{title}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ children, title, action }: { children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          {title && <h3 className="font-bold text-[var(--text-1)] text-sm">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────
function Inp({ label, ...props }: any) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>}
      <input {...props} className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 transition-colors" />
    </div>
  );
}
function Sel({ label, children, ...props }: any) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{label}</label>}
      <select {...props} className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 transition-colors cursor-pointer">
        {children}
      </select>
    </div>
  );
}
function Btn({ children, variant = "primary", size = "sm", ...props }: any) {
  const base = "inline-flex items-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-40 cursor-pointer";
  const sizes: Record<string, string> = { sm: "px-3 h-8 text-xs", md: "px-4 h-9 text-sm", lg: "px-5 h-10 text-sm" };
  const vars: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    secondary: "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)]",
    danger: "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20",
    success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
    warning: "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
  };
  return <button className={`${base} ${sizes[size]} ${vars[variant]}`} {...props}>{children}</button>;
}
function Pager({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  });
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
      <p className="text-xs text-[var(--text-muted)]">Showing {((page-1)*limit)+1}–{Math.min(page*limit,total)} of {total}</p>
      <div className="flex items-center gap-1">
        <Btn variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 1}><ChevronLeft size={12} /></Btn>
        {pages.map((p) => (
          <Btn key={p} variant={p === page ? "primary" : "secondary"} onClick={() => onChange(p)}>{p}</Btn>
        ))}
        <Btn variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= totalPages}><ChevronRight size={12} /></Btn>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "orders" | "products" | "users" | "staff" | "coupons" | "logs";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { token, user, showToast } = useShopStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Search / filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [productModal, setProductModal] = useState<any>(null); // null | {} | existing product
  const [banModal, setBanModal] = useState<any>(null); // { user, action }
  const [banReason, setBanReason] = useState("");

  // Coupon form
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "", description: "", type: "PERCENT", value: "", minOrderAmount: "0",
    maxUses: "", expiresAt: "", categoryId: ""
  });

  useEffect(() => {
    if (!token || !user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
      navigate("/"); return;
    }
    api.getCategories().then((r) => setCategories(r.categories)).catch(console.error);
  }, [token, user, navigate]);

  useEffect(() => { loadTab(tab); }, [tab, page, statusFilter]);

  const loadTab = useCallback(async (t: Tab) => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      if (t === "dashboard") {
        const d = await api.getAdminDashboard(token);
        setDashboard(d);
      } else if (t === "orders") {
        const r = await api.getAdminOrders(token, params);
        setOrders(r.orders); setTotal(r.total);
      } else if (t === "products") {
        const r = await api.getAdminProducts(token, params);
        setProducts(r.products); setTotal(r.total);
      } else if (t === "users") {
        const r = await api.getAdminUsers(token, { ...params, role: "USER" });
        setUsers(r.users); setTotal(r.total);
      } else if (t === "staff") {
        const [admins, managers] = await Promise.all([
          api.getAdminUsers(token, { role: "ADMIN", limit: "50" }),
          api.getAdminUsers(token, { role: "MANAGER", limit: "50" })
        ]);
        setStaff([...admins.users, ...managers.users]);
      } else if (t === "coupons") {
        const r = await api.getAdminCoupons(token);
        setCoupons(r.coupons); setTotal(r.total ?? 0);
      } else if (t === "logs") {
        const r = await api.getAdminLogs(token, params);
        setLogs(r.logs); setTotal(r.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, page, search, statusFilter]);

  function triggerSearch(val: string) {
    setSearch(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadTab(tab), 350);
  }

  async function handleStatusChange(orderId: string, status: string, trackingId?: string) {
    if (!token) return;
    setUpdatingOrder(orderId);
    try {
      await api.updateOrderStatus(orderId, { status, trackingId }, token);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      showToast({ type: "success", title: "Status updated" });
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
    finally { setUpdatingOrder(null); }
  }

  async function handleToggleProduct(productId: string) {
    if (!token) return;
    try {
      const r = await api.toggleProductActive(productId, token);
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, isActive: r.product.isActive } : p));
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }
  async function handleToggleFeatured(productId: string) {
    if (!token) return;
    try {
      const r = await api.toggleProductFeatured(productId, token);
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, isFeatured: r.product.isFeatured } : p));
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }
  async function handleUserRoleChange(userId: string, newRole: string) {
    if (!token) return;
    try {
      await api.updateUserRole(userId, newRole, token);
      setStaff((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      showToast({ type: "success", title: "Role updated" });
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }
  async function handleBanUser() {
    if (!token || !banModal) return;
    try {
      const r = await api.banUser(banModal.user.id, { isBanned: !banModal.user.isBanned, banReason: banReason || undefined }, token);
      setUsers((prev) => prev.map((u) => u.id === banModal.user.id ? { ...u, ...r.user } : u));
      showToast({ type: "success", title: banModal.user.isBanned ? "User unbanned" : "User banned" });
      setBanModal(null); setBanReason("");
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }
  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      const body: any = {
        code: couponForm.code, description: couponForm.description || undefined,
        type: couponForm.type, value: Number(couponForm.value),
        minOrderAmount: Number(couponForm.minOrderAmount) * 100,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
        expiresAt: couponForm.expiresAt || undefined,
        categoryId: couponForm.categoryId || undefined
      };
      await api.createAdminCoupon(body, token);
      showToast({ type: "success", title: "Coupon created!" });
      setShowCouponForm(false);
      setCouponForm({ code: "", description: "", type: "PERCENT", value: "", minOrderAmount: "0", maxUses: "", expiresAt: "", categoryId: "" });
      loadTab("coupons");
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }
  async function handleDeleteCoupon(id: string) {
    if (!token || !confirm("Delete this coupon?")) return;
    try {
      await api.deleteAdminCoupon(id, token);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast({ type: "success", title: "Coupon deleted" });
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !productModal) return;
    try {
      const form = productModal;
      const body = {
        name: form.name, description: form.description,
        basePrice: Math.round(Number(form.basePrice) * 100),
        stock: Number(form.stock) || 100,
        imageUrl: form.imageUrl, dispatchDays: Number(form.dispatchDays) || 3,
        tags: typeof form.tags === "string" ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : form.tags,
        highlights: typeof form.highlights === "string" ? form.highlights.split("\n").map((h: string) => h.trim()).filter(Boolean) : form.highlights,
        isFeatured: form.isFeatured ?? false
      };
      if (form.id) {
        await api.updateAdminProduct(form.id, body, token);
        showToast({ type: "success", title: "Product updated!" });
        setProducts((prev) => prev.map((p) => p.id === form.id ? { ...p, ...body } : p));
      } else {
        const fullBody = { ...body, categoryId: form.categoryId, slug: form.slug, kind: form.kind, specifications: {} };
        const r = await api.createAdminProduct(fullBody, token);
        showToast({ type: "success", title: "Product created!" });
        setProducts((prev) => [r.product, ...prev]);
      }
      setProductModal(null);
    } catch (e: any) { showToast({ type: "error", title: e.message }); }
  }

  const isAdmin = user?.role === "ADMIN";
  const TABS: { key: Tab; label: string; icon: typeof BarChart3; adminOnly: boolean }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3, adminOnly: false },
    { key: "orders", label: "Orders", icon: ShoppingBag, adminOnly: false },
    { key: "products", label: "Products", icon: Package, adminOnly: false },
    { key: "users", label: "Users", icon: Users, adminOnly: false },
    { key: "staff", label: "Staff", icon: Shield, adminOnly: true },
    { key: "coupons", label: "Coupons", icon: Tag, adminOnly: true },
    { key: "logs", label: "Audit Log", icon: FileText, adminOnly: false }
  ];

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-0.5">Admin</p>
          <h1 className="text-2xl font-black text-[var(--text-1)]">Control Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={user?.role ?? ""} />
          <Btn variant="secondary" onClick={() => { setPage(1); loadTab(tab); }}><RefreshCw size={12} /> Refresh</Btn>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-6 bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-1">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setPage(1); setSearch(""); setStatusFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)]"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && dashboard && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <Card icon={IndianRupee} title="Total Revenue" value={money(dashboard.stats.totalRevenue)} color="emerald" />
            <Card icon={ShoppingBag} title="Total Orders" value={dashboard.stats.totalOrders} sub={`${dashboard.stats.monthlyOrders} this month`} color="indigo" trend={dashboard.stats.monthGrowth} />
            <Card icon={Users} title="Total Users" value={dashboard.stats.totalUsers} color="violet" />
            <Card icon={Package} title="Active Products" value={dashboard.stats.totalProducts} color="amber" />
            <Card icon={Activity} title="Month Growth" value={`${dashboard.stats.monthGrowth}%`} color={dashboard.stats.monthGrowth >= 0 ? "emerald" : "rose"} trend={dashboard.stats.monthGrowth} />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Revenue Chart */}
            <div className="lg:col-span-2">
              <Section title="Revenue – Last 30 Days">
                <div className="p-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboard.revenueChart}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v/100).toLocaleString("en-IN")}`} width={60} />
                      <Tooltip
                        contentStyle={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                        formatter={(v: any) => [money(v), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            {/* Order Status Pie */}
            <Section title="Order Status Breakdown">
              <div className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dashboard.statusBreakdown.map((s: any) => ({ name: s.status.replace(/_/g,"  "), value: s._count.status }))}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {dashboard.statusBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>

          {/* Top products + Recent orders side by side */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Section title="Top Products by Revenue">
              <div className="divide-y divide-[var(--border)]">
                {dashboard.topProducts.map((item: any, i: number) => (
                  <div key={item.productId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[10px] font-black text-[var(--text-muted)] w-4">{i + 1}</span>
                    <img src={item.product?.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-[var(--surface-2)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-1)] truncate">{item.product?.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{item._sum.quantity} units sold</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-400">{money(item._sum.total ?? 0)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Recent Orders">
              <div className="divide-y divide-[var(--border)]">
                {dashboard.recentOrders.slice(0, 6).map((order: any) => (
                  <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-1)]">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{order.user.name} · {fmtDate(order.createdAt)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                    <span className="text-xs font-bold text-indigo-400 ml-2">{money(order.total)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <Section title="Orders" action={
          <div className="flex gap-2">
            <Sel value={statusFilter} onChange={(e: any) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </Sel>
          </div>
        }>
          {loading ? <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading…</div> : (
            <div className="divide-y divide-[var(--border)]">
              {orders.map((order) => (
                <div key={order.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-1)]">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{order.user.name} · {order.user.email}</p>
                    </div>
                    <StatusBadge status={order.status} />
                    <span className="ml-auto text-sm font-bold text-indigo-400">{money(order.total)}</span>
                    <p className="text-[10px] text-[var(--text-muted)]">{fmtDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Sel value={order.status} onChange={(e: any) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingOrder === order.id}>
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </Sel>
                    {updatingOrder === order.id && <span className="text-xs text-[var(--text-muted)] animate-pulse">Updating…</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Section>
      )}

      {/* ── PRODUCTS ── */}
      {tab === "products" && (
        <Section title="Products" action={
          isAdmin && <Btn variant="primary" onClick={() => setProductModal({ name: "", description: "", basePrice: "", stock: "100", imageUrl: "", dispatchDays: "3", tags: "", highlights: "", categoryId: "", slug: "", kind: "STAMP" })}>
            <Plus size={13} /> Add Product
          </Btn>
        }>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={search} onChange={(e) => triggerSearch(e.target.value)} placeholder="Search products…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50" />
              </div>
            </div>
          </div>
          {loading ? <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading…</div> : (
            <div className="divide-y divide-[var(--border)]">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-[var(--surface-2)] shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{money(p.basePrice)} · Stock: {p.stock} · ⭐ {p.rating}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"}`}>
                      {p.isActive ? "Active" : "Hidden"}
                    </span>
                    {p.isFeatured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Featured</span>}
                    {isAdmin && <Btn variant="secondary" onClick={() => setProductModal({ ...p, tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags, highlights: Array.isArray(p.highlights) ? p.highlights.join("\n") : p.highlights, basePrice: (p.basePrice / 100).toString() })}><Edit3 size={11} /></Btn>}
                    <Btn variant={p.isActive ? "danger" : "success"} onClick={() => handleToggleProduct(p.id)}>
                      {p.isActive ? <EyeOff size={11} /> : <Eye size={11} />}
                    </Btn>
                    <Btn variant={p.isFeatured ? "warning" : "secondary"} onClick={() => handleToggleFeatured(p.id)}>
                      <Star size={11} />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Section>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <Section title="Users (Customers)" action={
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={(e) => triggerSearch(e.target.value)} placeholder="Search users…"
              className="h-8 pl-8 pr-3 rounded-xl text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50" />
          </div>
        }>
          {loading ? <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading…</div> : (
            <div className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)]">{u.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{u.email} · {u._count.orders} orders</p>
                    {u.mudraCoins > 0 && <p className="text-[10px] text-amber-400">🪙 {u.mudraCoins} MudraCoins</p>}
                  </div>
                  {u.isBanned && <span className="text-[10px] px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">BANNED</span>}
                  <p className="text-[10px] text-[var(--text-muted)]">{fmtDate(u.createdAt)}</p>
                  {isAdmin && (
                    <Btn variant={u.isBanned ? "success" : "danger"}
                      onClick={() => { setBanModal({ user: u }); setBanReason(""); }}>
                      {u.isBanned ? <><UserCheck size={11} /> Unban</> : <><Ban size={11} /> Ban</>}
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Section>
      )}

      {/* ── STAFF ── */}
      {tab === "staff" && isAdmin && (
        <Section title="Staff Members (Admins & Managers)">
          <div className="divide-y divide-[var(--border)]">
            {staff.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${u.role === "ADMIN" ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-violet-500 to-indigo-600"}`}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{u.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
                <p className="text-[10px] text-[var(--text-muted)]">Since {fmtDate(u.createdAt)}</p>
                {u.id !== user?.id && (
                  <Sel value={u.role} onChange={(e: any) => handleUserRoleChange(u.id, e.target.value)}>
                    <option value="USER">Demote to User</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </Sel>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── COUPONS ── */}
      {tab === "coupons" && isAdmin && (
        <div className="space-y-4">
          {showCouponForm && (
            <Section title="Create Coupon" action={<Btn variant="danger" onClick={() => setShowCouponForm(false)}><X size={12} /> Close</Btn>}>
              <form onSubmit={handleCreateCoupon} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                <Inp label="Coupon Code *" value={couponForm.code} onChange={(e: any) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" required />
                <Inp label="Description" value={couponForm.description} onChange={(e: any) => setCouponForm((p) => ({ ...p, description: e.target.value }))} placeholder="20% off on all stamps" />
                <Sel label="Type" value={couponForm.type} onChange={(e: any) => setCouponForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </Sel>
                <Inp label={couponForm.type === "PERCENT" ? "Discount %" : "Discount ₹"} type="number" min="1" value={couponForm.value} onChange={(e: any) => setCouponForm((p) => ({ ...p, value: e.target.value }))} required />
                <Inp label="Min Order Amount (₹)" type="number" min="0" value={couponForm.minOrderAmount} onChange={(e: any) => setCouponForm((p) => ({ ...p, minOrderAmount: e.target.value }))} />
                <Inp label="Max Uses (blank = unlimited)" type="number" min="1" value={couponForm.maxUses} onChange={(e: any) => setCouponForm((p) => ({ ...p, maxUses: e.target.value }))} />
                <Sel label="Category (blank = all categories)" value={couponForm.categoryId} onChange={(e: any) => setCouponForm((p) => ({ ...p, categoryId: e.target.value }))}>
                  <option value="">All Categories</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Expiry Date & Time</label>
                  <input type="datetime-local" value={couponForm.expiresAt} onChange={(e) => setCouponForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                  <Btn variant="primary" size="md" type="submit"><Plus size={13} /> Create Coupon</Btn>
                </div>
              </form>
            </Section>
          )}

          <Section title="Coupons" action={!showCouponForm && <Btn variant="primary" onClick={() => setShowCouponForm(true)}><Plus size={12} /> New Coupon</Btn>}>
            <div className="divide-y divide-[var(--border)]">
              {coupons.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-[var(--text-1)] font-mono">{c.code}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"}`}>
                        {c.isActive ? "Active" : "Disabled"}
                      </span>
                      {c.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{c.category.name} only</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {c.type === "PERCENT" ? `${c.value}% off` : `₹${c.value / 100} off`}
                      {c.minOrderAmount > 0 ? ` · min ₹${c.minOrderAmount / 100}` : ""}
                      {c.maxUses ? ` · ${c.usedCount}/${c.maxUses} uses` : ` · ${c.usedCount} uses`}
                      {c.expiresAt ? ` · expires ${fmtDateTime(c.expiresAt)}` : ""}
                    </p>
                  </div>
                  <Btn variant="danger" onClick={() => handleDeleteCoupon(c.id)}><Trash2 size={11} /></Btn>
                </div>
              ))}
              {coupons.length === 0 && <div className="p-8 text-center text-[var(--text-muted)] text-sm">No coupons yet</div>}
            </div>
          </Section>
        </div>
      )}

      {/* ── AUDIT LOGS ── */}
      {tab === "logs" && (
        <Section title="Audit Log" action={
          <div className="flex gap-2">
            <Inp value={search} onChange={(e: any) => triggerSearch(e.target.value)} placeholder="Filter action…" />
          </div>
        }>
          {loading ? <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading…</div> : (
            <div className="divide-y divide-[var(--border)]">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                    <Activity size={13} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-1)]">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {log.entity} · by {log.admin?.name ?? "system"} · {log.admin?.role}
                    </p>
                    {log.meta && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono truncate">{JSON.stringify(log.meta)}</p>}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtDateTime(log.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={total} limit={LIMIT} onChange={setPage} />
        </Section>
      )}

      {/* ── PRODUCT MODAL ── */}
      {productModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-1)]">{productModal.id ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setProductModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 grid sm:grid-cols-2 gap-4">
              <Inp label="Product Name *" value={productModal.name} onChange={(e: any) => setProductModal((p: any) => ({ ...p, name: e.target.value }))} required />
              <Inp label="Image URL *" value={productModal.imageUrl} onChange={(e: any) => setProductModal((p: any) => ({ ...p, imageUrl: e.target.value }))} required />
              <Inp label="Base Price (₹) *" type="number" min="1" step="0.01" value={productModal.basePrice} onChange={(e: any) => setProductModal((p: any) => ({ ...p, basePrice: e.target.value }))} required />
              <Inp label="Stock" type="number" min="0" value={productModal.stock} onChange={(e: any) => setProductModal((p: any) => ({ ...p, stock: e.target.value }))} />
              <Inp label="Dispatch Days" type="number" min="1" value={productModal.dispatchDays} onChange={(e: any) => setProductModal((p: any) => ({ ...p, dispatchDays: e.target.value }))} />
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="featured" checked={!!productModal.isFeatured} onChange={(e) => setProductModal((p: any) => ({ ...p, isFeatured: e.target.checked }))} className="rounded" />
                <label htmlFor="featured" className="text-sm text-[var(--text-2)]">Featured product</label>
              </div>

              {!productModal.id && (
                <>
                  <Inp label="URL Slug *" value={productModal.slug} onChange={(e: any) => setProductModal((p: any) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} required />
                  <Sel label="Category *" value={productModal.categoryId} onChange={(e: any) => setProductModal((p: any) => ({ ...p, categoryId: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Sel>
                  <Sel label="Kind *" value={productModal.kind} onChange={(e: any) => setProductModal((p: any) => ({ ...p, kind: e.target.value }))}>
                    <option value="STAMP">Stamp</option>
                    <option value="BOARD">Board</option>
                    <option value="STATIONERY">Stationery</option>
                  </Sel>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Description *</label>
                <textarea value={productModal.description} onChange={(e) => setProductModal((p: any) => ({ ...p, description: e.target.value }))} required rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tags (comma separated)</label>
                <input value={productModal.tags} onChange={(e) => setProductModal((p: any) => ({ ...p, tags: e.target.value }))}
                  placeholder="rubber, custom, office"
                  className="w-full h-9 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Highlights (one per line)</label>
                <textarea value={productModal.highlights} onChange={(e) => setProductModal((p: any) => ({ ...p, highlights: e.target.value }))} rows={3}
                  placeholder={"Custom text & logo\nBulk discounts available\nFast dispatch"}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-indigo-500/50 resize-none" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <Btn variant="secondary" size="md" type="button" onClick={() => setProductModal(null)}>Cancel</Btn>
                <Btn variant="primary" size="md" type="submit">{productModal.id ? "Update Product" : "Create Product"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BAN MODAL ── */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${banModal.user.isBanned ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                {banModal.user.isBanned ? <UserCheck size={20} className="text-emerald-400" /> : <Ban size={20} className="text-rose-400" />}
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-1)]">{banModal.user.isBanned ? "Unban User" : "Ban User"}</h3>
                <p className="text-xs text-[var(--text-muted)]">{banModal.user.name} · {banModal.user.email}</p>
              </div>
            </div>
            {!banModal.user.isBanned && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Ban Reason (optional)</label>
                <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} placeholder="Describe the reason for banning this user…"
                  className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-rose-500/50 resize-none" />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" size="md" onClick={() => setBanModal(null)}>Cancel</Btn>
              <Btn variant={banModal.user.isBanned ? "success" : "danger"} size="md" onClick={handleBanUser}>
                {banModal.user.isBanned ? "Yes, Unban" : "Yes, Ban User"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
