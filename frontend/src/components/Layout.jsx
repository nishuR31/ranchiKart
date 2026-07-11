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
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import Toast from "./Toast";

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore();
  const { cart, fetchCart, wishlist, fetchWishlist, darkMode, toggleDarkMode } = useShopStore();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="app-shell">
      <div className="top-strip">
        <MapPin size={13} /> Delivering across Ranchi & Jharkhand — free delivery above ₹499
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
                <button className="icon-btn" title="Account">
                  <User size={20} />
                </button>
                <div className="account-dropdown">
                  <div className="account-name">Hi, {user.name.split(" ")[0]}</div>
                  <Link to="/profile"><User size={14} /> Profile</Link>
                  <Link to="/orders"><PackageCheck size={14} /> My Orders</Link>
                  {isAdmin() && <Link to="/admin"><LayoutDashboard size={14} /> Admin Dashboard</Link>}
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
        <div className={`category-strip ${menuOpen ? "open" : ""}`}>
          <Link to="/category/mobiles" onClick={() => setMenuOpen(false)}>Mobiles</Link>
          <Link to="/category/electronics" onClick={() => setMenuOpen(false)}>Electronics</Link>
          <Link to="/category/fashion" onClick={() => setMenuOpen(false)}>Fashion</Link>
          <Link to="/category/grocery" onClick={() => setMenuOpen(false)}>Grocery</Link>
          <Link to="/category/home-kitchen" onClick={() => setMenuOpen(false)}>Home &amp; Kitchen</Link>
          <Link to="/category/beauty" onClick={() => setMenuOpen(false)}>Beauty</Link>
          <Link to="/category/books-stationery" onClick={() => setMenuOpen(false)}>Books &amp; Stationery</Link>
          <Link to="/category/sports-fitness" onClick={() => setMenuOpen(false)}>Sports</Link>
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
            <Link to="/category/mobiles">Mobiles</Link>
            <Link to="/category/fashion">Fashion</Link>
            <Link to="/category/grocery">Grocery</Link>
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
            <Link to="/members">Team Members</Link>
            <a href={`mailto:${import.meta.env.VITE_EMAIL}`}>{import.meta.env.VITE_EMAIL}</a>
            <span>Ranchi, Jharkhand 834001</span>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} RanchiKart. All rights reserved.</div>
      </footer>
      <Toast />
    </div>
  );
}
