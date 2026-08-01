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

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

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
    city: "Lalpur",
    state: "Jharkhand",
    pincode: "834001",
  });
  const [phoneError, setPhoneError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  // ── Addresses ──────────────────────────────────────────────────────────────
  async function loadAddresses() {
    try {
      const { data } = await api.get("/users/me/addresses");
      const list = Array.isArray(data) ? data : data.addresses ?? [];
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setSelectedAddress(def.id);
    } catch {
      // not logged in or no addresses
    }
  }

  function validatePhone(phone) {
    if (!phone.trim()) {
      return "Phone number is required.";
    }
    if (!INDIAN_PHONE_RE.test(phone.replace(/\s/g, ""))) {
      return "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
    }
    return "";
  }

  function handlePhoneChange(e) {
    const val = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
    setForm((f) => ({ ...f, phone: val }));
    if (phoneError) setPhoneError(validatePhone(val));
  }

  async function saveAddress(e) {
    e.preventDefault();
    const err = validatePhone(form.phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError("");
    try {
      const { data } = await api.post("/users/me/addresses", form);
      await loadAddresses();
      const saved = data.address ?? data;
      setSelectedAddress(saved.id);
      setShowForm(false);
      showToast("Address saved");
    } catch (err) {
      showToast(extractError(err, "Could not save address"), "error");
    }
  }

  // ── Coupon ─────────────────────────────────────────────────────────────────
  async function applyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post("/coupons/apply", {
        code: couponCode.trim().toUpperCase(),
        orderAmount: cart.subtotal,
      });
      const discount = data.discountAmount ?? data.discount ?? 0;
      setCouponResult({ ...data, discount, code: couponCode.trim().toUpperCase() });
      showToast(`Coupon applied — you save ${formatINR(discount)}!`);
    } catch (err) {
      setCouponResult(null);
      showToast(extractError(err, "Invalid coupon"), "error");
    }
  }

  // ── Place Order ────────────────────────────────────────────────────────────
  async function placeOrder() {
    if (!selectedAddress) return showToast("Please select or add a delivery address", "error");
    if (cart.items.length === 0) return showToast("Your cart is empty", "error");

    const address = addresses.find((a) => a.id === selectedAddress);
    if (!address) return showToast("Address not found", "error");

    setPlacing(true);
    try {
      const items = cart.items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

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

      const order = data.order ?? data;

      if (paymentMethod === "COD") {
        clearCart();
        showToast("Order placed successfully!");
        navigate(`/orders/${order.id}`);
        return;
      }

      // ── Razorpay online payment flow ─────────────────────────────────────
      const rzpRes = await api.post("/payments/razorpay/orders", { orderId: order.id });
      const gateway = rzpRes.data?.gateway ?? rzpRes.data;
      const razorpayOrderId = gateway?.orderId ?? rzpRes.data?.payment?.providerOrderId ?? gateway?.id;
      const keyId =
        gateway?.keyId ||
        import.meta.env.VITE_RAZORPAY_KEY_ID_TEST ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;
      const amount = gateway?.amount ?? order.total;
      const currency = gateway?.currency ?? "INR";
      const isMock = Boolean(gateway?.mock || razorpayOrderId?.startsWith("mock_"));

      const scriptOk = await loadRazorpayScript();

      if (isMock || !scriptOk || !keyId || !razorpayOrderId) {
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

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amount,
        currency: currency,
        name: "RanchiKart",
        description: `Order ${order.orderNumber || order.id}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
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
        theme: { color: "#2563eb" },
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
                  <strong>{a.fullName}</strong>
                  <span className="address-card-label"> ({a.label})</span>
                  <span className="address-card-phone"> — {a.phone}</span>
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

                <div className="form-group">
                  <label htmlFor="addr-fullname">Full Name <span className="field-required">*</span></label>
                  <input
                    id="addr-fullname"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addr-phone">
                    Phone Number <span className="field-required">*</span>
                    <span className="field-hint"> (10-digit Indian mobile)</span>
                  </label>
                  <input
                    id="addr-phone"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={handlePhoneChange}
                    onBlur={() => setPhoneError(validatePhone(form.phone))}
                    className={phoneError ? "input-error" : ""}
                  />
                  {phoneError && <span className="field-error">{phoneError}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="addr-line1">House / Flat No., Street, Landmark <span className="field-required">*</span></label>
                  <input
                    id="addr-line1"
                    required
                    placeholder="e.g. 12B, Main Road, near City Mall"
                    value={form.line1}
                    onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addr-city">Area / Locality <span className="field-required">*</span></label>
                  <select
                    id="addr-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  >
                    {RANCHI_LOCALITIES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="addr-pincode">Pincode <span className="field-required">*</span></label>
                  <input
                    id="addr-pincode"
                    required
                    placeholder="e.g. 834001"
                    value={form.pincode}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addr-label">Address Type</label>
                  <div className="addr-type-row">
                    {["Home", "Work", "Other"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`addr-type-btn${form.label === t ? " active" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, label: t }))}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-sm">Save Address</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setPhoneError(""); }}>Cancel</button>
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
