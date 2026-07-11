import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";

const TIMELINE = ["PLACED", "CONFIRMED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
const STATUS_LABEL = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    const { data } = await api.get(`/orders/${id}`);
    setOrder(data.order);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function cancelOrder() {
    try {
      await api.post(`/orders/${id}/cancel`);
      showToast("Order cancelled");
      load();
    } catch (err) {
      showToast(extractError(err, "Could not cancel order"), "error");
    }
  }

  if (loading || !order) return <div className="loading-block">Loading order…</div>;

  const stepIndex = TIMELINE.indexOf(order.status);
  const cancellable = !["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div className="order-detail-page">
      <h1>Order {order.orderNumber}</h1>
      <p className="muted">Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>

      {order.status === "CANCELLED" ? (
        <div className="status-pill status-cancelled large">Order Cancelled</div>
      ) : (
        <div className="tracking-timeline">
          {TIMELINE.map((step, i) => (
            <div key={step} className={`timeline-step ${i <= stepIndex ? "done" : ""}`}>
              <div className="dot" />
              <span>{STATUS_LABEL[step]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="order-detail-grid">
        <div className="order-items-box">
          <h3>Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="order-item-row">
              <span>{item.title} × {item.quantity}</span>
              <span>{formatINR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Payment Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="summary-row"><span>Discount</span><span>-{formatINR(order.discount)}</span></div>}
          <div className="summary-row"><span>Delivery Fee</span><span>{order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(order.total)}</span></div>
          <div className="summary-row muted"><span>Payment</span><span>{order.paymentMethod} · {order.paymentStatus}</span></div>
          <h4>Delivering to</h4>
          <p className="address-text">
            {order.addressSnapshot.fullName}, {order.addressSnapshot.line1}, {order.addressSnapshot.locality}, {order.addressSnapshot.city} - {order.addressSnapshot.pincode}
            <br />Phone: {order.addressSnapshot.phone}
          </p>
          {cancellable && (
            <button className="btn btn-outline btn-full" onClick={cancelOrder}>Cancel Order</button>
          )}
        </div>
      </div>
    </div>
  );
}
