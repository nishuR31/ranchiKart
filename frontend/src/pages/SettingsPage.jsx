import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Snowflake, Settings, Bell, Globe, ShieldCheck,
  Info, LogOut, User, Trash2, ChevronRight,
} from "lucide-react";
import useSEO from "../lib/useSEO";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";
import api from "../lib/api";

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
  const { darkMode, toggleDarkMode, showSnowfall, toggleSnowfall, clearCart, showToast } = useShopStore();
  const { user, logout } = useAuthStore();

  const [orderNotifs, setOrderNotifs] = useState(
    () => localStorage.getItem("rk_notif_orders") !== "false"
  );
  const [promoNotifs, setPromoNotifs] = useState(
    () => localStorage.getItem("rk_notif_promos") === "true"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("rk_language") || "en-IN"
  );
  const [appVersion, setAppVersion] = useState(null);

  // Fetch app version from backend
  useEffect(() => {
    api.get("/version")
      .then(({ data }) => setAppVersion(data.currentVersion ?? data.data?.currentVersion ?? null))
      .catch(() => setAppVersion(null));
  }, []);

  function toggleOrderNotifs() {
    const next = !orderNotifs;
    setOrderNotifs(next);
    localStorage.setItem("rk_notif_orders", String(next));
    showToast(next ? "Order notifications enabled" : "Order notifications disabled");
  }

  function togglePromoNotifs() {
    const next = !promoNotifs;
    setPromoNotifs(next);
    localStorage.setItem("rk_notif_promos", String(next));
    showToast(next ? "Promotional notifications enabled" : "Promotional notifications disabled");
  }

  function handleLanguageChange(e) {
    const val = e.target.value;
    setLanguage(val);
    localStorage.setItem("rk_language", val);
    showToast("Language preference saved");
  }

  function handleClearData() {
    clearCart();
    ["rk_cart", "rk_wishlist", "rk_recent"].forEach((k) => localStorage.removeItem(k));
    showToast("Local cart data cleared successfully");
  }

  function handleLogout() {
    logout();
    showToast("You have been logged out.");
    navigate("/");
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
          icon={Trash2}
          title="Clear Local Cart Data"
          description="Delete your locally stored cart. Orders and account info are unaffected."
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
            <button
              className="btn btn-outline btn-sm"
              style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </SettingRow>
        </SettingSection>
      )}

      {/* ── About ── */}
      <SettingSection title="About">
        <SettingRow
          icon={Info}
          title="RanchiKart"
          description={appVersion ? `Version ${appVersion} — Ranchi's own online store.` : "Ranchi's own online store."}
          iconColor="var(--text-muted)"
        >
          {appVersion ? (
            <span className="settings-version-badge">v{appVersion}</span>
          ) : (
            <span className="settings-version-badge" style={{ opacity: 0.5 }}>—</span>
          )}
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
