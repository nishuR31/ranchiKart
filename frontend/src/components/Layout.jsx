import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Sun,
  Moon,
  MapPin,
  Menu,
  X,
  LogOut,
  PackageCheck,
  LayoutDashboard,
  ChevronDown,
  Settings,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import Toast from "./Toast";
import api from "../lib/api";
import pkg from "../../package.json";

// ── Filter out test/dummy categories (names containing 7+ consecutive digits) ──
function isRealCategory(cat) {
  return !/\d{7,}/.test(cat.name ?? "");
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore();
  const { cart, fetchCart, wishlist, fetchWishlist, darkMode, toggleDarkMode, showToast } = useShopStore();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [topCategories, setTopCategories] = useState([]);
  const navigate = useNavigate();
  const closeTimerRef = useRef(null);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchWishlist();
    }
  }, [user]);

  // Load top-level categories for the nav strip
  useEffect(() => {
    api.get("/categories")
      .then(({ data }) => {
        const all = data.categories ?? data ?? [];
        const top = all
          .filter((c) => !c.parentId && isRealCategory(c))
          .slice(0, 12);
        setTopCategories(top);
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside on mobile
  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleOutsideClick(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [accountMenuOpen]);

  function handleMouseEnterMenu() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setAccountMenuOpen(true);
  }

  function handleMouseLeaveMenu() {
    closeTimerRef.current = setTimeout(() => setAccountMenuOpen(false), 180);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleLogout() {
    logout();
    setAccountMenuOpen(false);
    showToast("You have been logged out.");
    navigate("/");
  }

  const NAV_CATS = topCategories.length > 0
    ? topCategories
    : [
        { slug: "electronics", name: "Electronics" },
        { slug: "fashion", name: "Fashion & Apparel" },
        { slug: "grocery", name: "Grocery & Gourmet Foods" },
        { slug: "home-kitchen", name: "Home Decor" },
        { slug: "beauty", name: "Beauty & Personal Care" },
        { slug: "books-stationery", name: "Books & Stationery" },
        { slug: "sports-fitness", name: "Sports & Fitness" },
        { slug: "mobiles", name: "Electronics & Gadgets" },
      ];

  return (
    <div className="app-shell">
      <div className="top-strip">
        <MapPin size={13} /> Delivering across Ranchi &amp; Jharkhand — free delivery above ₹499
      </div>

      <header className="navbar">
        <div className="navbar-inner">
          <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="logo">
            Ranchi<span>Kart</span>
          </Link>

          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for mobiles, sarees, groceries and more..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" aria-label="Search">
              <Search size={18} />
            </button>
          </form>

          <nav className="nav-actions">
            <button className="icon-btn" onClick={toggleDarkMode} title="Toggle theme">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/wishlist" className="icon-btn" title="Wishlist">
              <Heart size={20} />
              {wishlist.items.length > 0 && <span className="badge">{wishlist.items.length}</span>}
            </Link>
            <Link to="/cart" className="icon-btn" title="Cart">
              <ShoppingCart size={20} />
              {cart.count > 0 && <span className="badge">{cart.count}</span>}
            </Link>

            {user ? (
              <div
                ref={accountMenuRef}
                className={`account-menu ${accountMenuOpen ? "open" : ""}`}
                onMouseEnter={handleMouseEnterMenu}
                onMouseLeave={handleMouseLeaveMenu}
              >
                {/* Bridge element to prevent gap-triggered close */}
                <div className="account-menu-bridge" />
                <button
                  className="icon-btn account-btn"
                  title="Account"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((v) => !v)}
                >
                  <User size={20} />
                  <ChevronDown
                    size={14}
                    style={{
                      transition: "transform 0.2s ease",
                      transform: accountMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                <div className="account-dropdown" role="menu">
                  <div className="account-name">Hi, {user.name?.split(" ")[0] ?? "User"}</div>
                  <Link to="/profile" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                    <User size={14} /> Profile
                  </Link>
                  <Link to="/orders" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                    <PackageCheck size={14} /> My Orders
                  </Link>
                  <Link to="/settings" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                    <Settings size={14} /> Settings
                  </Link>
                  {isAdmin() && (
                    <Link to="/admin" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                      <LayoutDashboard size={14} /> {user.role === "ADMIN" ? "Admin Dashboard" : "Manager Dashboard"}
                    </Link>
                  )}
                  <button role="menuitem" onClick={handleLogout}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">Login</Link>
            )}
          </nav>
        </div>

        {/* Dynamic category strip from API */}
        <div className={`category-strip ${menuOpen ? "open" : ""}`}>
          <div className="mobile-only-links">
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
            <hr className="mobile-nav-divider" />
          </div>
          {NAV_CATS.map((cat) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              onClick={() => setMenuOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="logo footer-logo">Ranchi<span>Kart</span></div>
            <p>Ranchi's own online store — fast local delivery across every locality in the city.</p>
          </div>
          <div>
            <h4>Shop</h4>
            {NAV_CATS.slice(0, 5).map((cat) => (
              <Link key={cat.slug} to={`/category/${cat.slug}`}>{cat.name}</Link>
            ))}
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/orders">Orders</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/terms">Terms &amp; Policies</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/faq">FAQs</Link>
            <a href={`mailto:${import.meta.env.VITE_EMAIL}`}>{import.meta.env.VITE_EMAIL}</a>
            <span>Ranchi, Jharkhand 834001</span>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} RanchiKart (v{pkg.version}). All rights reserved.</div>
      </footer>
      <Toast />
    </div>
  );
}
