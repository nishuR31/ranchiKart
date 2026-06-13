import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Ticket } from "lucide-react";
import { useState } from "react";
import { money } from "../lib/money";
import { unitPrice } from "../lib/product";
import { useShopStore } from "../store/useShopStore";
import { api } from "../api/client";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, token, showToast } = useShopStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + unitPrice(item.product, item.variant, item.customWidthMm, item.customHeightMm) * item.quantity,
    0
  );
  const shippingFee = subtotal > 99900 ? 0 : 6900;
  const total = subtotal + shippingFee - couponDiscount;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    if (!token) {
      showToast({ type: "info", title: "Login to use coupons" });
      return;
    }
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const r = await api.applyCoupon(couponCode.trim().toUpperCase(), subtotal, token);
      setCouponDiscount(r.discountAmount);
      setCouponApplied(true);
      showToast({ type: "success", title: `Coupon applied! Saved ${money(r.discountAmount)}` });
    } catch (err: any) {
      setCouponError(err.message);
      setCouponDiscount(0);
      setCouponApplied(false);
    } finally {
      setApplyingCoupon(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={32} className="text-gray-600" />
        </div>
        <h1 className="font-display font-black text-3xl text-white mb-3">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Browse our products and add something custom.</p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all"
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Your Order</p>
        <h1 className="font-display font-black text-3xl text-white">Shopping Cart</h1>
        <p className="text-gray-500 text-sm mt-1">{cart.length} item{cart.length !== 1 ? "s" : ""} selected</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            const price = unitPrice(item.product, item.variant, item.customWidthMm, item.customHeightMm);
            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-[#16161e] border border-white/8 rounded-2xl hover:border-white/15 transition-colors"
              >
                {/* Product image */}
                <Link to={`/product/${item.product.slug}`} className="shrink-0">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-white/5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=200&q=60";
                    }}
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors line-clamp-2"
                  >
                    {item.product.name}
                  </Link>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {item.variant && (
                      <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        {item.variant.name}
                      </span>
                    )}
                    {item.customWidthMm && item.customHeightMm && (
                      <span className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {item.customWidthMm} × {item.customHeightMm} mm
                      </span>
                    )}
                  </div>
                  {item.customText && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{item.customText}"</p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, Math.min(50, item.quantity + 1))}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Price and remove */}
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white">{money(price * item.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                        className="text-gray-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-[#16161e] border border-white/8 rounded-2xl p-6 space-y-5">
            <h2 className="font-display font-bold text-lg text-white">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white font-medium">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span className={shippingFee === 0 ? "text-emerald-400 font-medium" : "text-white font-medium"}>
                  {shippingFee === 0 ? "FREE" : money(shippingFee)}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon ({couponCode})</span>
                  <span>-{money(couponDiscount)}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <p className="text-[10px] text-gray-600">
                  Add {money(99900 - subtotal)} more for free shipping
                </p>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
              <span className="text-sm text-gray-400">Total</span>
              <span className="font-display font-black text-2xl text-white">{money(total)}</span>
            </div>

            {/* Coupon */}
            <div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Ticket size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    placeholder="Coupon code"
                    disabled={couponApplied}
                    className="w-full pl-8 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50 font-mono"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || couponApplied || !couponCode}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {applyingCoupon ? "…" : couponApplied ? "✓" : "Apply"}
                </button>
              </div>
              {couponError && <p className="text-xs text-rose-400 mt-1.5">{couponError}</p>}
            </div>

            <Link
              to="/checkout"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              <ShoppingBag size={16} /> Proceed to Checkout
            </Link>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <span>🔒</span> SSL encrypted checkout via Razorpay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
