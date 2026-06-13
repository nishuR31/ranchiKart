import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee, CheckCircle, Coins, CreditCard,
  Gift, Minus, Percent, Plus, ShieldCheck, Tag, Truck, WalletCards
} from "lucide-react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { openRazorpayCheckout } from "../lib/razorpay";
import { unitPrice } from "../lib/product";
import { useShopStore } from "../store/useShopStore";
import type { Address, PaymentMethod } from "../types";

const emptyAddress: Address = {
  fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: ""
};

const ADDR_FIELDS: Array<{ key: keyof Address; label: string; required: boolean; full?: boolean }> = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "phone", label: "Phone Number", required: true },
  { key: "line1", label: "Address Line 1", required: true, full: true },
  { key: "line2", label: "Address Line 2 (optional)", required: false, full: true },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State", required: true },
  { key: "pincode", label: "PIN Code", required: true }
];

const PAYMENT_OPTIONS: Array<{ method: PaymentMethod; label: string; icon: typeof WalletCards; desc: string }> = [
  { method: "UPI", label: "UPI", icon: WalletCards, desc: "GPay, PhonePe, Paytm" },
  { method: "CARD", label: "Card", icon: CreditCard, desc: "Debit / Credit" },
  { method: "NET_BANKING", label: "Net Banking", icon: BadgeIndianRupee, desc: "All major banks" }
];

