import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Tag } from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";
import { loadRazorpayScript } from "../lib/razorpay";

const RANCHI_LOCALITIES = [
  "Lalpur", "Circular Road", "Kutchery", "Doranda", "Harmu", "Kokar", "Hinoo",
  "Bariatu", "Morabadi", "Ratu Road", "Kanke", "Argora", "Hatia", "Namkum",
  "Ormanjhi", "Tatisilwai", "Booty More", "Chutia", "Piska More", "Khelgaon",
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, showToast } = useShopStore();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    line1: "",
    locality: "Lalpur",
    pincode: "834001",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchCart();
    loadAddresses();
  }, []);

  async function loadAddresses() {
    const { data } = await api.get("/addresses");
    setAddresses(data.addresses);
    const def = data.addresses.find((a) => a.isDefault) || data.addresses[0];
    if (def) setSelectedAddress(def.id);
  }

  async function saveAddress(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/addresses", form);
      await loadAddresses();
      setSelectedAddress(data.address.id);
      setShowForm(false);
      showToast("Address saved");
    } catch (err) {
      showToast(extractError(err, "Could not save address"), "error");
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post("/coupons/validate", { code: couponCode, subtotal: cart.subtotal });
      setCouponResult(data);
      showToast(`Coupon applied — you saved ${formatINR(data.discount)}`);
    } catch (err) {
      setCouponResult(null);
      showToast(extractError(err, "Invalid coupon"), "error");
    }
  }

  async function placeOrder() {
    if (!selectedAddress) return showToast("Please select or add a delivery address", "error");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        addressId: selectedAddress,
        paymentMethod,
        couponCode: couponResult?.code,
      });

      if (paymentMethod === "COD") {
        showToast("Order placed successfully!");
        navigate(`/orders/${data.order.id}`);
        return;
      }

      // Razorpay flow
      const scriptOk = await loadRazorpayScript();
      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_mock";
      if (!scriptOk || !data.razorpayOrder?.live) {
        // Mock payment path (no live keys configured) — auto-verify
        await api.post("/orders/verify-payment", {
          orderId: data.order.id,
          razorpay_order_id: data.razorpayOrder.id,
          razorpay_payment_id: "pay_mock_" + Date.now(),
          razorpay_signature: "mock",
        });
        showToast("Payment successful (test mode)!");
        navigate(`/orders/${data.order.id}`);
        return;
      }

      const rzp = new window.Razorpay({
        key: rzpKey,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: "RanchiKart",
        description: `Order ${data.order.orderNumber}`,
        order_id: data.razorpayOrder.id,
        handler: async function (response) {
          await api.post("/orders/verify-payment", {
            orderId: data.order.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          showToast("Payment successful!");
          navigate(`/orders/${data.order.id}`);
        },
        theme: { color: "#e85d2c" },
      });
      rzp.open();
    } catch (err) {
      showToast(extractError(err, "Could not place order"), "error");
    } finally {
      setPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return <div className="empty-block"><p>Your cart is empty.</p></div>;
  }

  const discount = couponResult?.discount || 0;

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-section">
            <h3><MapPin size={16} /> Delivery Address</h3>
            {addresses.map((a) => (
              <label key={a.id} className={`address-card ${selectedAddress === a.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === a.id}
                  onChange={() => setSelectedAddress(a.id)}
                />
                <div>
                  <strong>{a.fullName}</strong> ({a.label}) — {a.phone}
                  <p>{a.line1}, {a.locality}, {a.city} - {a.pincode}</p>
                </div>
              </label>
            ))}
            {!showForm && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Add New Address
              </button>
            )}
            {showForm && (
              <form className="address-form" onSubmit={saveAddress}>
                <input required placeholder="Full Name" value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                <input required placeholder="Phone Number" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <input required placeholder="House No., Street, Landmark" value={form.line1}
                  onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} />
                <select value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}>
                  {RANCHI_LOCALITIES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <input required placeholder="Pincode" value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-sm">Save Address</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </section>

          <section className="checkout-section">
            <h3><Tag size={16} /> Coupon</h3>
            <div className="coupon-row">
              <input placeholder="Enter coupon code (try RANCHI10)" value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)} />
              <button className="btn btn-outline btn-sm" onClick={applyCoupon}>Apply</button>
            </div>
          </section>

          <section className="checkout-section">
            <h3>Payment Method</h3>
            <label className="radio-row">
              <input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
              Cash on Delivery
            </label>
            <label className="radio-row">
              <input type="radio" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
              Pay Online (UPI / Card / Net Banking via Razorpay)
            </label>
          </section>
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
          {discount > 0 && <div className="summary-row"><span>Coupon discount</span><span>-{formatINR(discount)}</span></div>}
          <div className="summary-row muted"><span>Delivery fee</span><span>Calculated on order</span></div>
          <button className="btn btn-primary btn-full" onClick={placeOrder} disabled={placing}>
            {placing ? "Placing order…" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
