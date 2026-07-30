import useSEO from "../lib/useSEO";
import useShopStore from "../store/useShopStore";
import { Moon, Sun, Snowflake, Settings } from "lucide-react";

export default function SettingsPage() {
  useSEO({
    title: "Settings",
    description: "Manage your preferences on RanchiKart.",
    noindex: true,
  });

  const { darkMode, toggleDarkMode, showSnowfall, toggleSnowfall } = useShopStore();

  return (
    <div className="settings-page" style={{ maxWidth: "600px", margin: "24px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Settings size={28} />
        <h1 style={{ margin: 0 }}>Preferences</h1>
      </div>

      <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Dark Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {darkMode ? <Moon size={24} /> : <Sun size={24} />}
            <div>
              <h3 style={{ margin: "0 0 4px 0" }}>Dark Mode</h3>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>Toggle between light and dark themes.</p>
            </div>
          </div>
          <label className="switch" style={{ position: "relative", display: "inline-block", width: "50px", height: "24px" }}>
            <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} style={{ opacity: 0, width: 0, height: 0 }} />
            <span className="slider round" style={{ 
              position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: darkMode ? "var(--primary)" : "#ccc", 
              transition: ".4s", borderRadius: "24px" 
            }}>
              <span style={{
                position: "absolute", height: "18px", width: "18px", left: darkMode ? "28px" : "4px", bottom: "3px",
                backgroundColor: "white", transition: ".4s", borderRadius: "50%"
              }} />
            </span>
          </label>
        </div>

        {/* Snowfall Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Snowflake size={24} color={showSnowfall ? "#60a5fa" : "currentColor"} />
            <div>
              <h3 style={{ margin: "0 0 4px 0" }}>Seasonal Animations</h3>
              <p style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>Enable festive effects like snowfall on the homepage.</p>
            </div>
          </div>
          <label className="switch" style={{ position: "relative", display: "inline-block", width: "50px", height: "24px" }}>
            <input type="checkbox" checked={showSnowfall} onChange={toggleSnowfall} style={{ opacity: 0, width: 0, height: 0 }} />
            <span className="slider round" style={{ 
              position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: showSnowfall ? "var(--primary)" : "#ccc", 
              transition: ".4s", borderRadius: "24px" 
            }}>
              <span style={{
                position: "absolute", height: "18px", width: "18px", left: showSnowfall ? "28px" : "4px", bottom: "3px",
                backgroundColor: "white", transition: ".4s", borderRadius: "50%"
              }} />
            </span>
          </label>
        </div>

      </div>
    </div>
  );
}
