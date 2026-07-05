import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, ChevronDown, Clock, MapPin, Package, RotateCw, ShoppingBag, X } from "lucide-react";
import { api } from "../api/client";
import { useShopStore } from "../store/useShopStore";

const STATUS_STEPS = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  PAID:            { label: "Paid", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20" },
  PROCESSING:      { label: "Processing", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  SHIPPED:         { label: "Shipped", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
  DELIVERED:       { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  CANCELLED:       { label: "Cancelled", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  REFUNDED:        { label: "Refunded", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" }
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtPrice(paisa: number) {
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { token } = useShopStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    api.getMyOrders(token)
      .then((r) => setOrders(r.orders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1.5">Account</p>
          <h1 className="text-3xl font-bold text-[var(--text-1)]">My Orders</h1>
        </div>
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-[var(--surface-2)] rounded w-32" />
                <div className="h-6 bg-[var(--surface-2)] rounded w-20" />
              </div>
              <div className="h-12 bg-[var(--surface-2)] rounded-xl mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1.5">Account</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)]">My Orders</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-1)] font-bold text-lg">No orders yet</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Looks like you haven't placed any orders yet.</p>
          <Link to="/" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expanded === order.id;
            const meta = STATUS_META[order.status] ?? { label: order.status, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/20" };
            const stepIdx = STATUS_STEPS.indexOf(order.status);

            return (
              <div key={order.id} className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl overflow-hidden">
                {/* Order header */}
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      ORDER #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {fmtDate(order.createdAt)}
                    </p>
                  </div>

                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${meta.color} ${meta.bg} ${meta.border}`}>
                    {meta.label}
                  </span>

                  <div className="text-right">
                    <p className="font-bold text-indigo-500">{fmtPrice(order.total)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                  </div>

                  <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
                    Details
                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Product thumbnails */}
                <div className="flex gap-2 px-5 pb-4 flex-wrap">
                  {order.items.map((item: any) => (
                    <img key={item.id} src={item.product.imageUrl} alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover bg-[var(--surface-2)]"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=120&q=80"; }} />
                  ))}
                </div>

                {/* Status timeline */}
                {!["CANCELLED", "REFUNDED"].includes(order.status) && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-0">
                      {STATUS_STEPS.map((step, i) => {
                        const done = i <= stepIdx;
                        const last = i === STATUS_STEPS.length - 1;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                done ? "bg-indigo-500 border-indigo-500" : "bg-[var(--surface-2)] border-[var(--border-2)]"
                              }`}>
                                {done && <CheckCircle size={12} className="text-white" />}
                              </div>
                              <span className={`text-[9px] font-medium whitespace-nowrap ${done ? "text-indigo-400" : "text-[var(--text-muted)]"}`}>
                                {step.replace("PENDING_PAYMENT", "Pending").replace("_", " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                              </span>
                            </div>
                            {!last && (
                              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${done && i < stepIdx ? "bg-indigo-500" : "bg-[var(--border-2)]"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-5 space-y-4">
                    <div className="space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img src={item.product.imageUrl} alt={item.product.name}
                            className="w-14 h-14 rounded-xl object-cover bg-[var(--surface-2)] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-1)] truncate">{item.product.name}</p>
                            {item.variant && <p className="text-xs text-[var(--text-muted)]">Variant: {item.variant.name}</p>}
                            {item.customWidthMm && <p className="text-xs text-[var(--text-muted)]">Size: {item.customWidthMm}×{item.customHeightMm}mm</p>}
                            <p className="text-xs text-[var(--text-muted)]">Qty: {item.quantity}</p>
                          </div>
                          <span className="font-bold text-indigo-500 shrink-0">{fmtPrice(item.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Price breakdown */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm text-[var(--text-2)]">
                        <span>Subtotal</span><span>{fmtPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-[var(--text-2)]">
                        <span>Shipping</span>
                        <span className={order.shippingFee === 0 ? "text-emerald-400" : ""}>{order.shippingFee === 0 ? "FREE" : fmtPrice(order.shippingFee)}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span>Discount</span><span>−{fmtPrice(order.discountAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-[var(--text-1)]">
                        <span>Total</span><span className="text-indigo-500">{fmtPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Delivery address */}
                    {order.address && (
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                        <p className="text-xs font-bold text-[var(--text-1)] flex items-center gap-2 mb-2">
                          <MapPin size={12} className="text-indigo-500" /> Shipping Address
                        </p>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                          {order.address.fullName}<br />
                          {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br />
                          {order.address.city}, {order.address.state} – {order.address.pincode}<br />
                          📞 {order.address.phone}
                        </p>
                      </div>
                    )}

                    {/* Tracking ID */}
                    {order.trackingId && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <RotateCw size={13} className="text-indigo-500" />
                        Tracking: <strong className="text-[var(--text-1)]">{order.trackingId}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
