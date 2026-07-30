import { useEffect, useState, useRef } from "react";
import { Trash2 } from "lucide-react";
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
  
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // TOTP
  const [totpQr, setTotpQr] = useState(null);
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
    try {
      const { data: options } = await api.post("/auth/passkey/register");
      const attestation = await startRegistration(options);
      await api.post("/auth/passkey/register/verify", attestation);
      showToast("Passkey registered successfully!", "success");
    } catch (err) {
      showToast(extractError(err, "Could not register passkey"), "error");
    }
  }

  async function handleEnableTotpStart() {
    try {
      const { data } = await api.post("/auth/totp/enable");
      setTotpQr(data.qrCode);
    } catch (err) {
      showToast(extractError(err, "Failed to start TOTP setup"), "error");
    }
  }

  async function handleEnableTotpVerify(e) {
    e.preventDefault();
    try {
      await api.post("/auth/totp/verify", { token: totpCode });
      setTotpQr(null);
      setTotpCode("");
      await fetchUser();
      showToast("Two-Factor Authentication enabled!", "success");
    } catch (err) {
      showToast(extractError(err, "Invalid verification code"), "error");
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
      <h1>My Profile</h1>
      <div className="profile-card">
        {!isEditing ? (
          <>
            <div><strong>Name:</strong> {user?.name}</div>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Phone:</strong> {user?.phone || "—"}</div>
            <div><strong>Role:</strong> {user?.role}</div>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>Edit Profile</button>
            </div>
          </>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.put("/users/me/profile", {
                name: nameRef.current.value,
                phone: phoneRef.current.value
              });
              await fetchUser();
              showToast("Profile updated");
              setIsEditing(false);
            } catch (err) {
              showToast(extractError(err, "Could not update profile"), "error");
            }
          }}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" defaultValue={user?.name} ref={nameRef} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" defaultValue={user?.phone || ""} ref={phoneRef} />
            </div>
            <div className="form-group">
              <label>Email (read-only)</label>
              <input type="email" value={user?.email || ""} disabled />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <h2>Security</h2>
      <div className="profile-card">
        {!isChangingPassword ? (
          <button className="btn btn-outline btn-sm" onClick={() => setIsChangingPassword(true)}>Change Password</button>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.put("/users/me/password", {
                currentPassword: currentPasswordRef.current.value || undefined,
                newPassword: newPasswordRef.current.value
              });
              showToast("Password updated successfully");
              setIsChangingPassword(false);
            } catch (err) {
              showToast(extractError(err, "Could not update password"), "error");
            }
          }}>
            <div className="form-group">
              <label>Current Password (leave blank if you don't have one)</label>
              <input type="password" ref={currentPasswordRef} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" ref={newPasswordRef} required minLength={8} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button type="submit" className="btn btn-primary btn-sm">Update Password</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsChangingPassword(false)}>Cancel</button>
            </div>
          </form>
        )}
        
        <hr style={{ margin: "20px 0", borderColor: "var(--border)" }} />
        
        <h4>Two-Factor Authentication (2FA)</h4>
        {user?.isTotpEnabled ? (
          <div>
            <p className="muted" style={{ marginBottom: 10 }}>2FA is currently enabled for your account.</p>
            {!isDisablingTotp ? (
              <button className="btn btn-outline btn-sm" onClick={() => setIsDisablingTotp(true)}>Disable 2FA</button>
            ) : (
              <form onSubmit={handleDisableTotp} style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={disableTotpCode}
                  onChange={e => setDisableTotpCode(e.target.value)}
                  required
                  style={{ width: "120px" }}
                />
                <button type="submit" className="btn btn-primary btn-sm">Confirm Disable</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsDisablingTotp(false)}>Cancel</button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <p className="muted" style={{ marginBottom: 10 }}>Protect your account with an Authenticator App.</p>
            {!totpQr ? (
              <button className="btn btn-outline btn-sm" onClick={handleEnableTotpStart}>Enable 2FA</button>
            ) : (
              <div style={{ padding: "15px", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <p>1. Scan this QR code with your Authenticator App (Google Authenticator, Authy, etc).</p>
                <img src={totpQr} alt="TOTP QR Code" style={{ background: "white", padding: 10, borderRadius: 8, margin: "10px 0" }} />
                <p>2. Enter the 6-digit code generated by the app to verify.</p>
                <form onSubmit={handleEnableTotpVerify} style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="6-digit code"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    required
                    style={{ width: "120px", textAlign: "center", letterSpacing: "2px" }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Verify & Enable</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setTotpQr(null)}>Cancel</button>
                </form>
              </div>
            )}
          </div>
        )}

        <hr style={{ margin: "20px 0", borderColor: "var(--border)" }} />
        
        <h4>Passkeys</h4>
        <p className="muted" style={{ marginBottom: 10 }}>Sign in securely without a password using FaceID, TouchID, or Windows Hello.</p>
        <button className="btn btn-outline btn-sm" onClick={handleRegisterPasskey}>Register a Passkey</button>
      </div>

      <h2>Danger Zone</h2>
      <div className="profile-card" style={{ border: "1px solid #fee2e2", backgroundColor: "#fff5f5" }}>
        <h4 style={{ color: "#dc2626", margin: "0 0 8px 0" }}>Delete Account</h4>
        <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "12px" }}>
          Deactivating your account will immediately hide your profile. All your personal data, saved addresses, and profile info will be permanently and irreversibly purged from our database after 90 days.
        </p>
        <button
          className="btn btn-sm"
          style={{ backgroundColor: "#dc2626", color: "#fff", border: "none" }}
          onClick={async () => {
            if (window.confirm("Are you sure you want to delete your account? Your account will be deactivated and permanently deleted after 90 days.")) {
              try {
                const { data } = await api.delete("/users/me");
                showToast(data.message || "Account scheduled for deletion in 90 days.");
                useAuthStore.getState().logout();
              } catch (err) {
                showToast(extractError(err, "Could not delete account"), "error");
              }
            }
          }}
        >
          Delete My Account
        </button>
      </div>

      <h2>Saved Addresses</h2>
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
