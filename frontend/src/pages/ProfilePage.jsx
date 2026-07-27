import { useEffect, useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import api, { extractError } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const showToast = useShopStore((s) => s.showToast);
  const [addresses, setAddresses] = useState([]);
  
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    api.get("/addresses").then(({ data }) => setAddresses(data.addresses));
  }, []);

  async function deleteAddress(id) {
    try {
      await api.delete(`/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast("Address removed");
    } catch (err) {
      showToast(extractError(err, "Could not remove address"), "error");
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
