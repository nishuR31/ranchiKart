import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Lock, LogOut, MapPin, Package, Shield, User } from "lucide-react";
import { api } from "../api/client";
import { useShopStore } from "../store/useShopStore";

type Section = "profile" | "addresses" | "password";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-[var(--text-muted)] mb-1.5">{children}</p>;
}

function Field({ value, onChange, type = "text", placeholder, disabled, required }: {
  value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; required?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder} disabled={disabled} required={required}
      className="w-full h-10 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-[var(--input-focus)] transition-colors disabled:opacity-50" />
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { token, user, setAuth, logout, showToast } = useShopStore();
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    api.getUserProfile(token).then((r) => {
      setProfile(r.user); setName(r.user.name); setPhone(r.user.phone ?? "");
    }).catch(console.error).finally(() => setLoading(false));
  }, [token, navigate]);

  useEffect(() => {
    if (section === "addresses" && token) {
      api.getSavedAddresses(token).then((r) => setAddresses(r.addresses)).catch(console.error);
    }
  }, [section, token]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const r = await api.updateProfile({ name, phone: phone || undefined }, token);
      setProfile(r.user);
      if (user) setAuth(token, { ...user, name: r.user.name });
      showToast({ type: "success", title: "Profile updated!" });
    } catch (err: any) {
      showToast({ type: "error", title: "Failed to update", message: err.message });
    } finally { setSaving(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/users/me/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
      });
      setCurrentPwd(""); setNewPwd("");
      showToast({ type: "success", title: "Password changed!" });
    } catch (err: any) {
      showToast({ type: "error", title: "Failed", message: err.message });
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[260px_1fr] gap-8 animate-pulse">
        <div>
          <div className="h-48 bg-[var(--surface-2)] rounded-2xl" />
        </div>
        <div className="h-64 bg-[var(--surface-2)] rounded-2xl" />
      </div>
    );
  }

  const initials = profile?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";
  const mudraCoins = profile?.mudraCoins ?? 0;

  const NAV: { key: Section; label: string; icon: typeof User }[] = [
    { key: "profile", label: "Profile Info", icon: User },
    { key: "addresses", label: "Saved Addresses", icon: MapPin },
    { key: "password", label: "Change Password", icon: Lock }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1.5">Account</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)]">My Profile</h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* ── Sidebar ── */}
        <div className="space-y-3">
          {/* Avatar card */}
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-5 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
              {initials}
            </div>
            <p className="font-bold text-[var(--text-1)]">{profile?.name}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{profile?.email}</p>
            <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
              profile?.role === "ADMIN" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : profile?.role === "MANAGER" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}>
              <Shield size={10} />
              {profile?.role}
            </div>

            {/* Stats */}
            {profile?._count && (
              <div className="flex justify-around mt-4 pt-4 border-t border-[var(--border)]">
                <div className="text-center">
                  <p className="font-bold text-lg text-[var(--text-1)]">{profile._count.orders}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Orders</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-[var(--text-1)]">{profile._count.reviews}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Reviews</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-[var(--text-1)]">{profile._count.wishlist}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Saved</p>
                </div>
              </div>
            )}
          </div>

          {/* MudraCoins card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins size={18} className="text-amber-400 coin-pulse" />
              <p className="font-bold text-amber-400">MudraCoins</p>
            </div>
            <p className="text-3xl font-black text-amber-300">{mudraCoins}</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              = ₹{mudraCoins * 10} value · 1 coin = ₹10
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
              Earn 10 coins per delivered order. Redeem at checkout.
            </p>
          </div>

          {/* Nav */}
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setSection(key)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors text-left border-b border-[var(--border)] last:border-0 ${
                  section === key
                    ? "text-indigo-500 bg-indigo-500/8"
                    : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface)]"
                }`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
            <button onClick={() => { logout(); navigate("/"); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-rose-400 hover:bg-rose-500/8 transition-colors text-left">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Content panel ── */}
        <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-6">
          {section === "profile" && (
            <>
              <h2 className="font-bold text-lg text-[var(--text-1)] mb-5">Profile Information</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div><Label>Full Name</Label><Field value={name} onChange={setName} required /></div>
                <div><Label>Email Address</Label><Field value={profile?.email ?? ""} disabled /></div>
                <div><Label>Phone Number</Label><Field value={phone} onChange={setPhone} type="tel" placeholder="+91 98765 43210" /></div>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </form>
            </>
          )}

          {section === "addresses" && (
            <>
              <h2 className="font-bold text-lg text-[var(--text-1)] mb-5">Saved Addresses</h2>
              {addresses.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <MapPin size={32} className="text-[var(--text-muted)] mb-3" />
                  <p className="text-[var(--text-muted)]">No saved addresses yet.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Addresses are saved during checkout.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                          <MapPin size={13} className="text-indigo-500" />
                          {addr.label}
                          {addr.isDefault && <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">Default</span>}
                        </p>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        {addr.fullName} · {addr.phone}<br />
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                        {addr.city}, {addr.state} – {addr.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === "password" && (
            <>
              <h2 className="font-bold text-lg text-[var(--text-1)] mb-5">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div><Label>Current Password</Label><Field type="password" value={currentPwd} onChange={setCurrentPwd} required /></div>
                <div><Label>New Password (min 8 chars)</Label><Field type="password" value={newPwd} onChange={setNewPwd} required /></div>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50">
                  <Lock size={14} />
                  {saving ? "Changing…" : "Change Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
