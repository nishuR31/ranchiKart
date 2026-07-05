import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Coins, Github, Heart, Instagram, Mail, Menu, Moon,
  Package, Search, ShoppingCart, Store, Sun, Twitter,
  User, X, BarChart3, Zap
} from "lucide-react";
import { api } from "../api/client";
import { useShopStore } from "../store/useShopStore";
import ToastContainer from "./Toast";
import type { Category } from "../types";

export default function Layout() {
  const navigate = useNavigate();
  const { cart, user, wishlistIds, token, theme, toggleTheme } = useShopStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.categories)).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const rootCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const v = query.trim();
    if (v) { navigate(`/search?q=${encodeURIComponent(v)}`); setQuery(""); setMobileMenuOpen(false); }
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const isStaff = user?.role === "ADMIN" || user?.role === "MANAGER";
  const mudraCoins = (user as any)?.mudraCoins ?? 0;

  // Theme-aware classes
  const navBase = `sticky top-0 z-50 transition-all duration-200 border-b`;
  const navScrolled = scrolled
    ? `backdrop-blur-xl ${isDark ? "bg-[#0f0f13]/95 border-white/10 shadow-lg shadow-black/30" : "bg-white/95 border-black/8 shadow-lg shadow-black/10"}`
    : `${isDark ? "bg-[#0f0f13]/80 border-white/5 backdrop-blur-md" : "bg-white/80 border-black/5 backdrop-blur-md"}`;

  const iconBtn = `relative flex items-center justify-center rounded-xl border transition-colors ${
    isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
           : "bg-black/3 border-black/10 text-gray-500 hover:text-gray-900 hover:border-black/20"
  }`;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "text-indigo-500 bg-indigo-500/10"
        : isDark
          ? "text-gray-400 hover:text-white hover:bg-white/5"
          : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
    }`;

  return (
    <div className={`flex flex-col min-h-dvh ${isDark ? "bg-[#0f0f13]" : "bg-[#f5f5fa]"}`}>
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 text-white/90 text-center py-2 px-4 text-xs font-medium">
        <span className="inline-flex items-center gap-2 flex-wrap justify-center">
          <Zap size={11} className="shrink-0" />
          Free shipping on orders above ₹999 · Custom sizes on every product · Pan-India delivery
          <Zap size={11} className="shrink-0" />
        </span>
      </div>

      {/* Navbar */}
      <header className={`${navBase} ${navScrolled}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 h-14">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Store size={15} className="text-white" />
            </div>
            <span className={`font-bold text-base tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
              Mudra<span className="text-indigo-500">Kart</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-3">
            {rootCategories.map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`} className={navLinkClass}>{c.name}</NavLink>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={submitSearch}
            className={`hidden md:flex flex-1 max-w-sm items-center gap-2 rounded-xl px-3 py-2 mx-3 border transition-colors ${
              isDark ? "bg-white/5 border-white/10 focus-within:border-indigo-500/50"
                     : "bg-black/4 border-black/8 focus-within:border-indigo-500/50"
            }`}>
            <Search size={14} className="text-gray-500 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stamps, boards, stationery…"
              className={`flex-1 bg-transparent text-sm outline-none border-0 rounded-none focus:border-0 ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`} />
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* MudraCoins */}
            {user && mudraCoins > 0 && (
              <Link to="/profile"
                className="hidden sm:flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                <Coins size={13} />
                {mudraCoins}
              </Link>
            )}

            {/* Theme toggle */}
            <button onClick={toggleTheme} aria-label="Toggle theme"
              className={`${iconBtn} w-9 h-9`}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Wishlist */}
            <Link to="/wishlist" aria-label="Wishlist" className={`${iconBtn} w-9 h-9`}>
              <Heart size={15} />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlistIds.length}</span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" aria-label={`Cart ${cartCount} items`}
              className={`${iconBtn} flex items-center gap-1.5 px-3 h-9`}>
              <ShoppingCart size={15} />
              <span className="text-xs font-medium hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </Link>

            {/* User */}
            <Link to={user ? "/profile" : "/auth"}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
              <User size={14} />
              <span className="max-w-[72px] truncate hidden sm:inline">{user?.name?.split(" ")[0] ?? "Login"}</span>
            </Link>

            {/* Admin */}
            {isStaff && (
              <Link to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition-colors">
                <BarChart3 size={13} />
                Admin
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button className={`lg:hidden ${iconBtn} w-9 h-9`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-t p-4 space-y-1 ${isDark ? "bg-[#0f0f13] border-white/8" : "bg-white border-black/8"}`}>
            <form onSubmit={submitSearch}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 border ${isDark ? "bg-white/5 border-white/10" : "bg-black/4 border-black/8"}`}>
              <Search size={14} className="text-gray-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
                className={`flex-1 bg-transparent text-sm outline-none border-0 rounded-none focus:border-0 ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`} />
            </form>
            {rootCategories.map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`} className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}>{c.name}</NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet context={{ categories }} />
      </main>

      {/* Footer */}
      <footer className={`border-t mt-auto ${isDark ? "bg-[#09090d] border-white/5" : "bg-white border-black/8"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <Store size={14} className="text-white" />
                </div>
                <span className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
                  Mudra<span className="text-indigo-500">Kart</span>
                </span>
              </div>
              <p className={`text-sm leading-relaxed mb-5 max-w-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Custom stamps, office boards, and stationery made to order. Fast pan-India dispatch.
              </p>
              <div className="flex gap-2.5">
                {[
                  { Icon: Twitter, href: "#", label: "Twitter" },
                  { Icon: Instagram, href: "#", label: "Instagram" },
                  { Icon: Github, href: "#", label: "GitHub" },
                  { Icon: Mail, href: "mailto:hello@mudrakart.in", label: "Email" }
                ].map(({ Icon, href, label }) => (
                  <a key={label} href={href} aria-label={label}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                      isDark ? "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-indigo-500/40"
                             : "bg-black/4 border-black/10 text-gray-500 hover:text-gray-900 hover:border-indigo-500/40"
                    }`}>
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className={`font-semibold text-xs uppercase tracking-widest mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Shop</h4>
              <ul className="space-y-2.5">
                {rootCategories.map((c) => (
                  <li key={c.id}><Link to={`/category/${c.slug}`} className="text-gray-500 hover:text-indigo-500 text-sm transition-colors">{c.name}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`font-semibold text-xs uppercase tracking-widest mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Account</h4>
              <ul className="space-y-2.5">
                {[
                  { to: "/auth", l: "Login / Register" }, { to: "/orders", l: "My Orders" },
                  { to: "/wishlist", l: "Wishlist" }, { to: "/profile", l: "Profile" }, { to: "/cart", l: "Cart" }
                ].map(({ to, l }) => (
                  <li key={to}><Link to={to} className="text-gray-500 hover:text-indigo-500 text-sm transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`font-semibold text-xs uppercase tracking-widest mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Legal</h4>
              <ul className="space-y-2.5">
                {["Terms & Conditions", "Privacy Policy", "Refund Policy"].map((l) => (
                  <li key={l}><Link to="/terms" className="text-gray-500 hover:text-indigo-500 text-sm transition-colors">{l}</Link></li>
                ))}
              </ul>
              <div className={`mt-5 p-3.5 rounded-xl border ${isDark ? "bg-white/3 border-white/8" : "bg-black/3 border-black/8"}`}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Contact</p>
                <p className="text-xs text-gray-500">hello@mudrakart.in</p>
                <p className="text-xs text-gray-500 mt-0.5">Mon–Sat, 10am–6pm IST</p>
              </div>
            </div>
          </div>
        </div>
        <div className={`border-t py-5 ${isDark ? "border-white/5" : "border-black/8"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} MudraKart. All rights reserved.</p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {["🔒 SSL Secure", "📦 Free ship ₹999+", "⚡ Razorpay"].map((t) => (
                <span key={t} className={`text-[10px] text-gray-500 border px-2.5 py-1 rounded-full ${isDark ? "border-white/6" : "border-black/10"}`}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <ToastContainer />
    </div>
  );
}
