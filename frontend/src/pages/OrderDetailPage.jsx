import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";
import useSEO from "../lib/useSEO";
import { PageLoader } from "../components/Loaders";

const TIMELINE = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
const STATUS_LABEL = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function OrderDetailPage() {
  useSEO({ title: "Order Details", noindex: true });

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    try {
      const { data } = await api.get(`/orders/${id}`);
      // data = { order: {...} } or the order directly
      setOrder(data.order ?? data);
    } catch (err) {
      console.error("Failed to load order", err);
    } finally {
      setLoading(false);
    }
  }

  // NOTE: The API does not have a /orders/:id/cancel endpoint.
  // Status is managed by admin via /admin/orders/:id/status

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !order) return <PageLoader text="Loading order…" />;

  const stepIndex = TIMELINE.indexOf(order.status);

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
              <span>{item.product?.name || "Product"} × {item.quantity}</span>
              <span>{formatINR(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Payment Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          {order.discountAmount > 0 && <div className="summary-row"><span>Discount</span><span>-{formatINR(order.discountAmount)}</span></div>}
          <div className="summary-row"><span>Delivery Fee</span><span>{order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(order.total)}</span></div>
          <div className="summary-row muted"><span>Payment</span><span>{order.paymentMethod}</span></div>
          <h4>Delivering to</h4>
          <p className="address-text">
            {order.address?.fullName}, {order.address?.line1}, {order.address?.city} - {order.address?.pincode}
            <br />Phone: {order.address?.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
