import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api, { extractError } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const showToast = useShopStore((s) => s.showToast);
  const [addresses, setAddresses] = useState([]);

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
        <div><strong>Name:</strong> {user?.name}</div>
        <div><strong>Email:</strong> {user?.email}</div>
        <div><strong>Phone:</strong> {user?.phone || "—"}</div>
        <div><strong>Role:</strong> {user?.role}</div>
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
