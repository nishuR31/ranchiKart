import { useEffect, useState } from "react";
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

// Map ProductKind → display name for category strip
const KIND_LABELS = {
  ELECTRONIC: "Electronics",
  CLOTHING: "Fashion",
  EATABLE: "Grocery",
  HOME: "Home & Kitchen",
  KITCHEN: "Kitchen",
  BEAUTY: "Beauty",
  HEALTH: "Health",
  STATIONERY: "Books & Stationery",
  SPORT: "Sports",
  SHOE: "Footwear",
  BAG: "Bags",
  JEWELLERY: "Jewellery",
  ACCESSORY: "Accessories",
  TOY: "Toys & Kids",
  PET: "Pet Supplies",
  GARDEN: "Garden",
  BABY: "Baby",
  OTHER: "More",
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore();
  const { cart, fetchCart, wishlist, fetchWishlist, darkMode, toggleDarkMode } = useShopStore();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [topCategories, setTopCategories] = useState([]);
  const navigate = useNavigate();

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
          .filter((c) => !c.parentId)
          .slice(0, 10);
        setTopCategories(top);
      })
      .catch(() => {});
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  // Fallback static categories if API returns nothing clean
  const NAV_CATS = topCategories.length > 0
    ? topCategories
    : [
        { slug: "electronics", name: "Electronics" },
        { slug: "fashion", name: "Fashion" },
        { slug: "grocery", name: "Grocery" },
        { slug: "home-kitchen", name: "Home & Kitchen" },
        { slug: "beauty", name: "Beauty" },
        { slug: "books-stationery", name: "Books & Stationery" },
        { slug: "sports-fitness", name: "Sports" },
        { slug: "mobiles", name: "Mobiles" },
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
              <div className="account-menu">
                <button className="icon-btn account-btn" title="Account">
                  <User size={20} />
                  <ChevronDown size={14} />
                </button>
                <div className="account-dropdown">
                  <div className="account-name">Hi, {user.name?.split(" ")[0] ?? "User"}</div>
                  <Link to="/profile"><User size={14} /> Profile</Link>
                  <Link to="/orders"><PackageCheck size={14} /> My Orders</Link>
                  <Link to="/settings"><Settings size={14} /> Settings</Link>
                  {isAdmin() && <Link to="/admin"><LayoutDashboard size={14} /> {user.role === "ADMIN" ? "Admin Dashboard" : "Manager Dashboard"}</Link>}
                  <button onClick={() => { logout(); navigate("/"); }}>
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