// Discount tiers (amounts in paise)
function getAutoDiscount(subtotal: number): { label: string; amount: number; type: "percent" | "gift" } | null {
  if (subtotal >= 5_000_000) { // ₹50,000
    return { label: "Free Custom Stamp Gift 🎁", amount: 0, type: "gift" };
  }
  if (subtotal >= 1_000_000) { // ₹10,000
    return { label: "5% off on order above ₹10,000", amount: Math.round(subtotal * 0.05), type: "percent" };
  }
  return null;
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-bold text-[var(--text-1)]">{title}</h2>
        {badge && <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, token, user, clearCart, showToast } = useShopStore();
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ discountAmount: number; coupon: any } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // MudraCoins state
  const [availableCoins, setAvailableCoins] = useState(0);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);

  // Fetch user's coin balance
  useEffect(() => {
    if (!token) return;
    api.getUserProfile(token).then((r) => setAvailableCoins(r.user?.mudraCoins ?? 0)).catch(() => {});
  }, [token]);

  const subtotal = cart.reduce(
    (sum, item) => sum + unitPrice(item.product, item.variant, item.customWidthMm, item.customHeightMm) * item.quantity,
    0
  );
  const shippingFee = subtotal >= 99900 || subtotal === 0 ? 0 : 6900;
  const couponDiscount = couponApplied?.discountAmount ?? 0;
  const autoDiscount = getAutoDiscount(subtotal);
  const autoDiscountAmt = autoDiscount?.type === "percent" ? autoDiscount.amount : 0;

  // MudraCoins: only usable on orders >= ₹1000 (100000 paisa)
  // Tier: ₹1000–₹1999 → max 50 coins, ₹2000–₹4999 → max 150 coins, ₹5000+ → max 300 coins
  const COIN_VALUE_PAISA = 1000; // 1 coin = ₹10 = 1000 paisa
  const MIN_ORDER_FOR_COINS = 100_000;
  const maxRedeemableCoins = subtotal < MIN_ORDER_FOR_COINS ? 0
    : subtotal < 200_000 ? 50
    : subtotal < 500_000 ? 150
    : 300;
  const effectiveRedeemable = Math.min(maxRedeemableCoins, availableCoins);
  const coinsDiscount = Math.min(coinsToRedeem * COIN_VALUE_PAISA, subtotal); // can't exceed subtotal

  const totalDiscount = couponDiscount + autoDiscountAmt + coinsDiscount;
  const total = subtotal + shippingFee - totalDiscount;

  // MudraCoins to be earned (10 coins per delivered order >= ₹1000)
  const coinsToEarn = subtotal >= MIN_ORDER_FOR_COINS ? 10 : 0;
  const coinsValue = coinsToEarn * COIN_VALUE_PAISA;

  async function applyCoupon() {
    if (!couponCode.trim() || !token) return;
    setCouponLoading(true); setCouponError("");
    try {
      const r = await api.applyCoupon(couponCode.trim(), subtotal, token);
      setCouponApplied(r);
      showToast({ type: "success", title: "Coupon applied!", message: `Saved ${money(r.discountAmount)}` });
    } catch (err: any) {
      setCouponError(err.message); setCouponApplied(null);
    } finally { setCouponLoading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) { navigate("/auth"); return; }
    setBusy(true); setError("");
    try {
      const orderResult = await api.createOrder({
        paymentMethod, address,
        couponCode: couponApplied ? couponCode : undefined,
        items: cart.map((item) => ({
          productId: item.product.id, variantId: item.variant?.id,
          quantity: item.quantity, customWidthMm: item.customWidthMm,
          customHeightMm: item.customHeightMm, customText: item.customText,
          customization: item.customization
        }))
      }, token);
      const paymentResult = await api.createRazorpayOrder(orderResult.order.id, token);
      await openRazorpayCheckout({
        gateway: paymentResult.gateway, user,
        onDismiss: () => setBusy(false),
        onSuccess: async (response) => {
          await api.verifyRazorpayPayment({ orderId: orderResult.order.id, ...response }, token);
          clearCart(); setSuccess(true); setBusy(false);
          showToast({ type: "success", title: "Payment successful! 🎉", message: "Your order is confirmed." });
        }
      });
    } catch (err: any) {
      setError(err.message ?? "Checkout failed"); setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-1)] mb-3">Order Confirmed! 🎉</h2>
          <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
            Your payment was successful. You'll receive a confirmation email shortly.
          </p>
          <div className="flex items-center gap-3 justify-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <Coins size={20} className="text-amber-400" />
            <p className="text-sm text-amber-400 font-medium">
              You'll earn <strong>{coinsToEarn} MudraCoins</strong> (worth {money(coinsValue)}) when your order is delivered!
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/orders")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors">
              Track My Orders
            </button>
            <button onClick={() => navigate("/")}
              className="px-6 py-3 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-1)] rounded-xl font-semibold hover:bg-[var(--surface)] transition-colors">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <ShieldCheck size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">Login Required</h2>
          <p className="text-[var(--text-muted)] mb-6">Please log in to proceed to checkout.</p>
          <Link to="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors">
            Log In / Register
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4 text-center">
        <div>
          <p className="text-xl font-bold text-[var(--text-1)] mb-3">Your cart is empty</p>
          <Link to="/" className="text-indigo-500 hover:text-indigo-400 transition-colors">Browse products →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1.5">Checkout</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)]">Complete Your Order</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ── Left: form ── */}
        <form onSubmit={submit} className="space-y-5">
          {/* Address */}
          <Section title="Delivery Details" badge="No COD">
            <div className="grid sm:grid-cols-2 gap-4">
              {ADDR_FIELDS.map(({ key, label, required, full }) => (
                <div key={key} className={full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
                  <input
                    value={address[key] ?? ""}
                    onChange={(e) => setAddress((cur) => ({ ...cur, [key]: e.target.value }))}
                    placeholder={label}
                    required={required}
                    className="w-full h-10 px-3 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-[var(--input-focus)] transition-colors"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Payment */}
          <Section title="Payment Method" badge="Prepaid only">
            <div className="grid sm:grid-cols-3 gap-3">
              {PAYMENT_OPTIONS.map(({ method, label, icon: Icon, desc }) => (
                <button key={method} type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === method
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-2)]"
                  }`}>
                  <Icon size={22} className={paymentMethod === method ? "text-indigo-400" : "text-[var(--text-muted)]"} />
                  <span className={`text-sm font-bold ${paymentMethod === method ? "text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>{label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{desc}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Coupon */}
          <Section title="Coupon Code">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(null); setCouponError(""); }}
                  placeholder="ENTER CODE"
                  disabled={!!couponApplied}
                  className="w-full h-10 pl-9 pr-3 rounded-xl text-sm font-bold tracking-widest bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] outline-none focus:border-[var(--input-focus)] transition-colors uppercase disabled:opacity-50"
                />
              </div>
              <button type="button"
                onClick={couponApplied ? () => { setCouponApplied(null); setCouponCode(""); setCouponError(""); } : applyCoupon}
                disabled={couponLoading || (!couponCode.trim() && !couponApplied)}
                className={`px-5 h-10 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                  couponApplied ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}>
                {couponApplied ? "Remove" : couponLoading ? "…" : "Apply"}
              </button>
            </div>
            {couponError && <p className="text-xs text-rose-400 mt-2">{couponError}</p>}
            {couponApplied && (
              <p className="text-xs text-emerald-400 mt-2">✅ Coupon applied! Saved {money(couponApplied.discountAmount)}.</p>
            )}
          </Section>

          {/* MudraCoins Redemption */}
          {availableCoins > 0 && (
            <Section title="MudraCoins">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-[var(--text-1)]">Your Balance: <strong className="text-amber-400">{availableCoins} coins</strong></span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">= ₹{availableCoins * 10}</span>
                </div>

                {effectiveRedeemable === 0 ? (
                  <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)]">
                      MudraCoins are redeemable on orders ≥ ₹1,000.
                      Add <strong className="text-[var(--text-1)]">{money(100_000 - subtotal)}</strong> more to unlock.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>Redeem coins (max {effectiveRedeemable} on this order)</span>
                      <span className="text-amber-400 font-bold">{coinsToRedeem} coins = {money(coinsToRedeem * 1000)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => setCoinsToRedeem(Math.max(0, coinsToRedeem - 10))}
                        disabled={coinsToRedeem === 0}
                        className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-40 transition-colors">
                        <Minus size={12} />
                      </button>
                      <div className="flex-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] relative h-8 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 bg-amber-500/20 transition-all"
                          style={{ width: `${(coinsToRedeem / effectiveRedeemable) * 100}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-400">
                          {coinsToRedeem} / {effectiveRedeemable}
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => setCoinsToRedeem(Math.min(effectiveRedeemable, coinsToRedeem + 10))}
                        disabled={coinsToRedeem >= effectiveRedeemable}
                        className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-40 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCoinsToRedeem(0)}
                        className="flex-1 h-8 rounded-lg text-xs font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
                        Use 0
                      </button>
                      <button type="button" onClick={() => setCoinsToRedeem(effectiveRedeemable)}
                        className="flex-1 h-8 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                        Use Max ({effectiveRedeemable})
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Tier: ₹1k–2k → max 50 · ₹2k–5k → max 150 · ₹5k+ → max 300 coins
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">{error}</div>
          )}

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 h-13 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
            <ShieldCheck size={18} />
            {busy ? "Opening payment gateway…" : `Pay ${money(total)} Securely`}
          </button>
        </form>


        {/* ── Right: Order summary ── */}
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* Auto discount banner */}
          {autoDiscount && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              autoDiscount.type === "gift"
                ? "bg-violet-500/10 border-violet-500/20"
                : "bg-emerald-500/10 border-emerald-500/20"
            }`}>
              {autoDiscount.type === "gift" ? <Gift size={18} className="text-violet-400 shrink-0" /> : <Percent size={18} className="text-emerald-400 shrink-0" />}
              <div>
                <p className={`text-xs font-bold ${autoDiscount.type === "gift" ? "text-violet-300" : "text-emerald-300"}`}>
                  {autoDiscount.label}
                </p>
                {autoDiscount.type === "percent" && (
                  <p className="text-xs text-emerald-400/70">−{money(autoDiscount.amount)} off your order</p>
                )}
              </div>
            </div>
          )}

          {/* Next discount milestone */}
          {!autoDiscount && subtotal > 0 && (
            <div className="p-4 bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl">
              <p className="text-xs text-[var(--text-muted)] mb-2">Unlock discounts:</p>
              <div className="space-y-2">
                {subtotal < 1_000_000 && (
                  <div className="flex items-center gap-2">
                    <Percent size={13} className="text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">
                      Add <strong>{money(1_000_000 - subtotal)}</strong> more → 5% off
                    </p>
                  </div>
                )}
                {subtotal < 5_000_000 && (
                  <div className="flex items-center gap-2">
                    <Gift size={13} className="text-violet-400 shrink-0" />
                    <p className="text-xs text-violet-400">
                      Add <strong>{money(5_000_000 - subtotal)}</strong> more → Free custom stamp gift
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-1)] mb-4">Order Summary</h3>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.product.imageUrl} alt={item.product.name}
                      className="w-11 h-11 rounded-xl object-cover bg-[var(--surface-2)] shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=88&q=70"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-1)] truncate">{item.product.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">×{item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-1)] shrink-0">
                      {money(unitPrice(item.product, item.variant, item.customWidthMm, item.customHeightMm) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-2.5">
              <div className="flex justify-between text-sm text-[var(--text-2)]">
                <span>Subtotal</span><span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text-2)]">
                <span>Shipping</span>
                <span className={shippingFee === 0 ? "text-emerald-400 font-semibold" : ""}>{shippingFee === 0 ? "FREE" : money(shippingFee)}</span>
              </div>
              {autoDiscountAmt > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span className="flex items-center gap-1"><Percent size={12} /> Auto discount</span>
                  <span>−{money(autoDiscountAmt)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span className="flex items-center gap-1"><Tag size={12} /> Coupon</span>
                  <span>−{money(couponDiscount)}</span>
                </div>
              )}
              {coinsDiscount > 0 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span className="flex items-center gap-1"><Coins size={12} /> MudraCoins ({coinsToRedeem})</span>
                  <span>−{money(coinsDiscount)}</span>
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-3 mt-3 flex justify-between items-center">
                <span className="font-bold text-[var(--text-1)]">Total</span>
                <span className="text-xl font-bold text-indigo-500">{money(total)}</span>
              </div>
            </div>

            {/* MudraCoins earn */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2.5 p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                <Coins size={16} className="text-amber-400 shrink-0 coin-pulse" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Earn {coinsToEarn} MudraCoins on delivery</p>
                  <p className="text-[10px] text-amber-400/70">Worth {money(coinsValue)} for your next order</p>
                </div>
              </div>
            </div>

            {/* Security badge */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-400">Secured by Razorpay · Payment info never stored</p>
              </div>
            </div>

            {subtotal < 99900 && subtotal > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                  <Truck size={13} className="text-indigo-400 shrink-0" />
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Add <strong className="text-[var(--text-1)]">{money(99900 - subtotal)}</strong> more for free shipping
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
