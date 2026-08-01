import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Snowflake, Settings, Bell, Globe, ShieldCheck,
  Info, LogOut, User, Trash2, ChevronRight,
} from "lucide-react";
import useSEO from "../lib/useSEO";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";

function SettingToggle({ checked, onChange }) {
  return (
    <label className="settings-toggle" aria-label="Toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle-track">
        <span className="settings-toggle-thumb" />
      </span>
    </label>
  );
}

function SettingRow({ icon: Icon, title, description, children, iconColor }) {
  return (
    <div className="settings-row">
      <div className="settings-row-icon" style={iconColor ? { color: iconColor } : {}}>
        <Icon size={20} />
      </div>
      <div className="settings-row-content">
        <div className="settings-row-title">{title}</div>
        {description && <div className="settings-row-desc">{description}</div>}
      </div>
      <div className="settings-row-action">{children}</div>
    </div>
  );
}

function SettingSection({ title, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  useSEO({
    title: "Settings",
    description: "Manage your preferences on RanchiKart.",
    noindex: true,
  });

  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, showSnowfall, toggleSnowfall, clearCart } = useShopStore();
  const { user, logout } = useAuthStore();

  // Local-only preferences (stored in state, persisted to localStorage manually)
  const [orderNotifs, setOrderNotifs] = useState(
    () => localStorage.getItem("rk_notif_orders") !== "false"
  );
  const [promoNotifs, setPromoNotifs] = useState(
    () => localStorage.getItem("rk_notif_promos") === "true"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("rk_language") || "en-IN"
  );

  function toggleOrderNotifs() {
    const next = !orderNotifs;
    setOrderNotifs(next);
    localStorage.setItem("rk_notif_orders", String(next));
  }

  function togglePromoNotifs() {
    const next = !promoNotifs;
    setPromoNotifs(next);
    localStorage.setItem("rk_notif_promos", String(next));
  }

  function handleLanguageChange(e) {
    const val = e.target.value;
    setLanguage(val);
    localStorage.setItem("rk_language", val);
  }

  function handleClearData() {
    if (window.confirm("This will clear your local cart data. Your orders and account info are safe. Continue?")) {
      clearCart();
      // Clear any locally cached keys
      ["rk_cart", "rk_wishlist", "rk_recent"].forEach((k) => localStorage.removeItem(k));
      alert("Local cart data cleared successfully.");
    }
  }

  function handleLogout() {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate("/");
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Settings size={26} />
        <h1>Settings</h1>
      </div>

      {/* ── Appearance ── */}
      <SettingSection title="Appearance">
        <SettingRow
          icon={darkMode ? Moon : Sun}
          title="Dark Mode"
          description="Switch between light and dark theme."
          iconColor="var(--brand)"
        >
          <SettingToggle checked={darkMode} onChange={toggleDarkMode} />
        </SettingRow>
        <SettingRow
          icon={Snowflake}
          title="Seasonal Animations"
          description="Show festive effects like snowfall on the homepage."
          iconColor={showSnowfall ? "#60a5fa" : undefined}
        >
          <SettingToggle checked={showSnowfall} onChange={toggleSnowfall} />
        </SettingRow>
      </SettingSection>

      {/* ── Language & Region ── */}
      <SettingSection title="Language &amp; Region">
        <SettingRow
          icon={Globe}
          title="Language"
          description="Select your preferred display language."
          iconColor="var(--accent)"
        >
          <select
            className="settings-select"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
          </select>
        </SettingRow>
      </SettingSection>

      {/* ── Notifications ── */}
      <SettingSection title="Notifications">
        <SettingRow
          icon={Bell}
          title="Order Updates"
          description="Get notified about shipping and delivery status."
          iconColor="var(--success)"
        >
          <SettingToggle checked={orderNotifs} onChange={toggleOrderNotifs} />
        </SettingRow>
        <SettingRow
          icon={Bell}
          title="Offers &amp; Promotions"
          description="Receive deals, coupons and sale alerts."
          iconColor="var(--accent)"
        >
          <SettingToggle checked={promoNotifs} onChange={togglePromoNotifs} />
        </SettingRow>
      </SettingSection>

      {/* ── Privacy & Data ── */}
      <SettingSection title="Privacy &amp; Data">
        <SettingRow
          icon={ShieldCheck}
          title="Clear Local Data"
          description="Delete your locally stored cart and wishlist."
          iconColor="var(--brick)"
        >
          <button className="btn btn-outline btn-sm" onClick={handleClearData}>
            <Trash2 size={14} /> Clear
          </button>
        </SettingRow>
        <SettingRow icon={ShieldCheck} title="Privacy Policy" description="How we handle your data." iconColor="var(--brand)">
          <Link to="/privacy" className="btn btn-outline btn-sm">
            View <ChevronRight size={14} />
          </Link>
        </SettingRow>
        <SettingRow icon={ShieldCheck} title="Terms of Service" description="Rules governing your use of RanchiKart." iconColor="var(--brand)">
          <Link to="/terms" className="btn btn-outline btn-sm">
            View <ChevronRight size={14} />
          </Link>
        </SettingRow>
      </SettingSection>

      {/* ── Account ── */}
      {user && (
        <SettingSection title="Account">
          <SettingRow
            icon={User}
            title="My Profile"
            description={user.email || "Manage your personal information."}
            iconColor="var(--brand)"
          >
            <Link to="/profile" className="btn btn-outline btn-sm">
              Open <ChevronRight size={14} />
            </Link>
          </SettingRow>
          <SettingRow
            icon={LogOut}
            title="Sign Out"
            description="Log out from your RanchiKart account."
            iconColor="var(--danger)"
          >
            <button className="btn btn-outline btn-sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={handleLogout}>
              Sign Out
            </button>
          </SettingRow>
        </SettingSection>
      )}

      {/* ── About ── */}
      <SettingSection title="About">
        <SettingRow icon={Info} title="RanchiKart" description="Version 1.0.0 — Ranchi's own online store." iconColor="var(--text-muted)">
          <span className="settings-version-badge">v1.0</span>
        </SettingRow>
        <SettingRow icon={Info} title="FAQ" description="Frequently asked questions." iconColor="var(--text-muted)">
          <Link to="/faq" className="btn btn-outline btn-sm">
            View <ChevronRight size={14} />
          </Link>
        </SettingRow>
      </SettingSection>
    </div>
  );
}
