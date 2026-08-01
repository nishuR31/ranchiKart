import { useEffect, useState } from "react";
import { Trash2, AlertTriangle, ShieldCheck, KeyRound, UserRound, Copy, Fingerprint } from "lucide-react";
import api, { extractError } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import useSEO from "../lib/useSEO";
import { startRegistration } from "@simplewebauthn/browser";

export default function ProfilePage() {
  useSEO({ title: "My Profile", noindex: true });

  const { user, fetchUser } = useAuthStore();
  const showToast = useShopStore((s) => s.showToast);
  const [addresses, setAddresses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", username: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  
  // TOTP
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [disableTotpCode, setDisableTotpCode] = useState("");
  const [isDisablingTotp, setIsDisablingTotp] = useState(false);

  useEffect(() => {
    // Correct endpoint: GET /users/me/addresses
    api.get("/users/me/addresses").then(({ data }) => {
      const list = Array.isArray(data) ? data : data.addresses ?? [];
      setAddresses(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      username: user?.username || "",
      phone: user?.phone || "",
    });
  }, [user]);

  async function deleteAddress(id) {
    try {
      // Correct endpoint: DELETE /users/me/addresses/:id
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast("Address removed");
    } catch (err) {
      showToast(extractError(err, "Could not remove address"), "error");
    }
  }

  async function handleRegisterPasskey() {
    setRegisteringPasskey(true);
    try {
      // Step 1: GET options (backend uses GET, not POST)
      const { data: options } = await api.get("/auth/passkey/register");
      const attestation = await startRegistration({ optionsJSON: options });
      // Step 2: POST attestation to verify
      await api.post("/auth/passkey/register/verify", attestation);
      await fetchUser();
      showToast("Passkey registered successfully!", "success");
    } catch (err) {
      showToast(extractError(err, "Could not register passkey"), "error");
    } finally {
      setRegisteringPasskey(false);
    }
  }

  async function handleEnableTotpStart() {
    try {
      const { data } = await api.post("/auth/totp/enable");
      setTotpSetup(data);
    } catch (err) {
      showToast(extractError(err, "Failed to start TOTP setup"), "error");
    }
  }

  async function handleEnableTotpVerify(e) {
    e.preventDefault();
    try {
      await api.post("/auth/totp/verify", { token: totpCode });
      setTotpSetup(null);
      setTotpCode("");
      await fetchUser();
      showToast("Two-Factor Authentication enabled!", "success");
    } catch (err) {
      showToast(extractError(err, "Invalid verification code"), "error");
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    try {
      await api.put("/users/me/profile", {
        name: profileForm.name.trim(),
        username: profileForm.username.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
      });
      await fetchUser();
      showToast("Profile updated");
      setIsEditing(false);
    } catch (err) {
      showToast(extractError(err, "Could not update profile"), "error");
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    try {
      await api.put("/users/me/password", {
        currentPassword: passwordForm.currentPassword || undefined,
        newPassword: passwordForm.newPassword,
      });
      showToast("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setIsChangingPassword(false);
    } catch (err) {
      showToast(extractError(err, "Could not update password"), "error");
    }
  }

  async function copyTotpCode() {
    try {
      await navigator.clipboard.writeText(totpSetup?.manualCode || totpSetup?.secret || "");
      showToast("Setup code copied");
    } catch {
      showToast("Could not copy setup code", "error");
    }
  }

  async function handleDisableTotp(e) {
    e.preventDefault();
    try {
      await api.post("/auth/totp/disable", { token: disableTotpCode });
      setIsDisablingTotp(false);
      setDisableTotpCode("");
      await fetchUser();
      showToast("Two-Factor Authentication disabled.");
    } catch (err) {
      showToast(extractError(err, "Invalid verification code"), "error");
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</div>
        <div>
          <h1>My Profile</h1>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="profile-card profile-section-card">
        <div className="profile-section-heading">
          <UserRound size={20} />
          <div>
            <h2>Account Details</h2>
            <p>Manage your public name, username and contact number.</p>
          </div>
        </div>
        {!isEditing ? (
          <div className="profile-details-grid">
            <div><span>Name</span><strong>{user?.name || "Not set"}</strong></div>
            <div><span>Username</span><strong>{user?.username ? `@${user.username}` : "Not set"}</strong></div>
            <div><span>Email</span><strong>{user?.email}</strong></div>
            <div><span>Phone</span><strong>{user?.phone || "Not set"}</strong></div>
            <div><span>Role</span><strong>{user?.role}</strong></div>
            <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>Edit Profile</button>
          </div>
        ) : (
          <form className="profile-form-grid" onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={profileForm.username} onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value }))} placeholder="nishan_admin" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={user?.email || ""} disabled />
            </div>
            <div className="profile-form-actions">
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-card profile-section-card">
        <div className="profile-section-heading">
          <ShieldCheck size={20} />
          <div>
            <h2>Security</h2>
            <p>Password, two-factor authentication and passkeys.</p>
          </div>
        </div>

        <div className="security-panel">
          <div>
            <h3>Password</h3>
            <p>Use a strong password if this account signs in with email.</p>
          </div>
          {!isChangingPassword ? (
            <button className="btn btn-outline btn-sm" onClick={() => setIsChangingPassword(true)}>Change Password</button>
          ) : (
            <form className="security-inline-form" onSubmit={handlePasswordSave}>
            <div className="form-group">
              <label>Current Password (leave blank if you don't have one)</label>
              <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="profile-form-actions">
              <button type="submit" className="btn btn-primary btn-sm">Update Password</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsChangingPassword(false); setPasswordForm({ currentPassword: "", newPassword: "" }); }}>Cancel</button>
            </div>
          </form>
          )}
        </div>

        <div className="security-panel">
          <div>
            <h3>Two-Factor Authentication</h3>
            <p>{user?.isTotpEnabled ? "Authenticator app protection is enabled." : "Add an authenticator app code to protect sign-ins."}</p>
          </div>
        {user?.isTotpEnabled ? (
          <div>
            {!isDisablingTotp ? (
              <button className="btn btn-outline btn-sm" onClick={() => setIsDisablingTotp(true)}>Disable 2FA</button>
            ) : (
              <form onSubmit={handleDisableTotp} className="security-code-form">
                <input
                  type="text"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={disableTotpCode}
                  onChange={e => setDisableTotpCode(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm">Confirm Disable</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsDisablingTotp(false)}>Cancel</button>
              </form>
            )}
          </div>
        ) : (
          <div>
            {!totpSetup ? (
              <button className="btn btn-outline btn-sm" onClick={handleEnableTotpStart}>Enable 2FA</button>
            ) : (
              <div className="totp-setup-box">
                <img src={totpSetup.qrCode} alt="TOTP QR Code" />
                <div className="totp-manual-code">
                  <span>Manual setup code</span>
                  <code>{totpSetup.manualCode || totpSetup.secret}</code>
                  <button type="button" className="icon-btn" onClick={copyTotpCode} title="Copy setup code"><Copy size={15} /></button>
                </div>
                <form onSubmit={handleEnableTotpVerify} className="security-code-form">
                  <input
                    type="text"
                    placeholder="6-digit code"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Verify & Enable</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setTotpSetup(null)}>Cancel</button>
                </form>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="security-panel">
          <div>
            <h3>Passkeys</h3>
            <p>{user?.passkeyCount > 0 ? `${user.passkeyCount} passkey registered.` : "Sign in with your device lock, Face ID, Touch ID or Windows Hello."}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleRegisterPasskey} disabled={registeringPasskey || user?.passkeyCount > 0}>
            <Fingerprint size={15} /> {registeringPasskey ? "Opening prompt..." : user?.passkeyCount > 0 ? "Passkey Registered" : "Register a Passkey"}
          </button>
        </div>
      </div>

      <div className="profile-section-heading standalone">
        <KeyRound size={20} />
        <div>
          <h2>Danger Zone</h2>
          <p>Account deactivation and deletion settings.</p>
        </div>
      </div>
      <DeleteAccountSection showToast={showToast} />

      <h2 className="profile-subtitle">Saved Addresses</h2>
      {addresses.length === 0 ? (
        <p className="muted">No saved addresses yet. Add one during checkout.</p>
      ) : (
        <div className="address-list">
          {addresses.map((a) => (
            <div key={a.id} className="address-card static">
              <div>
                <strong>{a.fullName}</strong> ({a.label}) {a.isDefault && <span className="badge-inline">Default</span>}
                <p>{a.line1}, {a.locality}, {a.city} - {a.pincode}</p>
                <p>Phone: {a.phone}</p>
              </div>
              <button className="icon-btn" onClick={() => deleteAddress(a.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline Delete Account (no browser dialogs) ─────────────────────────────
function DeleteAccountSection({ showToast }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const { data } = await api.delete("/users/me");
      showToast(data.message || "Account scheduled for deletion in 90 days.", "success");
      useAuthStore.getState().logout();
    } catch (err) {
      showToast(extractError(err, "Could not delete account"), "error");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card danger-zone-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ color: "var(--danger)", margin: "0 0 6px 0" }}>Delete Account</h4>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
            Your account will be immediately deactivated and all personal data will be permanently deleted after 90 days.
          </p>
          {!confirming ? (
            <button
              className="btn btn-sm"
              style={{ background: "transparent", color: "var(--danger)", border: "1.5px solid var(--danger)" }}
              onClick={() => setConfirming(true)}
            >
              Delete My Account
            </button>
          ) : (
            <div className="danger-confirm-row">
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--danger)" }}>
                Are you absolutely sure? This cannot be undone.
              </span>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  className="btn btn-sm"
                  style={{ background: "var(--danger)", color: "#fff", border: "none" }}
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting…" : "Yes, Delete My Account"}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
