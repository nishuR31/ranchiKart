import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Tag } from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";
import { loadRazorpayScript } from "../lib/razorpay";
import useSEO from "../lib/useSEO";

const RANCHI_LOCALITIES = [
  "Lalpur", "Circular Road", "Kutchery", "Doranda", "Harmu", "Kokar", "Hinoo",
  "Bariatu", "Morabadi", "Ratu Road", "Kanke", "Argora", "Hatia", "Namkum",
  "Ormanjhi", "Tatisilwai", "Booty More", "Chutia", "Piska More", "Khelgaon",
];

const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "NET_BANKING", label: "Net Banking" },
];

export default function CheckoutPage() {
  useSEO({
    title: "Checkout",
    description: "Complete your order securely at RanchiKart.",
    noindex: true,
  });

  const navigate = useNavigate();
  const { cart, clearCart, showToast } = useShopStore();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    line1: "",
    city: "Ranchi",
    state: "Jharkhand",
    pincode: "834001",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  // ── Addresses ──────────────────────────────────────────────────────────────
  // Correct endpoint: GET /users/me/addresses
  async function loadAddresses() {
    try {
      const { data } = await api.get("/users/me/addresses");
      // data = { addresses: [...] } or the array directly
      const list = Array.isArray(data) ? data : data.addresses ?? [];
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setSelectedAddress(def.id);
    } catch {
      // not logged in or no addresses
    }
  }

  // Correct endpoint: POST /users/me/addresses
  async function saveAddress(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/users/me/addresses", form);
      await loadAddresses();
      // data = { address: {...} }
      const saved = data.address ?? data;
      setSelectedAddress(saved.id);
      setShowForm(false);
      showToast("Address saved");
    } catch (err) {
      showToast(extractError(err, "Could not save address"), "error");
    }
  }

  // ── Coupon ─────────────────────────────────────────────────────────────────
  // Correct endpoint: POST /coupons/apply  (not /coupons/validate)
  // Required body: { code, orderAmount }
  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post("/coupons/apply", {
        code: couponCode.trim().toUpperCase(),
        orderAmount: cart.subtotal,
      });
      // data = { discount, finalAmount, code, ... }
      setCouponResult({ ...data, code: couponCode.trim().toUpperCase() });
      showToast(`Coupon applied — you save ${formatINR(data.discount)}!`);
    } catch (err) {
      setCouponResult(null);
      showToast(extractError(err, "Invalid coupon"), "error");
    }
  }

  // ── Place Order ────────────────────────────────────────────────────────────
  // Correct endpoint: POST /orders
  // Required: { paymentMethod, address (inline object), items: [{productId, quantity}] }
  // NOT addressId — backend needs the full address inline
  async function placeOrder() {
    if (!selectedAddress) return showToast("Please select or add a delivery address", "error");
    if (cart.items.length === 0) return showToast("Your cart is empty", "error");

    const address = addresses.find((a) => a.id === selectedAddress);
    if (!address) return showToast("Address not found", "error");

    setPlacing(true);
    try {
      // Build items array from client-side cart
      const items = cart.items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      // Inline address object (no addressId)
      const addressPayload = {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      };

      const { data } = await api.post("/orders", {
        paymentMethod,
        address: addressPayload,
        items,
        ...(couponResult?.code ? { couponCode: couponResult.code } : {}),
      });

      // data = { order: {...}, razorpayOrder?: {...} }
      const order = data.order ?? data;

      if (paymentMethod === "COD") {
        clearCart();
        showToast("Order placed successfully!");
        navigate(`/orders/${order.id}`);
        return;
      }

      // ── Razorpay online payment flow ─────────────────────────────────────
      // Step 1: Create Razorpay order via POST /payments/razorpay/orders
      const rzpRes = await api.post("/payments/razorpay/orders", { orderId: order.id });
      // API unwraps envelope to: { payment: {...}, gateway: { keyId, orderId, amount, currency, mock } }
      const gateway = rzpRes.data?.gateway ?? rzpRes.data;
      const razorpayOrderId = gateway?.orderId ?? rzpRes.data?.payment?.providerOrderId ?? gateway?.id;
      const keyId = gateway?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      const amount = gateway?.amount ?? order.total;
      const currency = gateway?.currency ?? "INR";
      const isMock = Boolean(gateway?.mock || razorpayOrderId?.startsWith("mock_"));

      const scriptOk = await loadRazorpayScript();

      if (isMock || !scriptOk || !keyId || !razorpayOrderId) {
        // Mock/test path — auto-verify
        await api.post("/payments/razorpay/verify", {
          orderId: order.id,
          razorpay_order_id: razorpayOrderId ?? "mock_order",
          razorpay_payment_id: "pay_mock_" + Date.now(),
          razorpay_signature: "mock",
        });
        clearCart();
        showToast("Payment successful (test mode)!");
        navigate(`/orders/${order.id}`);
        return;
      }

      // Step 2: Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount,
        currency: currency,
        name: "RanchiKart",
        description: `Order ${order.orderNumber || order.id}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          // Step 3: Verify via POST /payments/razorpay/verify
          await api.post("/payments/razorpay/verify", {
            orderId: order.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          clearCart();
          showToast("Payment successful!");
          navigate(`/orders/${order.id}`);
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
  const total = cart.subtotal - discount;

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-main">

          {/* ── Address Section ── */}
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
                  <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} - {a.pincode}</p>
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
                <select value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
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

          {/* ── Coupon Section ── */}
          <section className="checkout-section">
            <h3><Tag size={16} /> Coupon</h3>
            {couponResult ? (
              <div className="coupon-applied">
                <strong>{couponResult.code}</strong> — saving {formatINR(couponResult.discount)}
                <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }}
                  onClick={() => { setCouponResult(null); setCouponCode(""); }}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="coupon-row">
                <input placeholder="Enter coupon code" value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()} />
                <button className="btn btn-outline btn-sm" onClick={applyCoupon}>Apply</button>
              </div>
            )}
          </section>

          {/* ── Payment Method ── */}
          <section className="checkout-section">
            <h3>Payment Method</h3>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.value} className="radio-row">
                <input type="radio" checked={paymentMethod === m.value}
                  onChange={() => setPaymentMethod(m.value)} />
                {m.label}
              </label>
            ))}
          </section>
        </div>

        {/* ── Order Summary ── */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          {cart.items.map((item) => (
            <div key={item.id} className="summary-row" style={{ fontSize: "0.85rem" }}>
              <span>{item.name} × {item.quantity}</span>
              <span>{formatINR(item.basePrice * item.quantity)}</span>
            </div>
          ))}
          <hr />
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
          {discount > 0 && <div className="summary-row"><span>Coupon discount</span><span>-{formatINR(discount)}</span></div>}
          <div className="summary-row muted"><span>Delivery fee</span><span>Calculated on order</span></div>
          <div className="summary-row" style={{ fontWeight: 700 }}><span>Total</span><span>{formatINR(total)}</span></div>
          <button className="btn btn-primary btn-full" onClick={placeOrder} disabled={placing}>
            {placing ? "Placing order…" : `Place Order · ${formatINR(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
